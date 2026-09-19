"""
Forecast Engine for Predictive Urban Intelligence (Feature #9).
Computes deterministic projections for roads, traffic, pedestrian safety, hotspots, and maintenance.
"""
from typing import Dict, List, Any, Optional
import numpy as np
from ai.predictive_intelligence.feature_builder import ObservationFeatureBuilder
from ai.predictive_intelligence.trend_engine import TrendEngine
from ai.predictive_intelligence.risk_engine import RiskEngine
from ai.predictive_intelligence.early_warning import EarlyWarningEngine
from ai.predictive_intelligence.config import (
    HORIZON_ROAD_DAYS,
    HORIZON_TRAFFIC,
    HORIZON_PEDESTRIAN,
    HORIZON_HOTSPOT,
    HORIZON_MAINTENANCE,
)


class ForecastEngine:
    """
    Coordinates target-specific forecast models and builds unified PredictiveForecast records.
    """

    @staticmethod
    def generate_forecast(
        target_id: str,
        target_type: str,
        location_name: str,
        latitude: float,
        longitude: float,
        observations: List[Dict[str, Any]],
        unit: Optional[str] = None,
        custom_horizon: Optional[str] = None,
        reobservation_outcome: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates deterministic forecast metrics, trend calculations, and risk outlook.
        """
        features = ObservationFeatureBuilder.build_features(
            observations=observations,
            target_id=target_id,
            target_type=target_type,
        )

        trend = TrendEngine.evaluate_trend(features=features, higher_is_worse=True)
        count = features["count"]
        trend_dir = trend["trend_direction"]
        baseline = features["baseline_value"]
        current = features["current_value"]
        rate = features["rate_of_change"]
        independent_buses = features["independent_buses"]
        avg_rel = features["avg_reliability"]

        # 1. Target-Specific Forecast Value and Labels
        if target_type == "ROAD_DETERIORATION":
            unit_str = unit or "Deterioration Index (0-10)"
            horizon_str = custom_horizon or HORIZON_ROAD_DAYS
            
            # Forecast projection based on rate of change and re-observation
            if trend_dir == "DETERIORATING":
                multiplier = 1.15 if reobservation_outcome == "WORSENED" else 1.10
                forecast_val = min(10.0, current + max(0.4, abs(rate) * 7.0 * 0.5) * multiplier)
            elif trend_dir == "IMPROVING":
                forecast_val = max(0.5, current - max(0.3, abs(rate) * 7.0 * 0.5))
            elif trend_dir == "INSUFFICIENT_DATA":
                forecast_val = current
            else:
                forecast_val = current

            current_lbl = f"{current:.1f} / 10"
            forecast_lbl = f"{forecast_val:.1f} / 10"

        elif target_type == "TRAFFIC_CONGESTION":
            unit_str = unit or "Congestion Delay Factor"
            horizon_str = custom_horizon or HORIZON_TRAFFIC
            
            if trend_dir == "DETERIORATING":
                forecast_val = min(100.0, current + 15.0)
                current_lbl = "MEDIUM" if current < 60 else "HIGH"
                forecast_lbl = "HIGH" if forecast_val >= 60 else "MEDIUM"
            elif trend_dir == "IMPROVING":
                forecast_val = max(10.0, current - 15.0)
                current_lbl = "HIGH" if current >= 60 else "MEDIUM"
                forecast_lbl = "MEDIUM" if forecast_val < 60 else "HIGH"
            else:
                forecast_val = current
                current_lbl = "MEDIUM" if current < 60 else "HIGH"
                forecast_lbl = current_lbl

        elif target_type == "PEDESTRIAN_RISK":
            unit_str = unit or "Risk Score (0-100)"
            horizon_str = custom_horizon or HORIZON_PEDESTRIAN
            
            if trend_dir == "DETERIORATING":
                forecast_val = min(100.0, current + 12.0)
            elif trend_dir == "IMPROVING":
                forecast_val = max(5.0, current - 12.0)
            else:
                forecast_val = current

            current_lbl = f"{int(current)} / 100"
            forecast_lbl = f"{int(forecast_val)} / 100"

        elif target_type == "MAINTENANCE_PRIORITY":
            unit_str = unit or "Priority Level"
            horizon_str = custom_horizon or HORIZON_MAINTENANCE
            
            # 1: LOW, 2: MEDIUM, 3: HIGH, 4: CRITICAL
            priority_map = {1: "LOW", 2: "MEDIUM", 3: "HIGH", 4: "CRITICAL"}
            curr_rank = int(round(current))
            curr_rank = max(1, min(4, curr_rank))

            if trend_dir == "DETERIORATING" and curr_rank < 4:
                fcst_rank = curr_rank + 1
            elif trend_dir == "IMPROVING" and curr_rank > 1:
                fcst_rank = curr_rank - 1
            else:
                fcst_rank = curr_rank

            forecast_val = float(fcst_rank)
            current_lbl = priority_map.get(curr_rank, "MEDIUM")
            forecast_lbl = priority_map.get(fcst_rank, "HIGH")

        else:  # PERSISTENT_HOTSPOT
            unit_str = unit or "Recurrence Activity"
            horizon_str = custom_horizon or HORIZON_HOTSPOT
            forecast_val = current + (1.0 if trend_dir == "DETERIORATING" else 0.0)
            current_lbl = "PERSISTENT" if count >= 4 else "EMERGING"
            forecast_lbl = "ESCALATING" if trend_dir == "DETERIORATING" else current_lbl

        forecast_val = round(forecast_val, 2)

        # 2. Risk & Confidence
        risk_res = RiskEngine.evaluate_confidence_and_risk(
            features=features,
            trend=trend,
            forecast_value=forecast_val,
            target_type=target_type,
        )

        # 3. Early Warning & Actions
        warning_level, warning_msg, action, action_details = EarlyWarningEngine.evaluate_warning(
            target_type=target_type,
            trend_direction=trend_dir,
            risk_level=risk_res["risk_level"],
            current_value=current,
            forecast_value=forecast_val,
            independent_bus_count=independent_buses,
            observation_count=count,
        )

        # 4. Timeseries points for visual charts
        timeseries_points = []
        for i, val in enumerate(features.get("values", [])):
            timeseries_points.append({
                "label": f"Obs {i + 1}",
                "observed": round(val, 2),
                "baseline": baseline,
                "forecast": None,
                "timestamp": features["timestamps"][i] if i < len(features["timestamps"]) else 0,
            })
        
        # Add future horizon point
        timeseries_points.append({
            "label": f"Outlook ({horizon_str})",
            "observed": None,
            "baseline": baseline,
            "forecast": forecast_val,
            "timestamp": (features["timestamps"][-1] + 604800) if features.get("timestamps") else 0,
        })

        return {
            "target_id": target_id,
            "target_type": target_type,
            "location_name": location_name,
            "latitude": latitude,
            "longitude": longitude,
            "simulated_gps": True,
            "observation_window_days": features["time_span_days"],
            "historical_observation_count": count,
            "independent_bus_count": independent_buses,
            "source_bus_ids": features["source_bus_ids"],
            "source_event_ids": features["source_event_ids"],
            "trend_direction": trend_dir,
            "trend_strength": trend["trend_strength"],
            "current_value": current,
            "baseline_value": baseline,
            "forecast_value": forecast_val,
            "unit": unit_str,
            "current_display_label": current_lbl,
            "forecast_display_label": forecast_lbl,
            "forecast_horizon": horizon_str,
            "risk_level": risk_res["risk_level"],
            "confidence": risk_res["confidence"],
            "reliability": avg_rel,
            "evidence_sufficiency": risk_res["evidence_sufficiency"],
            "early_warning": warning_level,
            "warning_message": warning_msg,
            "recommended_action": action,
            "recommended_action_details": action_details,
            "timeseries_points": timeseries_points,
        }
