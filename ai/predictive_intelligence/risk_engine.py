"""
Risk & Evidence Sufficiency Engine for Predictive Urban Intelligence (Feature #9).
Computes transparent forecast confidence and risk levels.
"""
from typing import Dict, Any
from ai.predictive_intelligence.models import RiskLevel, EvidenceSufficiency


class RiskEngine:
    """
    Evaluates evidence sufficiency, forecast confidence (not probability), and risk tiers.
    """

    @staticmethod
    def evaluate_confidence_and_risk(
        features: Dict[str, Any],
        trend: Dict[str, Any],
        forecast_value: float,
        target_type: str,
    ) -> Dict[str, Any]:
        """
        Computes forecast confidence (evidence quality metric) and risk level.
        """
        count = features.get("count", 0)
        independent_buses = features.get("independent_buses", 0)
        avg_rel = features.get("avg_reliability", 0.0)
        time_span = features.get("time_span_days", 0.0)
        trend_dir = trend.get("trend_direction", "INSUFFICIENT_DATA")

        # Evidence Sufficiency Tier
        if count < 3 or avg_rel < 0.60:
            evidence_sufficiency = EvidenceSufficiency.INSUFFICIENT.value
        elif count >= 5 and independent_buses >= 2 and avg_rel >= 0.80 and time_span >= 2.0:
            evidence_sufficiency = EvidenceSufficiency.GOOD.value
        else:
            evidence_sufficiency = EvidenceSufficiency.LIMITED.value

        # Confidence Score (0-100 evidence sufficiency index)
        # Factor 1: Observation Volume (0-30 pts)
        vol_score = min(30.0, (count / 8.0) * 30.0)

        # Factor 2: Independent Bus Diversity (0-25 pts)
        bus_score = min(25.0, (independent_buses / 3.0) * 25.0)

        # Factor 3: Sensor Reliability (0-25 pts)
        rel_score = max(0.0, min(25.0, (avg_rel / 1.0) * 25.0))

        # Factor 4: Temporal Span Coverage (0-10 pts)
        span_score = min(10.0, (time_span / 7.0) * 10.0)

        # Factor 5: Trend Consistency (0-10 pts)
        if trend_dir in ["DETERIORATING", "IMPROVING", "STABLE"]:
            trend_score = 10.0
        elif trend_dir == "VOLATILE":
            trend_score = 5.0
        else:
            trend_score = 0.0

        confidence = round(vol_score + bus_score + rel_score + span_score + trend_score, 1)
        if evidence_sufficiency == EvidenceSufficiency.INSUFFICIENT.value:
            confidence = min(confidence, 35.0)

        # Risk Level Assessment
        # Domain-dependent thresholds
        if target_type == "ROAD_DETERIORATION":
            # 0-10 index
            if forecast_value >= 8.0 or (forecast_value >= 6.5 and trend_dir == "DETERIORATING"):
                risk_level = RiskLevel.CRITICAL.value
            elif forecast_value >= 6.0 or (forecast_value >= 5.0 and trend_dir == "DETERIORATING"):
                risk_level = RiskLevel.HIGH.value
            elif forecast_value >= 3.5:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value

        elif target_type == "TRAFFIC_CONGESTION":
            # 0-10 or 0-100 congestion factor
            if forecast_value >= 80.0 or (forecast_value >= 65.0 and trend_dir == "DETERIORATING"):
                risk_level = RiskLevel.HIGH.value
            elif forecast_value >= 50.0:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value

        elif target_type == "PEDESTRIAN_RISK":
            # 0-100 risk score
            if forecast_value >= 75.0:
                risk_level = RiskLevel.CRITICAL.value
            elif forecast_value >= 55.0:
                risk_level = RiskLevel.HIGH.value
            elif forecast_value >= 35.0:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value

        elif target_type == "MAINTENANCE_PRIORITY":
            # Priority rank 1=LOW, 2=MEDIUM, 3=HIGH, 4=CRITICAL
            if forecast_value >= 3.5:
                risk_level = RiskLevel.CRITICAL.value
            elif forecast_value >= 2.5:
                risk_level = RiskLevel.HIGH.value
            elif forecast_value >= 1.5:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value

        else:  # PERSISTENT_HOTSPOT
            if count >= 6 and trend_dir == "DETERIORATING":
                risk_level = RiskLevel.CRITICAL.value
            elif count >= 4 or trend_dir == "DETERIORATING":
                risk_level = RiskLevel.HIGH.value
            elif count >= 2:
                risk_level = RiskLevel.MEDIUM.value
            else:
                risk_level = RiskLevel.LOW.value

        return {
            "evidence_sufficiency": evidence_sufficiency,
            "confidence": confidence,
            "risk_level": risk_level,
        }
