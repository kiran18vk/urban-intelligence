"""
Deterministic Aggregators for Urban Intelligence Analytics.
"""
from typing import List, Dict, Any, Optional, Union
from collections import Counter

from ai.analytics.models import (
    FleetMetrics,
    EventMetrics,
    VehicleClassDistribution,
    ReliabilitySummary,
)
from ai.analytics.config import AnalyticsConfig
from ai.events.models import UrbanEvent, EventType, SeverityLevel


def _get_field(obj: Any, field_name: str, default: Any = None) -> Any:
    """Helper to get field from either dataclass or dict."""
    if isinstance(obj, dict):
        return obj.get(field_name, default)
    return getattr(obj, field_name, default)


def aggregate_fleet_metrics(
    buses: List[Dict[str, Any]],
    events: List[Any],
) -> FleetMetrics:
    """
    Computes fleet operational metrics from bus fleet and event records.
    """
    total = len(buses)
    if total == 0:
        return FleetMetrics()

    active = sum(1 for b in buses if str(b.get("status", "")).lower() == "active")
    
    # Identify buses with at least one event
    event_bus_ids = {_get_field(e, "bus_id") for e in events if _get_field(e, "bus_id")}
    reporting = len(event_bus_ids)

    routes = {b.get("routeId") or b.get("route_id") for b in buses if b.get("routeId") or b.get("route_id")}

    utilization = (active / total * 100.0) if total > 0 else 0.0

    return FleetMetrics(
        total_buses=total,
        active_buses=active,
        reporting_buses=reporting,
        active_routes_count=len(routes),
        fleet_utilization_pct=utilization,
    )


def aggregate_event_metrics(
    events: List[Any],
    low_reliability_threshold: float = 0.70,
) -> EventMetrics:
    """
    Aggregates urban sensing events by category, severity, and reliability.
    """
    total = len(events)
    if total == 0:
        return EventMetrics()

    road_defects = 0
    traffic_events = 0
    incidents = 0
    anpr_detections = 0
    high_critical = 0
    low_reliability = 0

    for e in events:
        raw_type = _get_field(e, "event_type", "")
        etype = raw_type.value if hasattr(raw_type, "value") else str(raw_type)

        raw_sev = _get_field(e, "severity", "")
        sev = raw_sev.value if hasattr(raw_sev, "value") else str(raw_sev)

        if "ROAD" in etype or "POTHOLE" in etype or "CRACK" in etype:
            road_defects += 1
        elif "TRAFFIC" in etype or "CONGESTION" in etype or "VEHICLE" in etype:
            traffic_events += 1
        elif "HIT_AND_RUN" in etype or "INCIDENT" in etype:
            incidents += 1
        elif "ANPR" in etype:
            anpr_detections += 1

        if sev in ["HIGH", "CRITICAL"]:
            high_critical += 1

        rel = _get_field(e, "reliability")
        if rel and isinstance(rel, dict):
            score = rel.get("score", 1.0)
            if score < low_reliability_threshold:
                low_reliability += 1

    return EventMetrics(
        total_events=total,
        road_defects=road_defects,
        traffic_events=traffic_events,
        incidents=incidents,
        anpr_detections=anpr_detections,
        high_critical_count=high_critical,
        low_reliability_count=low_reliability,
    )


def aggregate_vehicle_distribution(
    detections: List[Dict[str, Any]],
) -> List[VehicleClassDistribution]:
    """
    Computes distribution percentages across recognized vehicle classes
    (Car, Motorcycle, Bus, Truck, Bicycle, Person).
    """
    if not detections:
        return [
            VehicleClassDistribution("Car", 0, 0.0),
            VehicleClassDistribution("Motorcycle", 0, 0.0),
            VehicleClassDistribution("Bus", 0, 0.0),
            VehicleClassDistribution("Truck", 0, 0.0),
            VehicleClassDistribution("Bicycle", 0, 0.0),
            VehicleClassDistribution("Person", 0, 0.0),
        ]

    counts: Counter = Counter()
    for d in detections:
        cls_name = (
            d.get("class_name")
            or d.get("vehicle_class")
            or d.get("class")
            or "vehicle"
        ).capitalize()
        counts[cls_name] += 1

    total = sum(counts.values())
    if total == 0:
        return []

    distribution = []
    for cls_name, count in counts.most_common():
        pct = (count / total) * 100.0
        distribution.append(
            VehicleClassDistribution(
                class_name=cls_name,
                count=count,
                percentage=pct,
            )
        )

    return distribution


def aggregate_reliability_metrics(
    events: List[Any],
    low_reliability_threshold: float = 0.70,
) -> ReliabilitySummary:
    """
    Aggregates observation reliability scores across all observations.
    """
    total = len(events)
    if total == 0:
        return ReliabilitySummary()

    scores = []
    low_count = 0
    high_sev_low_rel = 0

    for e in events:
        rel = _get_field(e, "reliability")
        if rel and isinstance(rel, dict):
            score = rel.get("score", 1.0)
            scores.append(score)
            if score < low_reliability_threshold:
                low_count += 1
                raw_sev = _get_field(e, "severity", "")
                sev = raw_sev.value if hasattr(raw_sev, "value") else str(raw_sev)
                if sev in ["HIGH", "CRITICAL"]:
                    high_sev_low_rel += 1

    avg_score = (sum(scores) / len(scores)) if scores else 0.85

    return ReliabilitySummary(
        total_observations=total,
        low_reliability_count=low_count,
        average_reliability_score=avg_score,
        high_severity_low_reliability_count=high_sev_low_rel,
    )
