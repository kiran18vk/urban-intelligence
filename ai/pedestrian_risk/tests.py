"""
Unit Tests for Pedestrian Risk Intelligence & Mitigation Engine (SIH 2026 PS 26124).
"""
import unittest
import time

from ai.pedestrian_risk.models import (
    RiskLevel,
    TrendDirection,
    DataSufficiency,
    MitigationScenarioType,
    PedestrianRiskObservation,
    PedestrianRiskScore,
)
from ai.pedestrian_risk.config import PedestrianRiskConfig, PedestrianRiskWeights
from ai.pedestrian_risk.risk_scorer import PedestrianRiskScorer
from ai.pedestrian_risk.hotspot_engine import HotspotEngine
from ai.pedestrian_risk.risk_explainer import RiskExplainer
from ai.pedestrian_risk.mitigation_engine import MitigationEngine


class TestPedestrianRiskScorer(unittest.TestCase):
    def setUp(self):
        self.scorer = PedestrianRiskScorer()

    def test_config_weights_sum_to_one(self):
        weights = PedestrianRiskWeights()
        self.assertTrue(weights.validate())

    def test_empty_observations_returns_low_risk(self):
        result = self.scorer.evaluate_observations([])
        self.assertEqual(result.score, 0)
        self.assertEqual(result.risk_level, RiskLevel.LOW)
        self.assertEqual(result.data_sufficiency, DataSufficiency.INSUFFICIENT)

    def test_single_low_observation_classifies_low_risk(self):
        obs = [
            PedestrianRiskObservation(
                observation_id="OBS-01",
                bus_id="PMP-BUS-001",
                timestamp=time.time(),
                latitude=18.5204,
                longitude=73.8567,
                road_id="ROAD-01",
                road_name="FC Road",
                pedestrian_count=0,
                vehicle_count=3,
                traffic_density="LOW",
                proximity_events=0,
                operational_reliability=0.92,
                lighting_condition="DAYLIGHT",
                visibility_score=0.95,
                infrastructure_observed="Marked Crossing",
            )
        ]
        result = self.scorer.evaluate_observations(obs)
        self.assertLessEqual(result.score, 24)
        self.assertEqual(result.risk_level, RiskLevel.LOW)
        self.assertEqual(result.data_sufficiency, DataSufficiency.INSUFFICIENT)

    def test_high_crowding_and_proximity_classifies_high_or_critical(self):
        obs = [
            PedestrianRiskObservation(
                observation_id=f"OBS-{i}",
                bus_id=f"PMP-BUS-{i%3 + 1:03d}",
                timestamp=time.time() - (i * 600),
                latitude=18.5089,
                longitude=73.8340,
                road_id="ROAD-02",
                road_name="Karve Road",
                pedestrian_count=12,
                vehicle_count=28,
                traffic_density="HIGH",
                proximity_events=3,
                operational_reliability=0.88,
                lighting_condition="LOW_LIGHT",
                visibility_score=0.72,
                road_defect_present=True,
            )
            for i in range(6)
        ]
        result = self.scorer.evaluate_observations(obs)
        self.assertGreaterEqual(result.score, 75)
        self.assertEqual(result.risk_level, RiskLevel.CRITICAL)
        self.assertEqual(result.data_sufficiency, DataSufficiency.GOOD)
        self.assertTrue(any("High pedestrian activity" in exp for exp in result.explanation))

    def test_deterministic_scoring(self):
        obs = [
            PedestrianRiskObservation(
                observation_id="OBS-DET",
                bus_id="PMP-BUS-002",
                timestamp=1726700000.0,
                latitude=18.5312,
                longitude=73.8445,
                road_id="ROAD-03",
                road_name="JM Road",
                pedestrian_count=4,
                vehicle_count=15,
                traffic_density="MEDIUM",
                proximity_events=1,
                operational_reliability=0.85,
            )
        ]
        score1 = self.scorer.evaluate_observations(obs).score
        score2 = self.scorer.evaluate_observations(obs).score
        self.assertEqual(score1, score2)


