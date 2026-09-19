"""
Unit tests for Generic Multi-Bus Event Correlation Module.
Validates spatial clustering, temporal windows, unique bus counting,
confidence/reliability aggregation, lifecycle freshness, and explanation generation.
"""
import unittest
import time
import datetime

from ai.event_correlation.models import (
    CorrelatedEvent,
    CorrelationLevel,
    CorrelationStatus,
    CorrelationFreshness,
)
from ai.event_correlation.config import EventCorrelationConfig
from ai.event_correlation.cluster_engine import EventClusterEngine, haversine_distance
from ai.event_correlation.correlator import EventCorrelator, get_default_testbed_events
from ai.event_correlation.confidence import (
    calculate_canonical_location,
    aggregate_confidences,
    aggregate_severity,
    calculate_correlation_strength,
    determine_correlation_level,
    determine_freshness,
    determine_status,
)
from ai.event_correlation.explain import generate_correlation_explanation
from ai.events.models import UrbanEvent, GPSCoordinates, EventEvidence


class TestEventCorrelation(unittest.TestCase):
    """Test suite for event correlation engine."""

    def setUp(self):
        self.config = EventCorrelationConfig(
            spatial_radius_meters=150.0,
            single_bus_min=1,
            corroboration_min_buses=2,
            consensus_min_buses=3,
        )
        self.correlator = EventCorrelator(self.config)
        self.ref_time = 1758000000.0  # Deterministic reference timestamp

    def test_haversine_distance(self):
        # Two points ~100m apart in Pune
        d = haversine_distance(18.520430, 73.856744, 18.521300, 73.856744)
        self.assertGreater(d, 80)
        self.assertLess(d, 120)

    def test_single_bus_observation(self):
        events = [
            UrbanEvent(
                event_id="EVT-01",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
                confidence=0.85,
                operational_confidence=0.80,
                reliability={"score": 0.88},
            )
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 1)
        corr = res[0]
        self.assertEqual(corr.independent_bus_count, 1)
        self.assertEqual(corr.observation_count, 1)
        self.assertEqual(corr.correlation_level, CorrelationLevel.SINGLE_BUS_OBSERVATION)
        self.assertEqual(corr.correlation_strength, 0.33)

    def test_duplicate_observations_same_bus_not_consensus(self):
        # 5 observations from the SAME bus (BUS-001) MUST NOT become consensus
        events = [
            UrbanEvent(
                event_id=f"EVT-BUS1-{i}",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - i * 60, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430 + (i * 0.00001), 73.856744),
                confidence=0.85,
            )
            for i in range(5)
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 1)
        corr = res[0]
        self.assertEqual(corr.observation_count, 5)
        self.assertEqual(corr.independent_bus_count, 1)
        self.assertEqual(corr.correlation_level, CorrelationLevel.SINGLE_BUS_OBSERVATION)
        self.assertEqual(corr.correlation_strength, 0.33)

    def test_two_bus_corroboration(self):
        # 2 distinct buses (BUS-001, BUS-007)
        events = [
            UrbanEvent(
                event_id="EVT-01",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - 300, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
                confidence=0.82,
                operational_confidence=0.75,
                reliability={"score": 0.85},
            ),
            UrbanEvent(
                event_id="EVT-02",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-007",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - 100, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520500, 73.856800),
                confidence=0.91,
                operational_confidence=0.84,
                reliability={"score": 0.90},
            ),
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 1)
        corr = res[0]
        self.assertEqual(corr.independent_bus_count, 2)
        self.assertEqual(corr.observation_count, 2)
        self.assertEqual(corr.correlation_level, CorrelationLevel.MULTI_BUS_CORROBORATION)
        self.assertEqual(corr.correlation_strength, 0.66)
        self.assertAlmostEqual(corr.max_raw_confidence, 0.91, places=2)
        self.assertAlmostEqual(corr.max_operational_confidence, 0.84, places=2)

    def test_three_bus_consensus(self):
        # 3 distinct buses (BUS-001, BUS-004, BUS-012)
        events = [
            UrbanEvent(
                event_id="EVT-01",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - 600, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
            ),
            UrbanEvent(
                event_id="EVT-02",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-004",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - 400, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520480, 73.856790),
            ),
            UrbanEvent(
                event_id="EVT-03",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-012",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - 200, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520410, 73.856720),
            ),
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 1)
        corr = res[0]
        self.assertEqual(corr.independent_bus_count, 3)
        self.assertEqual(corr.correlation_level, CorrelationLevel.MULTI_BUS_CONSENSUS)
        self.assertEqual(corr.correlation_strength, 1.00)

    def test_spatial_threshold_separation(self):
        # Two events 500m apart (>150m threshold) must form 2 separate clusters
        events = [
            UrbanEvent(
                event_id="EVT-01",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
            ),
            UrbanEvent(
                event_id="EVT-02",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-007",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.525000, 73.856744),  # ~500m north
            ),
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0].independent_bus_count, 1)
        self.assertEqual(res[1].independent_bus_count, 1)

    def test_temporal_threshold_separation(self):
        # Two events at the same spot but separated by 200 hours (>168h window for pothole)
        events = [
            UrbanEvent(
                event_id="EVT-01",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time - (200 * 3600), datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
            ),
            UrbanEvent(
                event_id="EVT-02",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-007",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
            ),
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 2)

    def test_event_type_mismatch_separation(self):
        # ROAD_POTHOLE and TRAFFIC_CONGESTION at exact same coordinates must NOT be merged
        events = [
            UrbanEvent(
                event_id="EVT-01",
                event_type="ROAD_POTHOLE",
                bus_id="PMP-BUS-001",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
            ),
            UrbanEvent(
                event_id="EVT-02",
                event_type="TRAFFIC_CONGESTION",
                bus_id="PMP-BUS-007",
                timestamp=datetime.datetime.fromtimestamp(self.ref_time, datetime.timezone.utc).isoformat(),
                gps=GPSCoordinates(18.520430, 73.856744),
            ),
        ]
        res = self.correlator.correlate(events, reference_time=self.ref_time)
        self.assertEqual(len(res), 2)
        types = {r.event_type for r in res}
        self.assertEqual(types, {"ROAD_POTHOLE", "TRAFFIC_CONGESTION"})

    def test_severity_aggregation(self):
        # LOW + HIGH + MEDIUM -> HIGH
        events = [
            UrbanEvent(event_id="E1", event_type="ROAD_POTHOLE", severity="LOW", gps=GPSCoordinates(18.520430, 73.856744)),
            UrbanEvent(event_id="E2", event_type="ROAD_POTHOLE", severity="HIGH", gps=GPSCoordinates(18.520430, 73.856744)),
            UrbanEvent(event_id="E3", event_type="ROAD_POTHOLE", severity="MEDIUM", gps=GPSCoordinates(18.520430, 73.856744)),
        ]
        sev = aggregate_severity(events)
        self.assertEqual(sev, "HIGH")

    def test_canonical_location_reliability_weighted(self):
        # Observation 1 has reliability 0.95, Observation 2 has reliability 0.10
        # Canonical location should be much closer to Observation 1
        ev1 = UrbanEvent(
            event_id="E1",
            gps=GPSCoordinates(18.520000, 73.850000),
            reliability={"score": 0.95},
        )
        ev2 = UrbanEvent(
            event_id="E2",
            gps=GPSCoordinates(18.530000, 73.860000),
            reliability={"score": 0.10},
        )
        can_lat, can_lon, is_sim = calculate_canonical_location([ev1, ev2])
        self.assertLess(abs(can_lat - 18.520000), abs(can_lat - 18.530000))
        self.assertTrue(is_sim)

    def test_explanation_generation(self):
        expl = generate_correlation_explanation(
            event_type="ROAD_POTHOLE",
            independent_bus_count=3,
            observation_count=5,
            bus_ids=["PMP-BUS-001", "PMP-BUS-007", "PMP-BUS-012"],
            max_distance_meters=45.2,
            time_span_seconds=7200,
            correlation_level_str="MULTI_BUS_CONSENSUS",
        )
        self.assertIn("3 distinct buses", expl["statement"])
        self.assertIn("45.2 m", expl["spatial_proximity"])
        self.assertIn("2h 0m", expl["temporal_window"])
        self.assertEqual(expl["independent_bus_count"], 3)
        self.assertEqual(expl["correlation_level"], "MULTI_BUS_CONSENSUS")

    def test_testbed_events_correlation(self):
        # Run testbed seed events
        test_events = get_default_testbed_events()
        res = self.correlator.correlate(test_events)
        self.assertGreaterEqual(len(res), 4)

        # Karve Road Pothole cluster check
        pothole_clusters = [r for r in res if r.event_type == "ROAD_POTHOLE"]
        self.assertGreaterEqual(len(pothole_clusters), 1)
        self.assertEqual(pothole_clusters[0].independent_bus_count, 3)
        self.assertEqual(pothole_clusters[0].correlation_level, CorrelationLevel.MULTI_BUS_CONSENSUS)

        # Summary check
        summary = self.correlator.compute_summary(res)
        self.assertGreaterEqual(summary.total_correlated_events, 4)
        self.assertGreaterEqual(summary.multi_bus_consensus, 1)
        self.assertGreater(summary.average_independent_buses, 1.0)


if __name__ == "__main__":
    unittest.main()
