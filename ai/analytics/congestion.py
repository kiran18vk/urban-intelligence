"""
Congestion Analytics Module (Phase 7, SIH 2026 PS 26124).
"""
from typing import Dict, Any, List, Optional

from ai.analytics.config import AnalyticsConfig


def evaluate_congestion_level(
    vehicle_count: int,
    config: Optional[AnalyticsConfig] = None,
) -> Dict[str, Any]:
    """
    Evaluates observed congestion level given an active vehicle detection count.
    """
    cfg = config or AnalyticsConfig()
    
    if vehicle_count >= cfg.density_threshold_medium:
        level = "HIGH"
    elif vehicle_count >= cfg.density_threshold_low:
        level = "MEDIUM"
    else:
        level = "LOW"

    multiplier = cfg.congestion_factors.get(level, 1.05)

    return {
        "vehicle_count": vehicle_count,
        "congestion_level": level,
        "congestion_factor": multiplier,
        "is_simulated_metric": True,
    }
