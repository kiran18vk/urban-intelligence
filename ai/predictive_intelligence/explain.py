"""
Auditable Explanation Generator for Predictive Urban Intelligence (Feature #9).
Generates transparent, defensible rationales for forecast outlooks.
"""
from typing import Dict, Any


class ForecastExplainer:
    """
    Constructs auditable reasoning texts derived purely from empirical observation properties.
    """

    @staticmethod
    def generate_explanation(forecast_data: Dict[str, Any]) -> str:
        """
        Generates an auditable 'Why this forecast?' string.
        """
        target_type = forecast_data.get("target_type", "")
        obs_count = forecast_data.get("historical_observation_count", 0)
        bus_count = forecast_data.get("independent_bus_count", 0)
        trend_dir = forecast_data.get("trend_direction", "STABLE")
        current_val = forecast_data.get("current_value", 0.0)
        baseline_val = forecast_data.get("baseline_value", 0.0)
        reliability = forecast_data.get("reliability", 0.0)
        window = forecast_data.get("observation_window_days", 0.0)
        sufficiency = forecast_data.get("evidence_sufficiency", "LIMITED")

        if sufficiency == "INSUFFICIENT" or obs_count < 3:
            return (
                f"Insufficient observation density ({obs_count} observation, reliability {reliability:.2f}) "
                f"for a defensible predictive outlook. Additional fleet passes across this segment are required."
            )

        bus_label = "independent buses" if bus_count != 1 else "single bus"

        if target_type == "ROAD_DETERIORATION":
            if trend_dir == "DETERIORATING":
                return (
                    f"Road deterioration is trending upward across {obs_count} observations from {bus_count} {bus_label} "
                    f"over {window:.1f} days. Average sensor reliability is {reliability:.2f}. The current deterioration index ({current_val:.1f}) "
                    f"is elevated above the baseline ({baseline_val:.1f}), indicating active surface wear."
                )
            elif trend_dir == "IMPROVING":
                return (
                    f"Road quality metrics show positive stabilization across {obs_count} observations from {bus_count} {bus_label}. "
                    f"Average reliability is {reliability:.2f}. The current index ({current_val:.1f}) is below historical baseline ({baseline_val:.1f})."
                )
            else:
                return (
                    f"Road condition measurements remain steady around baseline ({baseline_val:.1f}) across {obs_count} transit passes "
                    f"({bus_count} {bus_label}, avg reliability {reliability:.2f})."
                )

        elif target_type == "TRAFFIC_CONGESTION":
            if trend_dir == "DETERIORATING":
                return (
                    f"Corridor congestion index exhibits recurring upward progression across {obs_count} transit passes from {bus_count} {bus_label}. "
                    f"Delay factors consistently peak during recurring commute intervals (average observation reliability {reliability:.2f})."
                )
            else:
                return (
                    f"Corridor traffic density matches regular baseline schedule variations across {obs_count} transit observations "
                    f"({bus_count} {bus_label}, reliability {reliability:.2f})."
                )

        elif target_type == "PEDESTRIAN_RISK":
            return (
                f"Pedestrian risk scores remain elevated across {obs_count} distinct observations from {bus_count} independent buses "
                f"over {window:.1f} days. Sensor corroboration reliability is {reliability:.2f}, indicating persistent pedestrian-vehicle conflict exposure."
            )

        elif target_type == "MAINTENANCE_PRIORITY":
            return (
                f"Maintenance priority outlook is projected based on worsening defect trajectory across {obs_count} mobile passes "
                f"({bus_count} {bus_label}, reliability {reliability:.2f}). Evidence supports preventative prioritization before scheduled cycle."
            )

        else:  # PERSISTENT_HOTSPOT
            return (
                f"Location has generated {obs_count} recurring condition events corroborated by {bus_count} distinct buses "
                f"over {window:.1f} days. Sensor reliability averages {reliability:.2f}, confirming persistent hotspot characteristics."
            )
