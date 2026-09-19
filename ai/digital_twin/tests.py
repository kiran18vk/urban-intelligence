"""
Unit Tests for Urban Digital Twin Layer (SIH 2026 PS 26124).
"""

import unittest
from datetime import datetime, timezone, timedelta

from ai.digital_twin.models import (
    RoadSegment,
    TrafficZone,
    UrbanAsset,
    TwinObservation,
    FreshnessState,
    ConditionState,
    CongestionLevel,
    AssetType,
    DigitalTwinSummary,
)
from ai.digital_twin.state_engine import DigitalTwinStateEngine
from ai.digital_twin.simulator import DigitalTwinSimulator
from ai.digital_twin.updater import (
    haversine_km,
    min_dist_to_segment_km,
    evaluate_freshness,
    evaluate_condition_from_defects,
)
from ai.events.models import UrbanEvent, GPSCoordinates, EventType, SeverityLevel


class TestDigitalTwinModelsAndHelpers(unittest.TestCase):
    """Tests data model initialization, serialization, and helper functions."""

    def test_haversine_distance(self):
        # Swargate to Shivajinagar ~3.8 km
        d = haversine_km(18.5018, 73.8636, 18.5312, 73.8445)
        self.assertGreater(d, 3.0)
        self.assertLess(d, 5.0)

    def test_condition_evaluation(self):
        self.assertEqual(evaluate_condition_from_defects(0), ConditionState.EXCELLENT.value)
        self.assertEqual(evaluate_condition_from_defects(1), ConditionState.GOOD.value)
        self.assertEqual(evaluate_condition_from_defects(2), ConditionState.GOOD.value)
        self.assertEqual(evaluate_condition_from_defects(3), ConditionState.DEGRADED.value)
        self.assertEqual(evaluate_condition_from_defects(6), ConditionState.CRITICAL.value)

    def test_freshness_evaluation(self):
        now = datetime.now(timezone.utc)
        recent_iso = (now - timedelta(minutes=5)).isoformat()
        aging_iso = (now - timedelta(minutes=30)).isoformat()
        stale_iso = (now - timedelta(minutes=90)).isoformat()

        self.assertEqual(evaluate_freshness(recent_iso, now), FreshnessState.FRESH.value)
        self.assertEqual(evaluate_freshness(aging_iso, now), FreshnessState.AGING.value)
        self.assertEqual(evaluate_freshness(stale_iso, now), FreshnessState.STALE.value)
        self.assertEqual(evaluate_freshness("", now), FreshnessState.STALE.value)


class TestDigitalTwinStateEngine(unittest.TestCase):
    """Tests digital twin state engine initialization, event ingestion, and entity queries."""

    def setUp(self):
        self.engine = DigitalTwinStateEngine(data_source="demo_simulation")

    def test_initial_state(self):
        self.assertGreaterEqual(len(self.engine.roads), 5)
        self.assertGreaterEqual(len(self.engine.traffic_zones), 4)
        self.assertGreaterEqual(len(self.engine.assets), 4)
        self.assertTrue(len(self.engine.timeline) >= 1)

    def test_ingest_pothole_event(self):
        # Event near FC Road (18.5284, 73.8423)
        event = {
            "event_id": "EVT-TEST-001",
            "event_type": "ROAD_POTHOLE",
            "bus_id": "PMP-BUS-002",
            "camera_id": "CAM-FRONT-01",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "gps": {"latitude": 18.5250, "longitude": 73.8450},
            "confidence": 0.88,
            "operational_confidence": 0.80,
            "severity": "HIGH",
            "reliability": {"score": 0.82},
        }
        obs = self.engine.ingest_urban_event(event)
        self.assertIsNotNone(obs)
        self.assertEqual(obs.entity_type, "road")
        self.assertEqual(obs.operational_confidence, 0.80)

        road = self.engine.roads.get(obs.entity_id)
        self.assertIsNotNone(road)
        self.assertGreaterEqual(road.defect_count, 1)
        self.assertEqual(road.latest_observation_id, "EVT-TEST-001")

    def test_operational_confidence_capped_by_raw(self):
        # Operational confidence must never exceed raw confidence
        event = {
            "event_id": "EVT-CONF-001",
            "event_type": "ROAD_POTHOLE",
            "bus_id": "PMP-BUS-003",
            "confidence": 0.75,
            "operational_confidence": 0.95,  # Exceeds raw
            "gps": {"latitude": 18.5018, "longitude": 73.8636},
        }
        obs = self.engine.ingest_urban_event(event)
        self.assertIsNotNone(obs)
        self.assertLessEqual(obs.operational_confidence, 0.75)

    def test_ingest_traffic_event(self):
        event = {
            "event_id": "EVT-TRAFFIC-001",
            "event_type": "TRAFFIC_CONGESTION",
            "bus_id": "PMP-BUS-005",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "gps": {"latitude": 18.6298, "longitude": 73.7997},  # Pimpri
            "confidence": 0.90,
            "severity": "HIGH",
        }
        obs = self.engine.ingest_urban_event(event)
        self.assertIsNotNone(obs)
        self.assertEqual(obs.entity_type, "traffic_zone")
        self.assertEqual(obs.entity_id, "ZONE-04")

    def test_get_summary_and_queries(self):
        summary = self.engine.get_summary()
        self.assertIsInstance(summary, DigitalTwinSummary)
        self.assertGreaterEqual(summary.roads_observed, 5)
        self.assertEqual(summary.data_source, "demo_simulation")
        self.assertIn("Pune Urban Mobility Testbed", summary.testbed)

        roads = self.engine.get_roads()
        self.assertIsInstance(roads, list)
        self.assertGreater(len(roads), 0)

        zones = self.engine.get_traffic_zones()
        self.assertIsInstance(zones, list)

        assets = self.engine.get_assets()
        self.assertIsInstance(assets, list)

        entity_resp = self.engine.get_entity("ROAD-01")
        self.assertIsNotNone(entity_resp)
        self.assertEqual(entity_resp["type"], "road")

        none_resp = self.engine.get_entity("NON_EXISTENT_ID")
        self.assertIsNone(none_resp)