class TestHotspotEngine(unittest.TestCase):
    def setUp(self):
        self.engine = HotspotEngine()

    def test_spatial_clustering_within_threshold(self):
        base_time = 1726740000.0
        # Cluster 1: Karve Road Junction (~18.5089, 73.8340)
        c1_obs = [
            PedestrianRiskObservation(
                observation_id=f"OBS-C1-{i}",
                bus_id=f"PMP-BUS-{i%4 + 1:03d}",
                timestamp=base_time + (i * 3600),
                latitude=18.5089 + (i * 0.0001),
                longitude=73.8340 + (i * 0.0001),
                road_id="ROAD-02",
                road_name="Karve Road Junction",
                pedestrian_count=8 + i,
                vehicle_count=22,
                traffic_density="HIGH",
                proximity_events=2,
                operational_reliability=0.84,
            )
            for i in range(6)
        ]

        # Cluster 2: Hinjewadi (~18.5912, 73.7389) > 10 km away
        c2_obs = [
            PedestrianRiskObservation(
                observation_id="OBS-C2-01",
                bus_id="PMP-BUS-008",
                timestamp=base_time + 1000,
                latitude=18.5912,
                longitude=73.7389,
                road_id="ROAD-05",
                road_name="Hinjewadi Tech Corridor",
                pedestrian_count=3,
                vehicle_count=10,
                traffic_density="LOW",
                proximity_events=0,
                operational_reliability=0.90,
            )
        ]

        hotspots = self.engine.cluster_observations(c1_obs + c2_obs)
        self.assertEqual(len(hotspots), 2)
        
        # Verify first hotspot is Karve Road with 6 observations and good sufficiency
        karve_hotspot = next(h for h in hotspots if "Karve" in h.name)
        self.assertEqual(karve_hotspot.observation_count, 6)
        self.assertEqual(karve_hotspot.data_sufficiency, DataSufficiency.GOOD)
        self.assertEqual(karve_hotspot.unique_bus_count, 4)

    def test_trend_calculation_increasing(self):
        base_time = 1726740000.0
        obs = [
            PedestrianRiskObservation(
                observation_id=f"OBS-T-{i}",
                bus_id=f"PMP-BUS-00{i+1}",
                timestamp=base_time + (i * 7200),
                latitude=18.5300,
                longitude=73.8500,
                road_id="ROAD-04",
                road_name="Shivajinagar Terminus",
                pedestrian_count=2 + (i * 3), # Escalating crowding
                vehicle_count=10 + (i * 4),
                traffic_density="HIGH" if i >= 2 else "MEDIUM",
                proximity_events=i, # Increasing proximity conflicts
                operational_reliability=0.86,
            )
            for i in range(5)
        ]
        hotspots = self.engine.cluster_observations(obs)
        self.assertEqual(len(hotspots), 1)
        self.assertEqual(hotspots[0].trend, TrendDirection.INCREASING)
        self.assertGreater(len(hotspots[0].trend_history), 2)

    def test_insufficient_data_for_trend_on_single_obs(self):
        obs = [
            PedestrianRiskObservation(
                observation_id="OBS-SOLO",
                bus_id="PMP-BUS-001",
                timestamp=time.time(),
                latitude=18.5204,
                longitude=73.8567,
                road_id="ROAD-01",
                road_name="FC Road",
                pedestrian_count=2,
                vehicle_count=5,
                traffic_density="LOW",
                proximity_events=0,
                operational_reliability=0.91,
            )
        ]
        hotspots = self.engine.cluster_observations(obs)
        self.assertEqual(hotspots[0].trend, TrendDirection.INSUFFICIENT_DATA)
        self.assertEqual(hotspots[0].peak_period, "Insufficient observations for peak-period analysis.")


class TestMitigationEngine(unittest.TestCase):
    def setUp(self):
        self.engine = MitigationEngine()

    def test_recommendation_contains_action_eval_phrasing(self):
        scorer = PedestrianRiskScorer()
        obs = [
            PedestrianRiskObservation(
                observation_id="OBS-M1",
                bus_id="PMP-BUS-001",
                timestamp=time.time(),
                latitude=18.5089,
                longitude=73.8340,
                road_id="ROAD-02",
                road_name="Karve Road",
                pedestrian_count=8,
                vehicle_count=25,
                traffic_density="HIGH",
                proximity_events=3,
                operational_reliability=0.85,
                lighting_condition="LOW_LIGHT",
                visibility_score=0.65,
            )
        ]
        score_obj = scorer.evaluate_observations(obs)
        recs = self.engine.generate_recommendations(
            score_obj.factor_scores, peak_period="16:00–19:00", has_road_defect=True
        )
        self.assertTrue(len(recs) >= 3)
        for r in recs:
            self.assertTrue(r.requires_authority_review)
            self.assertTrue(
                "Evaluate" in r.description or "Consider" in r.description,
                f"Recommendation must be phrased for evaluation: {r.description}"
            )

    def test_whatif_scenario_simulation(self):
        baseline = 82
        result = self.engine.simulate_scenario(
            hotspot_id="PEDESTRIAN-HOTSPOT-001",
            baseline_score=baseline,
            scenario_type="CROSSING_IMPROVEMENT",
        )
        self.assertEqual(result.baseline_score, 82)
        self.assertEqual(result.baseline_level, RiskLevel.CRITICAL)
        self.assertEqual(result.simulated_score, 64)
        self.assertEqual(result.simulated_level, RiskLevel.HIGH)
        self.assertEqual(result.score_delta, -18)
        self.assertEqual(result.disclaimer, "Scenario estimate — decision support only")


