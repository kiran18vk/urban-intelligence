"""
Feature builder for Predictive Urban Intelligence (Feature #9).
Assembles temporal and spatial features from observation sequences.
"""
from typing import Dict, List, Any, Optional
import numpy as np
import time


class ObservationFeatureBuilder:
    """
    Constructs deterministic feature summaries from temporal observation sequences.
    """

    @staticmethod
    def build_features(
        observations: List[Dict[str, Any]],
        target_id: str,
        target_type: str,
        metric_key: str = "value",
    ) -> Dict[str, Any]:
        """
        Extracts temporal and statistical properties from a list of observations.
        Each observation dict is expected to have:
          - timestamp: float
          - value / score / defect_count: float or int
          - bus_id: str
          - reliability: float
          - event_id: Optional[str]
        """
        if not observations:
            return {
                "count": 0,
                "independent_buses": 0,
                "source_bus_ids": [],
                "source_event_ids": [],
                "time_span_days": 0.0,
                "baseline_value": 0.0,
                "current_value": 0.0,
                "delta": 0.0,
                "rate_of_change": 0.0,
                "avg_reliability": 0.0,
                "variance": 0.0,
                "is_sufficient": False,
            }

        # Sort by timestamp ascending
        sorted_obs = sorted(observations, key=lambda x: x.get("timestamp", 0))
        count = len(sorted_obs)

        # Extract values
        values = [float(obs.get(metric_key, obs.get("value", 0.0))) for obs in sorted_obs]
        reliabilities = [float(obs.get("reliability", 0.80)) for obs in sorted_obs]
        bus_ids = list({str(obs.get("bus_id", "PMP-BUS-001")) for obs in sorted_obs if obs.get("bus_id")})
        event_ids = [str(obs.get("event_id")) for obs in sorted_obs if obs.get("event_id")]

        t_min = sorted_obs[0].get("timestamp", time.time())
        t_max = sorted_obs[-1].get("timestamp", time.time())
        time_span_days = max((t_max - t_min) / 86400.0, 0.1)

        # Baseline is the mean of earlier observations or the earliest observation
        if count >= 3:
            baseline_value = float(np.mean(values[:max(1, count // 2)]))
        else:
            baseline_value = float(values[0])

        current_value = float(values[-1])
        delta = current_value - baseline_value
        rate_of_change = delta / time_span_days if time_span_days > 0 else delta
        avg_reliability = float(np.mean(reliabilities))
        variance = float(np.var(values)) if count > 1 else 0.0

        is_sufficient = (count >= 3) and (avg_reliability >= 0.60)

        return {
            "count": count,
            "independent_buses": len(bus_ids),
            "source_bus_ids": bus_ids,
            "source_event_ids": event_ids,
            "time_span_days": round(time_span_days, 1),
            "baseline_value": round(baseline_value, 2),
            "current_value": round(current_value, 2),
            "delta": round(delta, 2),
            "rate_of_change": round(rate_of_change, 3),
            "avg_reliability": round(avg_reliability, 3),
            "variance": round(variance, 3),
            "is_sufficient": is_sufficient,
            "values": values,
            "timestamps": [obs.get("timestamp", 0) for obs in sorted_obs],
        }
