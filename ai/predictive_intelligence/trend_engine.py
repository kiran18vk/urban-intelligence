"""
Temporal trend engine for Predictive Urban Intelligence (Feature #9).
Computes explainable, deterministic trend metrics and directions.
"""
from typing import Dict, Any
from ai.predictive_intelligence.models import TrendDirection
from ai.predictive_intelligence.config import (
    TREND_STABLE_THRESHOLD_PCT,
    TREND_VOLATILE_VARIANCE_THRESHOLD,
    MIN_OBSERVATIONS_FOR_SUFFICIENT_DATA,
    MIN_RELIABILITY_THRESHOLD,
)


class TrendEngine:
    """
    Analyzes historical time-series features to classify trend direction and strength.
    """

    @staticmethod
    def evaluate_trend(
        features: Dict[str, Any],
        higher_is_worse: bool = True,
    ) -> Dict[str, Any]:
        """
        Determines trend direction, trend strength, and rate of change.
        """
        count = features.get("count", 0)
        avg_rel = features.get("avg_reliability", 0.0)

        # Insufficient data check
        if count < MIN_OBSERVATIONS_FOR_SUFFICIENT_DATA or avg_rel < MIN_RELIABILITY_THRESHOLD:
            return {
                "trend_direction": TrendDirection.INSUFFICIENT_DATA.value,
                "trend_strength": 0.0,
                "rate_of_change": 0.0,
                "percentage_change": 0.0,
                "is_volatile": False,
            }

        baseline = features.get("baseline_value", 0.0)
        current = features.get("current_value", 0.0)
        variance = features.get("variance", 0.0)
        rate_of_change = features.get("rate_of_change", 0.0)

        # Calculate percentage change
        denom = max(abs(baseline), 0.01)
        pct_change = (current - baseline) / denom

        # Check for volatility
        # If variance is very high relative to mean and direction flips frequently
        is_volatile = variance > (denom * TREND_VOLATILE_VARIANCE_THRESHOLD) and count >= 4

        if is_volatile and abs(pct_change) < 0.15:
            trend_direction = TrendDirection.VOLATILE.value
            trend_strength = 0.65
        elif abs(pct_change) <= TREND_STABLE_THRESHOLD_PCT:
            trend_direction = TrendDirection.STABLE.value
            trend_strength = round(max(0.20, 1.0 - abs(pct_change) * 5), 2)
        elif higher_is_worse:
            if pct_change > TREND_STABLE_THRESHOLD_PCT:
                trend_direction = TrendDirection.DETERIORATING.value
                trend_strength = round(min(1.0, 0.40 + abs(pct_change) * 0.8), 2)
            else:
                trend_direction = TrendDirection.IMPROVING.value
                trend_strength = round(min(1.0, 0.40 + abs(pct_change) * 0.8), 2)
        else:
            if pct_change > TREND_STABLE_THRESHOLD_PCT:
                trend_direction = TrendDirection.IMPROVING.value
                trend_strength = round(min(1.0, 0.40 + abs(pct_change) * 0.8), 2)
            else:
                trend_direction = TrendDirection.DETERIORATING.value
                trend_strength = round(min(1.0, 0.40 + abs(pct_change) * 0.8), 2)

        return {
            "trend_direction": trend_direction,
            "trend_strength": trend_strength,
            "rate_of_change": round(rate_of_change, 3),
            "percentage_change": round(pct_change * 100.0, 1),
            "is_volatile": is_volatile,
        }