class TestConsensusEngine(unittest.TestCase):
    def setUp(self):
        from ai.pedestrian_risk.consensus import ConsensusEngine
        from ai.pedestrian_risk.models import ConsensusStatus
        self.consensus_engine = ConsensusEngine()
        self.ConsensusStatus = ConsensusStatus
        self.base_time = 1726740000.0

    def _make_obs(self, obs_id, bus_id, t_offset=0, lat=18.5089, lon=73.8340, road_id="ROAD-02", road_name="Karve Road"):
        return PedestrianRiskObservation(
            observation_id=obs_id,
            bus_id=bus_id,
            timestamp=self.base_time + t_offset,
            latitude=lat,
            longitude=lon,
            road_id=road_id,
            road_name=road_name,
            pedestrian_count=6,
            vehicle_count=20,
            traffic_density="HIGH",
            proximity_events=2,
            operational_reliability=0.88,
        )

    def test_01_one_bus_one_observation(self):
        obs = [self._make_obs("O1", "BUS-001")]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time)
        self.assertEqual(res.status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)
        self.assertEqual(res.unique_bus_count, 1)
        self.assertEqual(res.total_observations, 1)
        self.assertEqual(res.confirming_bus_ids, ["BUS-001"])

    def test_02_one_bus_ten_observations_does_not_inflate_consensus(self):
        obs = [self._make_obs(f"O{i}", "BUS-001", t_offset=i * 60) for i in range(10)]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time + 600)
        self.assertEqual(res.status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)
        self.assertEqual(res.unique_bus_count, 1)
        self.assertEqual(res.total_observations, 10)
        self.assertEqual(res.confirming_bus_ids, ["BUS-001"])
        self.assertEqual(res.consensus_strength, 0.33)

    def test_03_two_independent_buses_corroboration(self):
        obs = [
            self._make_obs("O1", "BUS-001"),
            self._make_obs("O2", "BUS-007", t_offset=120),
        ]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time + 120)
        self.assertEqual(res.status, self.ConsensusStatus.MULTI_BUS_CORROBORATION)
        self.assertEqual(res.unique_bus_count, 2)
        self.assertEqual(res.total_observations, 2)
        self.assertEqual(set(res.confirming_bus_ids), {"BUS-001", "BUS-007"})
        self.assertEqual(res.consensus_strength, 0.66)

    def test_04_three_independent_buses_consensus(self):
        obs = [
            self._make_obs("O1", "BUS-001"),
            self._make_obs("O2", "BUS-007", t_offset=120),
            self._make_obs("O3", "BUS-012", t_offset=240),
        ]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time + 240)
        self.assertEqual(res.status, self.ConsensusStatus.MULTI_BUS_CONSENSUS)
        self.assertEqual(res.unique_bus_count, 3)
        self.assertEqual(res.total_observations, 3)
        self.assertEqual(set(res.confirming_bus_ids), {"BUS-001", "BUS-007", "BUS-012"})
        self.assertEqual(res.consensus_strength, 1.0)

    def test_05_five_obs_bus1_plus_one_obs_bus7(self):
        obs = [self._make_obs(f"O1_{i}", "BUS-001", t_offset=i * 60) for i in range(5)]
        obs.append(self._make_obs("O7_1", "BUS-007", t_offset=400))
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time + 500)
        self.assertEqual(res.total_observations, 6)
        self.assertEqual(res.unique_bus_count, 2)
        self.assertEqual(res.status, self.ConsensusStatus.MULTI_BUS_CORROBORATION)

    def test_06_repeated_same_bus_many_times(self):
        # 18 observations from BUS-001 only
        obs = [self._make_obs(f"OB{i}", "BUS-001", t_offset=i * 30) for i in range(18)]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time + 1000)
        self.assertEqual(res.total_observations, 18)
        self.assertEqual(res.unique_bus_count, 1)
        self.assertEqual(res.status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)
        self.assertEqual(res.consensus_strength, 0.33)

    def test_07_different_buses_same_location_spatial_clustering(self):
        # BUS-001, BUS-007, BUS-012 close together (~within 150m)
        obs = [
            self._make_obs("O1", "BUS-001", lat=18.5204, lon=73.8567),
            self._make_obs("O2", "BUS-007", lat=18.5208, lon=73.8571),
            self._make_obs("O3", "BUS-012", lat=18.5210, lon=73.8564),
        ]
        hotspot_engine = HotspotEngine()
        hotspots = hotspot_engine.cluster_observations(obs)
        self.assertEqual(len(hotspots), 1)
        h = hotspots[0]
        self.assertEqual(h.unique_bus_count, 3)
        self.assertEqual(h.consensus_status, self.ConsensusStatus.MULTI_BUS_CONSENSUS)
        self.assertEqual(h.consensus_strength, 1.0)

    def test_08_different_buses_different_locations_must_not_merge(self):
        obs = [
            self._make_obs("O1", "BUS-001", lat=18.5089, lon=73.8340),  # Karve Road
            self._make_obs("O2", "BUS-007", lat=18.5912, lon=73.7389),  # Hinjewadi > 10km
        ]
        hotspot_engine = HotspotEngine()
        hotspots = hotspot_engine.cluster_observations(obs)
        self.assertEqual(len(hotspots), 2)
        for h in hotspots:
            self.assertEqual(h.unique_bus_count, 1)
            self.assertEqual(h.consensus_status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)

    def test_09_old_observations_outside_window_do_not_contribute(self):
        # Window is 168 hours (7 days = 604800s)
        old_time = self.base_time - (200 * 3600)  # 200 hours ago
        recent_time = self.base_time
        obs = [
            PedestrianRiskObservation(
                observation_id="OBS-OLD-1",
                bus_id="BUS-OLD-1",
                timestamp=old_time,
                latitude=18.5089,
                longitude=73.8340,
                road_id="ROAD-02",
                road_name="Karve Road",
                pedestrian_count=5,
                vehicle_count=15,
                traffic_density="HIGH",
                proximity_events=1,
                operational_reliability=0.85,
            ),
            PedestrianRiskObservation(
                observation_id="OBS-OLD-2",
                bus_id="BUS-OLD-2",
                timestamp=old_time + 100,
                latitude=18.5089,
                longitude=73.8340,
                road_id="ROAD-02",
                road_name="Karve Road",
                pedestrian_count=5,
                vehicle_count=15,
                traffic_density="HIGH",
                proximity_events=1,
                operational_reliability=0.85,
            ),
            PedestrianRiskObservation(
                observation_id="OBS-NEW-1",
                bus_id="BUS-NEW-1",
                timestamp=recent_time,
                latitude=18.5089,
                longitude=73.8340,
                road_id="ROAD-02",
                road_name="Karve Road",
                pedestrian_count=5,
                vehicle_count=15,
                traffic_density="HIGH",
                proximity_events=1,
                operational_reliability=0.85,
            ),
        ]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=recent_time)
        # Only BUS-NEW-1 is within 168h window
        self.assertEqual(res.unique_bus_count, 1)
        self.assertEqual(res.confirming_bus_ids, ["BUS-NEW-1"])
        self.assertEqual(res.status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)

    def test_10_fresh_observations_from_independent_buses_contribute(self):
        t1 = self.base_time - (24 * 3600)  # 1 day ago
        t2 = self.base_time - (12 * 3600)  # 12 hours ago
        t3 = self.base_time                 # now
        obs = [
            self._make_obs("O1", "BUS-001", t_offset=-(24 * 3600)),
            self._make_obs("O2", "BUS-007", t_offset=-(12 * 3600)),
            self._make_obs("O3", "BUS-012", t_offset=0),
        ]
        res = self.consensus_engine.evaluate_observations(obs, ref_time=self.base_time)
        self.assertEqual(res.unique_bus_count, 3)
        self.assertEqual(res.status, self.ConsensusStatus.MULTI_BUS_CONSENSUS)
        self.assertEqual(res.consensus_freshness, "FRESH")

    def test_11_consensus_strength_normalization(self):
        # 1 bus -> 0.33
        s1 = self.consensus_engine.calculate_consensus_strength(1)
        self.assertEqual(s1, 0.33)
        # 2 buses -> 0.66
        s2 = self.consensus_engine.calculate_consensus_strength(2)
        self.assertEqual(s2, 0.66)
        # 3 buses -> 1.0
        s3 = self.consensus_engine.calculate_consensus_strength(3)
        self.assertEqual(s3, 1.0)
        # 5 buses -> 1.0
        s5 = self.consensus_engine.calculate_consensus_strength(5)
        self.assertEqual(s5, 1.0)

    def test_12_data_sufficiency_remains_independent_from_consensus(self):
        scorer = PedestrianRiskScorer()
        # Case A: 1 bus, 1 observation -> INSUFFICIENT data sufficiency + SINGLE_BUS_OBSERVATION
        obs_a = [self._make_obs("OA1", "BUS-001")]
        res_a = scorer.evaluate_observations(obs_a)
        con_a = self.consensus_engine.evaluate_observations(obs_a, ref_time=self.base_time)
        self.assertEqual(res_a.data_sufficiency, DataSufficiency.INSUFFICIENT)
        self.assertEqual(con_a.status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)

        # Case B: 1 bus, 10 observations -> LIMITED data sufficiency (needs >=2 unique buses for GOOD) + SINGLE_BUS_OBSERVATION
        obs_b = [self._make_obs(f"OB{i}", "BUS-001", t_offset=i * 60) for i in range(10)]
        res_b = scorer.evaluate_observations(obs_b)
        con_b = self.consensus_engine.evaluate_observations(obs_b, ref_time=self.base_time + 600)
        self.assertEqual(res_b.data_sufficiency, DataSufficiency.LIMITED)
        self.assertEqual(con_b.status, self.ConsensusStatus.SINGLE_BUS_OBSERVATION)

        # Case C: 3 buses, 1 obs each (total 3) -> LIMITED data sufficiency (needs >=5 obs for GOOD) + MULTI_BUS_CONSENSUS
        obs_c = [
            self._make_obs("OC1", "BUS-001"),
            self._make_obs("OC2", "BUS-007", t_offset=60),
            self._make_obs("OC3", "BUS-012", t_offset=120),
        ]
        res_c = scorer.evaluate_observations(obs_c)
        con_c = self.consensus_engine.evaluate_observations(obs_c, ref_time=self.base_time + 120)
        self.assertEqual(res_c.data_sufficiency, DataSufficiency.LIMITED)
        self.assertEqual(con_c.status, self.ConsensusStatus.MULTI_BUS_CONSENSUS)

        # Case D: 3 buses, 6 observations -> GOOD data sufficiency + MULTI_BUS_CONSENSUS
        obs_d = [
            self._make_obs("OD1", "BUS-001", t_offset=0),
            self._make_obs("OD2", "BUS-001", t_offset=60),
            self._make_obs("OD3", "BUS-007", t_offset=120),
            self._make_obs("OD4", "BUS-007", t_offset=180),
            self._make_obs("OD5", "BUS-012", t_offset=240),
            self._make_obs("OD6", "BUS-012", t_offset=300),
        ]
        res_d = scorer.evaluate_observations(obs_d)
        con_d = self.consensus_engine.evaluate_observations(obs_d, ref_time=self.base_time + 300)
        self.assertEqual(res_d.data_sufficiency, DataSufficiency.GOOD)
        self.assertEqual(con_d.status, self.ConsensusStatus.MULTI_BUS_CONSENSUS)

    def test_13_risk_score_remains_unchanged_when_only_bus_ids_change(self):
        scorer = PedestrianRiskScorer()
        # Group 1: 3 identical observations all from BUS-001
        obs_same_bus = [
            self._make_obs("O1", "BUS-001", t_offset=0),
            self._make_obs("O2", "BUS-001", t_offset=60),
            self._make_obs("O3", "BUS-001", t_offset=120),
        ]
        # Group 2: 3 identical observations from 3 different buses
        obs_diff_bus = [
            self._make_obs("O1", "BUS-001", t_offset=0),
            self._make_obs("O2", "BUS-007", t_offset=60),
            self._make_obs("O3", "BUS-012", t_offset=120),
        ]
        score1 = scorer.evaluate_observations(obs_same_bus).score
        score2 = scorer.evaluate_observations(obs_diff_bus).score
        # Risk score must remain identical
        self.assertEqual(score1, score2)

    def test_14_operational_confidence_bounds(self):
        obs = [
            PedestrianRiskObservation(
                observation_id="OBS-REL-1",
                bus_id="BUS-001",
                timestamp=self.base_time,
                latitude=18.5089,
                longitude=73.8340,
                road_id="ROAD-02",
                road_name="Karve Road",
                pedestrian_count=5,
                vehicle_count=15,
                traffic_density="HIGH",
                proximity_events=1,
                operational_reliability=0.95,
                visibility_score=0.90,
            )
        ]
        scorer = PedestrianRiskScorer()
        res = scorer.evaluate_observations(obs)
        self.assertLessEqual(res.operational_reliability, 100)
        self.assertLessEqual(res.operational_reliability, 95)  # never exceeds raw reliability or 100


if __name__ == "__main__":
    unittest.main()

