"""
Route and Corridor Analytics Calculations (Phase 7, SIH 2026 PS 26124).
"""
from typing import List, Dict, Any, Optional

from ai.analytics.models import CorridorMetric
from ai.analytics.config import AnalyticsConfig, DEFAULT_CORRIDORS
from ai.events.models import UrbanEvent
from ai.incidents.models import IncidentRecord


def _get_field(obj: Any, field_name: str, default: Any = None) -> Any:
    """Helper to get field from either dataclass or dict."""
    if isinstance(obj, dict):
        return obj.get(field_name, default)
    return getattr(obj, field_name, default)


def aggregate_corridor_metrics(
    events: List[Any],
    incidents: Optional[List[Any]] = None,
    config: Optional[AnalyticsConfig] = None,
) -> List[CorridorMetric]:
    """
    Computes corridor-level event metrics, observed congestion, and delay estimates.
    """
    cfg = config or AnalyticsConfig()
    incidents_list = incidents or []
    
    corridor_results: List[CorridorMetric] = []

    for i, corr in enumerate(DEFAULT_CORRIDORS):
        # Attribute events by corridor waypoints or deterministic distribution
        corr_events = []
        for e in events:
            notes = _get_field(e, "notes", "") or ""
            eid = _get_field(e, "event_id", "") or ""
            if any(wp.lower() in notes.lower() for wp in corr.waypoints) or (hash(eid) % len(DEFAULT_CORRIDORS) == i):
                corr_events.append(e)

        corr_incidents = []
        for inc in incidents_list:
            notes = _get_field(inc, "notes", "") or ""
            iid = _get_field(inc, "incident_id", "") or ""
            if any(wp.lower() in notes.lower() for wp in corr.waypoints) or (hash(iid) % len(DEFAULT_CORRIDORS) == i):
                corr_incidents.append(inc)

        defects = sum(
            1 for e in corr_events
            if "ROAD" in str(_get_field(e, "event_type", ""))
            or "POTHOLE" in str(_get_field(e, "event_type", ""))
            or "CRACK" in str(_get_field(e, "event_type", ""))
        )
        traffic_evts = sum(
            1 for e in corr_events
            if "TRAFFIC" in str(_get_field(e, "event_type", ""))
            or "CONGESTION" in str(_get_field(e, "event_type", ""))
        )
        inc_count = len(corr_incidents)

        # Determine observed congestion
        if traffic_evts >= 3 or len(corr_events) >= 6:
            congestion_level = "HIGH"
        elif traffic_evts >= 1 or len(corr_events) >= 3:
            congestion_level = "MEDIUM"
        else:
            congestion_level = "LOW"

        factor = cfg.congestion_factors.get(congestion_level, 1.05)
        baseline = corr.baseline_time_min
        
        # Formula: estimated_delay = baseline * (congestion_factor - 1.0)
        delay_min = max(0.0, baseline * (factor - 1.0))

        # Reliability in this corridor
        rel_scores = []
        for e in corr_events:
            rel = _get_field(e, "reliability")
            if rel and isinstance(rel, dict) and "score" in rel:
                rel_scores.append(rel["score"])

        low_rel_count = sum(1 for s in rel_scores if s < cfg.low_reliability_threshold)
        avg_rel = (sum(rel_scores) / len(rel_scores)) if rel_scores else 0.85

        corridor_results.append(
            CorridorMetric(
                corridor_id=corr.corridor_id,
                corridor_name=corr.name,
                event_count=len(corr_events) + inc_count,
                road_defects=defects,
                traffic_events=traffic_evts,
                incidents=inc_count,
                observed_congestion=congestion_level,
                congestion_factor=factor,
                baseline_transit_time_min=baseline,
                estimated_delay_min=delay_min,
                low_reliability_count=low_rel_count,
                average_reliability=avg_rel,
                is_demo_estimate=True,
            )
        )

    return corridor_results
