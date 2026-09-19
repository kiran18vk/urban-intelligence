"""
Unit Tests for Offline Store-and-Forward Edge Event Queue (SIH 2026 PS 26124).
"""
import os
import shutil
import tempfile
import time
import unittest

from ai.events.models import EventEvidence, GPSCoordinates, SeverityLevel, UrbanEvent
from ai.offline_queue.config import EdgeQueueConfig
from ai.offline_queue.connectivity import EdgeConnectivityManager
from ai.offline_queue.models import (
    ConnectivityState,
    QueuedEvent,
    QueueStatus,
)
from ai.offline_queue.queue_store import SQLiteQueueStore
from ai.offline_queue.sync_manager import EdgeSyncManager


class TestOfflineQueue(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_edge_queue.db")
        self.config = EdgeQueueConfig(
            db_path=self.db_path,
            max_queue_size=10,
            max_retries=3,
            event_expiration_hours=1.0,
        )
        self.store = SQLiteQueueStore(self.config)
        self.connectivity = EdgeConnectivityManager()
        self.sync_mgr = EdgeSyncManager(self.store, self.connectivity)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def _create_event(self, event_id: str, severity: str = "HIGH", event_type: str = "ROAD_POTHOLE"):
        return QueuedEvent(
            event_id=event_id,
            event_type=event_type,
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=time.time(),
            latitude=18.5204,
            longitude=73.8567,
            confidence=0.85,
            operational_confidence=0.80,
            severity=severity,
            evidence_reference="assets/events/demo_frame.jpg",
        )

    def test_01_enqueue_event(self):
        evt = self._create_event("EVT-T01", severity="HIGH")
        saved = self.store.enqueue(evt)
        self.assertEqual(saved.event_id, "EVT-T01")
        self.assertEqual(saved.status, QueueStatus.PENDING)
        self.assertEqual(self.store.count_by_status()["PENDING"], 1)

    def test_02_persistent_storage(self):
        evt = self._create_event("EVT-T02", severity="CRITICAL")
        self.store.enqueue(evt)

        # Re-initialize store from same DB file
        new_store = SQLiteQueueStore(self.config)
        fetched = new_store.get_by_event_id("EVT-T02")
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.event_id, "EVT-T02")
        self.assertEqual(fetched.severity, "CRITICAL")

    def test_03_retrieve_pending_events(self):
        self.store.enqueue(self._create_event("EVT-LOW", severity="LOW"))
        self.store.enqueue(self._create_event("EVT-CRIT", severity="CRITICAL"))
        self.store.enqueue(self._create_event("EVT-HIGH", severity="HIGH"))

        pending = self.store.get_pending()
        self.assertEqual(len(pending), 3)
        # Verify priority ordering: CRITICAL -> HIGH -> LOW
        self.assertEqual(pending[0].event_id, "EVT-CRIT")
        self.assertEqual(pending[1].event_id, "EVT-HIGH")
        self.assertEqual(pending[2].event_id, "EVT-LOW")

    def test_04_mark_syncing(self):
        evt = self.store.enqueue(self._create_event("EVT-T04"))
        self.store.mark_syncing(evt.queue_id)
        updated = self.store.get_by_queue_id(evt.queue_id)
        self.assertEqual(updated.status, QueueStatus.SYNCING)
        self.assertIsNotNone(updated.last_attempt_at)

    def test_05_mark_synced(self):
        evt = self.store.enqueue(self._create_event("EVT-T05"))
        self.store.mark_synced(evt.queue_id)
        updated = self.store.get_by_queue_id(evt.queue_id)
        self.assertEqual(updated.status, QueueStatus.SYNCED)
        self.assertIsNotNone(updated.synced_at)

    def test_06_failed_retry_and_test_07_retry_count(self):
        evt = self.store.enqueue(self._create_event("EVT-T06"))
        self.assertEqual(evt.retry_count, 0)

        # Attempt 1 failed
        self.store.mark_failed(evt.queue_id, "Network timeout 1", max_retries=3)
        e1 = self.store.get_by_queue_id(evt.queue_id)
        self.assertEqual(e1.retry_count, 1)
        self.assertEqual(e1.status, QueueStatus.PENDING)  # Still eligible for retry

        # Attempt 2 failed
        self.store.mark_failed(evt.queue_id, "Network timeout 2", max_retries=3)
        e2 = self.store.get_by_queue_id(evt.queue_id)
        self.assertEqual(e2.retry_count, 2)
        self.assertEqual(e2.status, QueueStatus.PENDING)

        # Attempt 3 failed -> reaches max_retries (3) -> becomes FAILED
        self.store.mark_failed(evt.queue_id, "Network timeout 3", max_retries=3)
        e3 = self.store.get_by_queue_id(evt.queue_id)
        self.assertEqual(e3.retry_count, 3)
        self.assertEqual(e3.status, QueueStatus.FAILED)

        # Manual retry resets to PENDING
        self.store.retry_event(evt.queue_id)
        e_retried = self.store.get_by_queue_id(evt.queue_id)
        self.assertEqual(e_retried.status, QueueStatus.PENDING)

    def test_08_event_expiration(self):
        old_evt = self._create_event("EVT-OLD")
        old_evt.created_at = time.time() - (2 * 3600)  # 2 hours old
        self.store.enqueue(old_evt)

        fresh_evt = self._create_event("EVT-FRESH")
        self.store.enqueue(fresh_evt)

        expired_count = self.store.expire_stale_events(expiration_hours=1.0)
        self.assertEqual(expired_count, 1)

        old_res = self.store.get_by_event_id("EVT-OLD")
        fresh_res = self.store.get_by_event_id("EVT-FRESH")
        self.assertEqual(old_res.status, QueueStatus.EXPIRED)
        self.assertEqual(fresh_res.status, QueueStatus.PENDING)

    def test_09_queue_capacity_and_test_10_critical_preservation(self):
        # Fill capacity (10 items) with LOW severity events
        for i in range(10):
            self.store.enqueue(self._create_event(f"EVT-LOW-{i:02d}", severity="LOW"))

        self.assertEqual(self.store.count_by_status()["PENDING"], 10)

        # Now enqueue a CRITICAL event: it must evict one LOW event to preserve CRITICAL
        crit_evt = self._create_event("EVT-CRIT-IMPORTANT", severity="CRITICAL")
        self.store.enqueue(crit_evt)

        pending = self.store.get_pending(limit=20)
        self.assertEqual(len(pending), 10)
        self.assertTrue(any(e.event_id == "EVT-CRIT-IMPORTANT" for e in pending))
        self.assertEqual(pending[0].event_id, "EVT-CRIT-IMPORTANT")

    def test_11_duplicate_event_prevention_idempotency(self):
        evt1 = self._create_event("EVT-DUP-01")
        self.store.enqueue(evt1)

        # Try enqueuing same event_id again
        evt2 = self._create_event("EVT-DUP-01")
        res = self.store.enqueue(evt2)

        self.assertEqual(res.event_id, "EVT-DUP-01")
        self.assertEqual(self.store.count_by_status()["PENDING"], 1)

    def test_12_offline_submission_and_test_13_online_submission(self):
        self.store.enqueue(self._create_event("EVT-SYNC-01"))

        # When OFFLINE: sync is aborted safely
        self.connectivity.set_simulation_state(ConnectivityState.OFFLINE)
        res_offline = self.sync_mgr.sync_pending_events()
        self.assertEqual(res_offline["status"], "OFFLINE")
        self.assertEqual(res_offline["synced_count"], 0)
        self.assertEqual(self.store.count_by_status()["PENDING"], 1)

        # When ONLINE: sync completes successfully
        self.connectivity.set_simulation_state(ConnectivityState.ONLINE)
        res_online = self.sync_mgr.sync_pending_events()
        self.assertEqual(res_online["status"], "SYNCED")
        self.assertEqual(res_online["synced_count"], 1)
        self.assertEqual(self.store.count_by_status()["PENDING"], 0)
        self.assertEqual(self.store.count_by_status()["SYNCED"], 1)

    def test_14_reconnect_and_automatic_sync(self):
        self.connectivity.set_simulation_state(ConnectivityState.OFFLINE)
        for i in range(3):
            self.store.enqueue(self._create_event(f"EVT-OFFLINE-{i}"))

        self.assertEqual(self.store.count_by_status()["PENDING"], 3)

        # Connection restored
        self.connectivity.set_simulation_state(ConnectivityState.ONLINE)
        sync_res = self.sync_mgr.sync_pending_events()
        self.assertEqual(sync_res["synced_count"], 3)
        self.assertEqual(self.store.count_by_status()["PENDING"], 0)
        self.assertEqual(self.store.count_by_status()["SYNCED"], 3)

    def test_15_connectivity_state_transitions(self):
        self.assertEqual(self.connectivity.get_connectivity(), ConnectivityState.ONLINE)
        self.connectivity.set_simulation_state(ConnectivityState.OFFLINE)
        self.assertEqual(self.connectivity.get_connectivity(), ConnectivityState.OFFLINE)
        self.assertTrue(self.connectivity.is_simulation_active())

        self.connectivity.set_simulation_state(ConnectivityState.DEGRADED)
        self.assertEqual(self.connectivity.get_connectivity(), ConnectivityState.DEGRADED)

        self.connectivity.set_simulation_state(None)
        self.assertEqual(self.connectivity.get_connectivity(), ConnectivityState.ONLINE)
        self.assertFalse(self.connectivity.is_simulation_active())

    def test_16_evidence_reference_handling(self):
        # Valid evidence
        evt_with_ev = self._create_event("EVT-EV-1")
        self.store.enqueue(evt_with_ev)
        saved1 = self.store.get_by_event_id("EVT-EV-1")
        self.assertEqual(saved1.evidence_reference, "assets/events/demo_frame.jpg")

        # Missing evidence handled gracefully
        evt_no_ev = QueuedEvent(
            event_id="EVT-EV-2",
            event_type="TRAFFIC_CONGESTION",
            bus_id="PMP-BUS-002",
            camera_id="CAM-FRONT-01",
            timestamp=time.time(),
            latitude=18.5204,
            longitude=73.8567,
            confidence=0.80,
            evidence_reference=None,
        )
        self.store.enqueue(evt_no_ev)
        saved2 = self.store.get_by_event_id("EVT-EV-2")
        self.assertEqual(saved2.evidence_reference, "EVIDENCE_REFERENCE_UNAVAILABLE")

    def test_17_priority_ordering(self):
        self.store.enqueue(self._create_event("EVT-MED", severity="MEDIUM"))
        self.store.enqueue(self._create_event("EVT-LOW", severity="LOW"))
        self.store.enqueue(self._create_event("EVT-CRIT", severity="CRITICAL"))
        self.store.enqueue(self._create_event("EVT-HIGH", severity="HIGH"))

        pending = self.store.get_pending()
        severities = [p.severity for p in pending]
        self.assertEqual(severities, ["CRITICAL", "HIGH", "MEDIUM", "LOW"])

    def test_18_existing_UrbanEvent_compatibility(self):
        urban_evt = UrbanEvent(
            event_id="EVT-URBAN-99",
            event_type="ROAD_POTHOLE",
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp="2026-09-18T00:15:30Z",
            gps=GPSCoordinates(18.5204, 73.8567),
            confidence=0.88,
            operational_confidence=0.82,
            severity=SeverityLevel.HIGH.value,
            evidence=EventEvidence(image_path="outputs/demo_pothole_01.jpg"),
        )
        # Convert UrbanEvent into QueuedEvent
        queued = QueuedEvent(
            event_id=urban_evt.event_id,
            event_type=urban_evt.event_type,
            bus_id=urban_evt.bus_id,
            camera_id=urban_evt.camera_id,
            latitude=urban_evt.gps.latitude,
            longitude=urban_evt.gps.longitude,
            confidence=urban_evt.confidence,
            operational_confidence=urban_evt.operational_confidence,
            severity=urban_evt.severity,
            evidence_reference=urban_evt.evidence.image_path if urban_evt.evidence else None,
        )
        self.store.enqueue(queued)
        retrieved = self.store.get_by_event_id("EVT-URBAN-99")
        self.assertIsNotNone(retrieved)
        self.assertEqual(retrieved.event_id, "EVT-URBAN-99")
        self.assertEqual(retrieved.confidence, 0.88)


if __name__ == "__main__":
    unittest.main()
