"""
Unit Tests for Re-Observation & Outcome Verification (Feature #8).
"""
import os
import tempfile
import time
import unittest

from ai.reobservation.models import (
    ReObservation,
    OutcomeStatus,
    VerificationStatus,
    EvidenceSufficiency,
    CorroborationLevel,
)
from ai.reobservation.comparator import ObservationComparator, haversine_distance_meters
from ai.reobservation.outcome import OutcomeEngine
from ai.reobservation.verification import VerificationEngine
from ai.reobservation.explain import OutcomeExplainer
from ai.reobservation.escalation import EscalationHandler
from ai.reobservation.store import ReObservationStore
from ai.reobservation.service import ReObservationService


class TestReObservationCore(unittest.TestCase):

    def setUp(self):
        self.temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
        self.temp_db.close()
        self.store = ReObservationStore(db_path=self.temp_db.name)
        self.service = ReObservationService(store=self.store)

    def tearDown(self):
        if os.path.exists(self.temp_db.name):
            try:
                os.remove(self.temp_db.name)
            except Exception:
                pass

    def test_haversine_distance_and_spatial_comparator(self):
        # Coordinates ~111m apart
        p1 = (18.5204, 73.8567)
        p2 = (18.5214, 73.8567)
        dist = haversine_distance_meters(p1[0], p1[1], p2[0], p2[1])
        self.assertGreater(dist, 100.0)
        self.assertLess(dist, 120.0)

        comparator = ObservationComparator(spatial_threshold_meters=150.0)
        res = comparator.compare(
            {"latitude": p1[0], "longitude": p1[1], "defect_count": 4, "severity": "HIGH", "timestamp": 1000.0},
            {"latitude": p2[0], "longitude": p2[1], "defect_count": 1, "severity": "LOW", "timestamp": 8200.0},
        )
        self.assertTrue(res["spatial_match"])
        self.assertEqual(res["defect_delta"], -3)
        self.assertLess(res["severity_delta"], 0)
        self.assertEqual(res["temporal_delta_hours"], 2.0)

    def test_outcome_improved(self):
        comparison = {
            "spatial_match": True,
            "spatial_distance_m": 25.0,
            "spatial_threshold_m": 150.0,
            "after_reliability": 0.88,
            "defect_delta": -2,
            "severity_delta": -1,
        }
        outcome = OutcomeEngine.determine_outcome(comparison, target_type="ROAD_DEFECT")
        self.assertEqual(outcome, OutcomeStatus.IMPROVED)

    def test_outcome_unchanged(self):
        comparison = {
            "spatial_match": True,
            "spatial_distance_m": 30.0,
            "spatial_threshold_m": 150.0,
            "after_reliability": 0.85,
            "defect_delta": 0,
            "severity_delta": 0,
        }
        outcome = OutcomeEngine.determine_outcome(comparison, target_type="ROAD_DEFECT")
        self.assertEqual(outcome, OutcomeStatus.UNCHANGED)

    def test_outcome_worsened(self):
        comparison = {
            "spatial_match": True,
            "spatial_distance_m": 15.0,
            "spatial_threshold_m": 150.0,
            "after_reliability": 0.90,
            "defect_delta": 3,
            "severity_delta": 1,
        }
        outcome = OutcomeEngine.determine_outcome(comparison, target_type="ROAD_DEFECT")
        self.assertEqual(outcome, OutcomeStatus.WORSENED)

    def test_outcome_insufficient_data_spatial_and_reliability(self):
        # 1. Outside spatial threshold
        comparison_out = {
            "spatial_match": False,
            "spatial_distance_m": 350.0,
            "spatial_threshold_m": 150.0,
            "after_reliability": 0.90,
            "defect_delta": -2,
        }
        outcome = OutcomeEngine.determine_outcome(comparison_out, target_type="ROAD_DEFECT")
        self.assertEqual(outcome, OutcomeStatus.INSUFFICIENT_DATA)

        # 2. Low reliability
        comparison_low_rel = {
            "spatial_match": True,
            "spatial_distance_m": 20.0,
            "spatial_threshold_m": 150.0,
            "after_reliability": 0.45,
            "defect_delta": -2,
        }
        outcome = OutcomeEngine.determine_outcome(comparison_low_rel, target_type="ROAD_DEFECT")
        self.assertEqual(outcome, OutcomeStatus.INSUFFICIENT_DATA)

    def test_verification_score_and_multi_bus_corroboration(self):
        comparison = {
            "spatial_match": True,
            "spatial_distance_m": 20.0,
            "spatial_threshold_m": 150.0,
            "temporal_delta_hours": 24.0,
        }
        score, suff, corr = VerificationEngine.calculate_score(
            comparison=comparison,
            after_reliability=0.90,
            after_operational_confidence=0.85,
            independent_bus_count=3,
            has_evidence_ref=True,
        )
        self.assertGreaterEqual(score, 75.0)
        self.assertEqual(suff, EvidenceSufficiency.GOOD)
        self.assertEqual(corr, CorroborationLevel.MULTI_BUS_CONSENSUS)

    def test_service_create_and_query(self):
        reobs = self.service.create_reobservation({
            "reobservation_id": "ROBS-TEST-001",
            "authority_action_id": "ACT-TEST-001",
            "target_id": "ROAD-SEG-99",
            "target_type": "ROAD_DEFECT",
            "source_bus_ids": ["PMP-BUS-001", "PMP-BUS-007"],
            "before_observation": {
                "target_id": "ROAD-SEG-99",
                "defect_count": 4,
                "severity": "CRITICAL",
                "latitude": 18.5204,
                "longitude": 73.8567,
                "timestamp": time.time() - 86400.0,
                "reliability": 0.85,
            },
            "after_observation": {
                "target_id": "ROAD-SEG-99",
                "defect_count": 1,
                "severity": "LOW",
                "latitude": 18.5205,
                "longitude": 73.8568,
                "timestamp": time.time(),
                "reliability": 0.90,
                "operational_confidence": 0.88,
                "observed_condition": "Asphalt patch smooth",
                "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
            },
        })
        self.assertEqual(reobs.reobservation_id, "ROBS-TEST-001")
        self.assertEqual(reobs.outcome, OutcomeStatus.IMPROVED.value)
        self.assertTrue(reobs.spatial_match)
        self.assertEqual(reobs.independent_bus_count, 2)

        # Query check
        items, total = self.service.query_reobservations(outcome="IMPROVED")
        self.assertGreaterEqual(total, 1)
        found = any(item.reobservation_id == "ROBS-TEST-001" for item in items)
        self.assertTrue(found)

    def test_verify_and_escalate_workflow(self):
        # 1. Create unchanged item
        reobs = self.service.create_reobservation({
            "reobservation_id": "ROBS-TEST-UNCHANGED",
            "authority_action_id": "ACT-TEST-002",
            "target_id": "ROAD-SEG-88",
            "target_type": "ROAD_DEFECT",
            "before_observation": {
                "defect_count": 3,
                "severity": "HIGH",
                "latitude": 18.5204,
                "longitude": 73.8567,
            },
            "after_observation": {
                "defect_count": 3,
                "severity": "HIGH",
                "latitude": 18.5204,
                "longitude": 73.8567,
                "observed_condition": "Cracks still visible",
            },
        })
        self.assertEqual(reobs.outcome, OutcomeStatus.UNCHANGED.value)

        # 2. Verify outcome
        verified = self.service.verify_outcome("ROBS-TEST-UNCHANGED", operator="operator-01", notes="Confirmed persistent crack.")
        self.assertEqual(verified.verification_status, VerificationStatus.VERIFIED.value)

        # 3. Escalate
        esc = self.service.escalate("ROBS-TEST-UNCHANGED", operator="supervisor-01", escalation_notes="Trigger secondary crew inspection.")
        self.assertEqual(esc["status"], VerificationStatus.ESCALATED.value)
        self.assertEqual(esc["recommended_priority"], "HIGH")

        # 4. Check audit history
        hist = self.service.get_history("ROBS-TEST-UNCHANGED")
        self.assertGreaterEqual(len(hist), 3)

    def test_request_another_observation(self):
        reobs = self.service.create_reobservation({
            "reobservation_id": "ROBS-TEST-INSUFF",
            "authority_action_id": "ACT-TEST-003",
            "target_id": "ROAD-SEG-77",
            "target_type": "ROAD_DEFECT",
            "before_observation": {"defect_count": 2, "latitude": 18.5204, "longitude": 73.8567},
            "after_observation": {
                "defect_count": 2,
                "latitude": 18.5204,
                "longitude": 73.8567,
                "reliability": 0.40,  # Below 0.60
                "observed_condition": "Blurry lens",
            },
        })
        self.assertEqual(reobs.outcome, OutcomeStatus.INSUFFICIENT_DATA.value)

        updated = self.service.request_another_observation(
            "ROBS-TEST-INSUFF",
            operator="operator-01",
            notes="Camera exposure too dark during dusk pass.",
        )
        self.assertEqual(updated.verification_status, VerificationStatus.PENDING_REOBSERVATION.value)

    def test_summary_metrics(self):
        summary = self.service.get_summary()
        self.assertGreater(summary.total_reobservations, 0)
        self.assertIn("Prototype closed-loop verification", summary.disclaimer)


if __name__ == "__main__":
    unittest.main()
