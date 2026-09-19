"""
Before / After Comparator for Re-Observation (Feature #8).
"""
import math
from typing import Dict, Any, Tuple, Optional


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two (lat, lon) pairs in meters."""
    r_lat1, r_lon1 = math.radians(lat1), math.radians(lon1)
    r_lat2, r_lon2 = math.radians(lat2), math.radians(lon2)
    dlat = r_lat2 - r_lat1
    dlon = r_lon2 - r_lon1
    a = math.sin(dlat / 2.0) ** 2 + math.cos(r_lat1) * math.cos(r_lat2) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return 6371000.0 * c


class ObservationComparator:
    """
    Compares original observation with post-action re-observation.
    """

    def __init__(self, spatial_threshold_meters: float = 150.0):
        self.spatial_threshold_meters = spatial_threshold_meters

    def compare(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Executes deterministic multi-attribute comparison between before and after observations.
        """
        # 1. Spatial Matching
        b_lat = float(before.get("latitude", 18.5204))
        b_lon = float(before.get("longitude", 73.8567))
        a_lat = float(after.get("latitude", b_lat))
        a_lon = float(after.get("longitude", b_lon))

        dist_m = haversine_distance_meters(b_lat, b_lon, a_lat, a_lon)
        spatial_match = dist_m <= self.spatial_threshold_meters

        # 2. Temporal Matching
        b_time = float(before.get("timestamp", before.get("created_at", 0.0)))
        a_time = float(after.get("timestamp", after.get("observation_timestamp", b_time + 3600.0)))
        time_delta_sec = max(0.0, a_time - b_time)
        time_delta_hours = round(time_delta_sec / 3600.0, 1)

        # 3. Defect Count Delta
        b_defects = before.get("defect_count")
        a_defects = after.get("defect_count")
        defect_delta = None
        if b_defects is not None and a_defects is not None:
            defect_delta = int(a_defects) - int(b_defects)

        # 4. Severity Rank Comparison
        severity_ranks = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "INFO": 0}
        b_sev = str(before.get("severity", "MEDIUM")).upper()
        a_sev = str(after.get("severity", "LOW")).upper()
        b_rank = severity_ranks.get(b_sev, 2)
        a_rank = severity_ranks.get(a_sev, 1)
        severity_delta = a_rank - b_rank

        # 5. Reliability and Confidence Delta
        b_rel = float(before.get("reliability", 0.85))
        a_rel = float(after.get("reliability", 0.85))
        b_conf = float(before.get("operational_confidence", 0.80))
        a_conf = float(after.get("operational_confidence", 0.80))

        return {
            "spatial_distance_m": round(dist_m, 1),
            "spatial_match": spatial_match,
            "spatial_threshold_m": self.spatial_threshold_meters,
            "temporal_delta_hours": time_delta_hours,
            "before_defect_count": b_defects,
            "after_defect_count": a_defects,
            "defect_delta": defect_delta,
            "before_severity": b_sev,
            "after_severity": a_sev,
            "severity_delta": severity_delta,
            "before_reliability": b_rel,
            "after_reliability": a_rel,
            "before_operational_confidence": b_conf,
            "after_operational_confidence": a_conf,
        }
