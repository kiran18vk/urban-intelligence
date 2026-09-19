"""
Unit tests for Predictive Urban Intelligence & Risk Forecasting (Feature #9).
"""
import os
import shutil
import tempfile
import time
import unittest

from ai.predictive_intelligence.models import (
    ForecastTarget,
    TrendDirection,
    RiskLevel,
    WarningLevel,
    EvidenceSufficiency,
    PredictiveForecast,
    ForecastHistoryEntry,
)
from ai.predictive_intelligence.feature_builder import ObservationFeatureBuilder
from ai.predictive_intelligence.trend_engine import TrendEngine
from ai.predictive_intelligence.risk_engine import RiskEngine
from ai.predictive_intelligence.early_warning import EarlyWarningEngine
from ai.predictive_intelligence.forecast_engine import ForecastEngine
from ai.predictive_intelligence.explain import ForecastExplainer
from ai.predictive_intelligence.store import PredictiveIntelligenceStore
from ai.predictive_intelligence.service import PredictiveIntelligenceService


class TestPredictiveIntelligence(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_predictive.db")
        self.store = PredictiveIntelligenceStore(self.db_path)
        self.service = PredictiveIntelligenceService(self.store)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_feature_builder(self):
        now = time.time()
        obs = [
            {"timestamp": now - 300, "value": 4.0, "bus_id": "PMP-BUS-001", "reliability": 0.85},
            {"timestamp": now - 200, "value": 5.0, "bus_id": "PMP-BUS-002", "reliability": 0.90},
            {"timestamp": now - 100, "value": 6.0, "bus_id": "PMP-BUS-001", "reliability": 0.88},
        ]
        feats = ObservationFeatureBuilder.build_features(obs, "ROAD-01", "ROAD_DETERIORATION")
        self.assertEqual(feats["count"], 3)
        self.assertEqual(feats["independent_buses"], 2)
        self.assertTrue(feats["is_sufficient"])
        self.assertEqual(feats["current_value"], 6.0)

    def test_trend_engine_deteriorating(self):
        feats = {
            "count": 5,
            "avg_reliability": 0.88,
            "baseline_value": 4.0,
            "current_value": 6.5,
            "variance": 0.1,
            "rate_of_change": 0.5,
        }
        res = TrendEngine.evaluate_trend(feats, higher_is_worse=True)
        self.assertEqual(res["trend_direction"], TrendDirection.DETERIORATING.value)
        self.assertGreater(res["trend_strength"], 0.5)

    def test_trend_engine_insufficient_data(self):
        feats = {
            "count": 1,
            "avg_reliability": 0.40,
            "baseline_value": 4.0,
            "current_value": 6.5,
            "variance": 0.0,
            "rate_of_change": 0.0,
        }
        res = TrendEngine.evaluate_trend(feats, higher_is_worse=True)
        self.assertEqual(res["trend_direction"], TrendDirection.INSUFFICIENT_DATA.value)
        self.assertEqual(res["trend_strength"], 0.0)

    def test_risk_engine_confidence_and_tiers(self):
        feats = {
            "count": 7,
            "independent_buses": 4,
            "avg_reliability": 0.87,
            "time_span_days": 5.8,
        }
        trend = {"trend_direction": "DETERIORATING"}
        res = RiskEngine.evaluate_confidence_and_risk(feats, trend, forecast_value=6.6, target_type="ROAD_DETERIORATION")
        self.assertEqual(res["evidence_sufficiency"], EvidenceSufficiency.GOOD.value)
        self.assertGreaterEqual(res["confidence"], 70.0)
        self.assertIn(res["risk_level"], [RiskLevel.HIGH.value, RiskLevel.CRITICAL.value])

    def test_early_warning_engine_rules(self):
        w_level, w_msg, action, action_details = EarlyWarningEngine.evaluate_warning(
            target_type="ROAD_DETERIORATION",
            trend_direction="DETERIORATING",
            risk_level="HIGH",
            current_value=5.8,
            forecast_value=6.6,
            independent_bus_count=4,
            observation_count=7,
        )
        self.assertEqual(w_level, WarningLevel.WARNING.value)
        self.assertEqual(action, "INSPECT")
        self.assertIn("Deteriorating road condition", w_msg)

    def test_forecast_engine_road_projection(self):
        now = time.time()
        day = 86400.0
        obs = [
            {"timestamp": now - 3 * day, "value": 4.0, "bus_id": "PMP-BUS-001", "reliability": 0.85},
            {"timestamp": now - 2 * day, "value": 5.0, "bus_id": "PMP-BUS-002", "reliability": 0.88},
            {"timestamp": now - 1 * day, "value": 6.0, "bus_id": "PMP-BUS-003", "reliability": 0.90},
        ]
        res = ForecastEngine.generate_forecast(
            target_id="ROAD-01",
            target_type="ROAD_DETERIORATION",
            location_name="FC Road",
            latitude=18.52,
            longitude=73.85,
            observations=obs,
        )
        self.assertEqual(res["trend_direction"], TrendDirection.DETERIORATING.value)
        self.assertGreater(res["forecast_value"], res["current_value"])
        self.assertIn(res["early_warning"], ["WARNING", "CRITICAL"])

    def test_forecast_explainer(self):
        fcst_data = {
            "target_type": "ROAD_DETERIORATION",
            "historical_observation_count": 7,
            "independent_bus_count": 4,
            "trend_direction": "DETERIORATING",
            "current_value": 5.8,
            "baseline_value": 4.2,
            "reliability": 0.86,
            "observation_window_days": 5.8,
            "evidence_sufficiency": "GOOD",
        }
        exp = ForecastExplainer.generate_explanation(fcst_data)
        self.assertIn("trending upward across 7 observations", exp)
        self.assertIn("4 independent buses", exp)

    def test_store_crud_and_summary(self):
        summary = self.store.get_summary()
        self.assertGreaterEqual(summary.active_forecasts, 6)
        self.assertGreaterEqual(summary.warnings, 1)

        fcst = self.store.get_forecast("FCST-ROAD-001")
        self.assertIsNotNone(fcst)
        self.assertEqual(fcst.target_id, "ROAD-01")

        filtered, total = self.store.list_forecasts(target_type="ROAD_DETERIORATION")
        self.assertGreaterEqual(total, 1)

    def test_service_recompute_and_authority_action_hook(self):
        recomp = self.service.recompute_forecasts()
        self.assertEqual(recomp["status"], "SUCCESS")
        self.assertGreaterEqual(recomp["recomputed_count"], 6)

        act_res = self.service.create_authority_action_from_forecast("FCST-ROAD-001", operator="Inspector Test")
        self.assertEqual(act_res["status"], "SUCCESS")
        self.assertIn("ACT-", act_res["authority_action_id"])

        hist = self.service.get_history("FCST-ROAD-001")
        self.assertGreaterEqual(len(hist), 2)


if __name__ == "__main__":
    unittest.main()
