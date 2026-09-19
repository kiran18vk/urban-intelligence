"""
Early Warning & Preventive Action Engine for Predictive Urban Intelligence (Feature #9).
Deterministic alert escalation and preventive intervention recommendations.
"""
from typing import Dict, Any, Tuple
from ai.predictive_intelligence.models import WarningLevel


class EarlyWarningEngine:
    """
    Evaluates early warning levels and suggests prototype authority action interventions.
    """

    @staticmethod
    def evaluate_warning(
        target_type: str,
        trend_direction: str,
        risk_level: str,
        current_value: float,
        forecast_value: float,
        independent_bus_count: int,
        observation_count: int,
    ) -> Tuple[str, str, str, str]:
        """
        Returns (early_warning, warning_message, recommended_action, action_details).
        """
        # Default fallback
        warning_level = WarningLevel.INFO.value
        warning_msg = "Condition remains stable within baseline thresholds."
        action = "REOBSERVE"
        action_details = "Continue routine mobile fleet monitoring."

        if trend_direction == "INSUFFICIENT_DATA":
            return (
                WarningLevel.INFO.value,
                "Insufficient observations for alert escalation. Additional fleet passes scheduled.",
                "REOBSERVE",
                "Schedule additional transit passes across this corridor to establish a baseline.",
            )

        # 1. ROAD DETERIORATION
        if target_type == "ROAD_DETERIORATION":
            if risk_level == "CRITICAL" or (trend_direction == "DETERIORATING" and forecast_value >= 7.0):
                warning_level = WarningLevel.CRITICAL.value
                warning_msg = f"Accelerating road surface deterioration detected across {observation_count} passes ({independent_bus_count} buses)."
                action = "REPAIR"
                action_details = "Evaluate rapid patching or resurfacing intervention before structural sub-base damage escalates."
            elif risk_level == "HIGH" or trend_direction == "DETERIORATING":
                warning_level = WarningLevel.WARNING.value
                warning_msg = "Deteriorating road condition observed across multiple passes."
                action = "INSPECT"
                action_details = "Evaluate earlier field inspection and schedule preventative pothole sealing."
            elif trend_direction == "VOLATILE":
                warning_level = WarningLevel.WATCH.value
                warning_msg = "Variable road defect measurements detected; monitor for localized pavement settling."
                action = "INSPECT"
                action_details = "Dispatch maintenance inspector to verify pavement integrity."
            else:
                warning_level = WarningLevel.INFO.value
                warning_msg = "Road surface index is stable or showing post-repair improvement."
                action = "REOBSERVE"
                action_details = "Perform regular scheduled monitoring."

        # 2. TRAFFIC CONGESTION
        elif target_type == "TRAFFIC_CONGESTION":
            if risk_level in ["HIGH", "CRITICAL"] and trend_direction == "DETERIORATING":
                warning_level = WarningLevel.WARNING.value
                warning_msg = "Recurring congestion pattern is increasing during the observed peak window."
                action = "TRAFFIC_CONTROL"
                action_details = "Consider dynamic signal retiming or junction marshal deployment during peak hours."
            elif trend_direction == "DETERIORATING":
                warning_level = WarningLevel.WATCH.value
                warning_msg = "Transit delay factors showing upward drift across recent corridor passes."
                action = "TRAFFIC_CONTROL"
                action_details = "Review corridor bottleneck points and schedule peak transit priority review."
            else:
                warning_level = WarningLevel.INFO.value
                warning_msg = "Corridor traffic density matches normal transit schedule baselines."
                action = "REOBSERVE"
                action_details = "Monitor traffic flow during regular bus transit runs."

        # 3. PEDESTRIAN RISK
        elif target_type == "PEDESTRIAN_RISK":
            if risk_level == "CRITICAL" or (risk_level == "HIGH" and independent_bus_count >= 2):
                warning_level = WarningLevel.WARNING.value
                warning_msg = "High pedestrian risk persists across independent bus observations."
                action = "SAFETY_INTERVENTION"
                action_details = "Evaluate crossing improvement, speed calming measures, or dedicated pedestrian signal timing."
            elif risk_level in ["HIGH", "MEDIUM"] and trend_direction == "DETERIORATING":
                warning_level = WarningLevel.WATCH.value
                warning_msg = "Pedestrian density and vehicle interaction risk trending upward."
                action = "SAFETY_INTERVENTION"
                action_details = "Deploy temporary safety signage or inspect pedestrian barrier alignment."
            else:
                warning_level = WarningLevel.INFO.value
                warning_msg = "Pedestrian interaction risk within normal historical bounds."
                action = "REOBSERVE"
                action_details = "Continue automated bus camera risk monitoring."

        # 4. MAINTENANCE PRIORITY
        elif target_type == "MAINTENANCE_PRIORITY":
            if forecast_value >= 3.5 or (forecast_value >= 2.5 and trend_direction == "DETERIORATING"):
                warning_level = WarningLevel.WARNING.value
                warning_msg = "Road deterioration trend may require earlier inspection before scheduled cycle."
                action = "INSPECT"
                action_details = "Prioritize field verification ticket in the upcoming maintenance dispatch schedule."
            elif trend_direction == "DETERIORATING":
                warning_level = WarningLevel.WATCH.value
                warning_msg = "Maintenance priority trending toward upgrade."
                action = "INSPECT"
                action_details = "Review defect progression on upcoming road maintenance review board."
            else:
                warning_level = WarningLevel.INFO.value
                warning_msg = "Maintenance queue priority is steady."
                action = "REOBSERVE"
                action_details = "Maintain existing scheduled maintenance window."

        # 5. PERSISTENT HOTSPOT
        else:
            if observation_count >= 5 and independent_bus_count >= 2:
                warning_level = WarningLevel.WARNING.value
                warning_msg = "Same urban issue has recurred across multiple observations and independent buses."
                action = "SAFETY_INTERVENTION"
                action_details = "Conduct comprehensive corridor safety and infrastructure review."
            elif observation_count >= 3:
                warning_level = WarningLevel.WATCH.value
                warning_msg = "Emerging urban condition hotspot identified across successive transit runs."
                action = "INSPECT"
                action_details = "Verify physical site conditions and validate municipal asset alignment."
            else:
                warning_level = WarningLevel.INFO.value
                warning_msg = "Hotspot activity is stable or declining."
                action = "REOBSERVE"
                action_details = "Track subsequent transit passes."

        return warning_level, warning_msg, action, action_details