class TestDigitalTwinSimulator(unittest.TestCase):
    """Tests What-If scenario simulations."""

    def setUp(self):
        self.engine = DigitalTwinStateEngine(data_source="demo_simulation")
        self.simulator = DigitalTwinSimulator(self.engine)

    def test_road_defect_simulation(self):
        res = self.simulator.simulate_scenario("ROAD_DEFECT", "ROAD-01", {"additional_defects": 4})
        self.assertEqual(res.scenario_type, "ROAD_DEFECT")
        self.assertEqual(res.target_id, "ROAD-01")
        self.assertIn("SIMULATION / ESTIMATE", res.disclaimer)
        self.assertIn("defect_delta", res.delta)
        self.assertEqual(res.delta["defect_delta"], 4)

    def test_congestion_surge_simulation(self):
        res = self.simulator.simulate_scenario(
            "CONGESTION_SURGE", "ZONE-02", {"target_congestion_level": "HIGH"}
        )
        self.assertEqual(res.scenario_type, "CONGESTION_SURGE")
        self.assertIn("delay_increase_min", res.delta)
        self.assertGreaterEqual(res.simulated_metrics["estimated_delay_min"], 0.0)

    def test_road_closure_simulation(self):
        res = self.simulator.simulate_scenario(
            "ROAD_CLOSURE", "ROAD-02", {"detour_multiplier": 1.6}
        )
        self.assertEqual(res.scenario_type, "ROAD_CLOSURE")
        self.assertIn("transit_time_penalty_min", res.delta)
        self.assertEqual(res.simulated_metrics["status"], "CLOSED_DETOUR_ACTIVE")

    def test_maintenance_intervention_simulation(self):
        res = self.simulator.simulate_scenario(
            "MAINTENANCE_INTERVENTION", "ROAD-02", {"defects_to_repair": 2, "unit_cost_inr": 12500}
        )
        self.assertEqual(res.scenario_type, "MAINTENANCE_INTERVENTION")
        self.assertIn("defect_reduction", res.delta)
        self.assertEqual(res.delta["defect_reduction"], 2)
        self.assertIn("projected_cost_inr", res.delta)
        self.assertEqual(res.delta["projected_cost_inr"], 25000)

    def test_defect_escalation_simulation(self):
        res = self.simulator.simulate_scenario(
            "DEFECT_ESCALATION", "ROAD-04", {"delay_days": 60}
        )
        self.assertEqual(res.scenario_type, "DEFECT_ESCALATION")
        self.assertIn("cost_escalation_pct", res.delta)
        self.assertEqual(res.delta["cost_escalation_pct"], 65.0)

    def test_invalid_scenario_type_raises(self):
        with self.assertRaises(ValueError):
            self.simulator.simulate_scenario("INVALID_TYPE", "ROAD-01")


if __name__ == "__main__":
    unittest.main()
