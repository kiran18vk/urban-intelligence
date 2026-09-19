"""
Spatial Correlation and Update Helpers for Digital Twin (SIH 2026 PS 26124).
"""

import math
from datetime import datetime, timezone, timedelta
from typing import Tuple, List, Dict, Any, Optional

from ai.digital_twin.models import (
    RoadSegment,
    TrafficZone,
    UrbanAsset,
    FreshnessState,
    ConditionState,
    CongestionLevel,
)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance in kilometers between two lat/lon coordinates."""
    r = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))


def min_dist_to_segment_km(
    point: Tuple[float, float],
    seg_points: List[Tuple[float, float]],
) -> float:
    """Finds the minimum distance in km from a point to a polyline segment."""
    if not seg_points:
        return float("inf")
    if len(seg_points) == 1:
        return haversine_km(point[0], point[1], seg_points[0][0], seg_points[0][1])

    min_dist = float("inf")
    for pt in seg_points:
        d = haversine_km(point[0], point[1], pt[0], pt[1])
        if d < min_dist:
            min_dist = d
    return min_dist


def evaluate_freshness(last_updated_iso: str, now: Optional[datetime] = None) -> str:
    """
    Evaluates observation freshness based on timestamp:
    - FRESH: <= 15 minutes
    - AGING: 15 to 60 minutes
    - STALE: > 60 minutes or unavailable
    """
    if not last_updated_iso:
        return FreshnessState.STALE.value

    if now is None:
        now = datetime.now(timezone.utc)

    try:
        dt = datetime.fromisoformat(last_updated_iso.replace("Z", "+00:00"))
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        elapsed_minutes = (now - dt).total_seconds() / 60.0
        if elapsed_minutes <= 15:
            return FreshnessState.FRESH.value
        elif elapsed_minutes <= 60:
            return FreshnessState.AGING.value
        else:
            return FreshnessState.STALE.value
    except Exception:
        return FreshnessState.STALE.value


def evaluate_condition_from_defects(defect_count: int) -> str:
    """Determines road condition state deterministically based on defect frequency."""
    if defect_count == 0:
        return ConditionState.EXCELLENT.value
    elif defect_count <= 2:
        return ConditionState.GOOD.value
    elif defect_count <= 5:
        return ConditionState.DEGRADED.value
    else:
        return ConditionState.CRITICAL.value
