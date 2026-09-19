"""
Confidence aggregation, severity resolution, canonical location calculation,
and lifecycle status rules for correlated urban events.
"""
import math
from typing import Any, Dict, List, Optional, Tuple

from ai.event_correlation.models import CorrelationLevel, CorrelationFreshness, CorrelationStatus
from ai.event_correlation.config import EventCorrelationConfig, DEFAULT_CORRELATION_CONFIG


SEVERITY_ORDER = {
    "LOW": 1,
    "MEDIUM": 2,
    "HIGH": 3,
    "CRITICAL": 4,
}


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two GPS coordinates in meters."""
    R = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c


def calculate_correlation_strength(
    unique_bus_count: int,
    config: Optional[EventCorrelationConfig] = None
) -> float:
    """
    Computes normalized corroboration strength based on independent bus confirmations.
    Does NOT inflate AI confidence; represents independent-bus corroboration only.
    """
    cfg = config or DEFAULT_CORRELATION_CONFIG
    if unique_bus_count >= cfg.consensus_min_buses:
        return cfg.strength_consensus
    elif unique_bus_count >= cfg.corroboration_min_buses:
        return cfg.strength_corroboration
    elif unique_bus_count >= cfg.single_bus_min:
        return cfg.strength_single
    return 0.0


def determine_correlation_level(
    unique_bus_count: int,
    config: Optional[EventCorrelationConfig] = None
) -> CorrelationLevel:
    """Determines correlation level classification."""
    cfg = config or DEFAULT_CORRELATION_CONFIG
    if unique_bus_count >= cfg.consensus_min_buses:
        return CorrelationLevel.MULTI_BUS_CONSENSUS
    elif unique_bus_count >= cfg.corroboration_min_buses:
        return CorrelationLevel.MULTI_BUS_CORROBORATION
    elif unique_bus_count >= cfg.single_bus_min:
        return CorrelationLevel.SINGLE_BUS_OBSERVATION
    return CorrelationLevel.INSUFFICIENT


def calculate_canonical_location(events: List[Any]) -> Tuple[float, float, bool]:
    """
    Computes canonical GPS coordinates for the cluster.
    Uses reliability-weighted averaging when reliability score is present.
    Falls back to arithmetic mean if reliability is unavailable.
    """
    if not events:
        return 18.520430, 73.856744, True

    weighted_lat_sum = 0.0
    weighted_lon_sum = 0.0
    total_weight = 0.0
    all_simulated = True

    for ev in events:
        # Extract lat/lon and simulation state
        if hasattr(ev, "gps"):
            lat = ev.gps.latitude if hasattr(ev.gps, "latitude") else ev.gps.get("latitude", 18.520430)
            lon = ev.gps.longitude if hasattr(ev.gps, "longitude") else ev.gps.get("longitude", 73.856744)
            is_sim = ev.gps.is_simulated if hasattr(ev.gps, "is_simulated") else ev.gps.get("is_simulated", True)
        elif isinstance(ev, dict) and "latitude" in ev:
            lat = ev["latitude"]
            lon = ev["longitude"]
            is_sim = ev.get("is_simulated", True)
        else:
            lat, lon, is_sim = 18.520430, 73.856744, True

        if not is_sim:
            all_simulated = False

        # Weight by observation reliability score if available
        rel_score = 1.0
        if hasattr(ev, "reliability") and isinstance(ev.reliability, dict):
            rel_score = float(ev.reliability.get("score", 1.0))
        elif isinstance(ev, dict) and "reliability" in ev and isinstance(ev["reliability"], dict):
            rel_score = float(ev["reliability"].get("score", 1.0))

        # Ensure weight > 0
        weight = max(0.1, rel_score)
        weighted_lat_sum += lat * weight
        weighted_lon_sum += lon * weight
        total_weight += weight

    if total_weight > 0:
        canonical_lat = weighted_lat_sum / total_weight
        canonical_lon = weighted_lon_sum / total_weight
    else:
        canonical_lat = 18.520430
        canonical_lon = 73.856744

    return canonical_lat, canonical_lon, all_simulated


def aggregate_confidences(events: List[Any]) -> Dict[str, float]:
    """
    Extracts confidence metrics across all source observations in the cluster:
    - max_raw_confidence
    - max_operational_confidence
    - average_operational_confidence
    - average_reliability
    """
    if not events:
        return {
            "max_raw_confidence": 0.0,
            "max_operational_confidence": 0.0,
            "average_operational_confidence": 0.0,
            "average_reliability": 0.0,
        }

    raw_confidences: List[float] = []
    op_confidences: List[float] = []
    reliabilities: List[float] = []

    for ev in events:
        # Raw confidence
        c = getattr(ev, "confidence", None)
        if c is None and isinstance(ev, dict):
            c = ev.get("confidence", 0.0)
        if c is not None:
            raw_confidences.append(float(c))

        # Operational confidence
        op = getattr(ev, "operational_confidence", None)
        if op is None and isinstance(ev, dict):
            op = ev.get("operational_confidence", None)
        if op is not None:
            op_confidences.append(float(op))
        elif c is not None:
            op_confidences.append(float(c))

        # Reliability
        rel = getattr(ev, "reliability", None)
        if rel is None and isinstance(ev, dict):
            rel = ev.get("reliability", None)
        if isinstance(rel, dict) and "score" in rel:
            reliabilities.append(float(rel["score"]))
        elif isinstance(rel, (int, float)):
            reliabilities.append(float(rel))

    max_raw = max(raw_confidences) if raw_confidences else 0.0
    max_op = max(op_confidences) if op_confidences else 0.0
    avg_op = sum(op_confidences) / len(op_confidences) if op_confidences else 0.0
    avg_rel = sum(reliabilities) / len(reliabilities) if reliabilities else 0.85

    return {
        "max_raw_confidence": max_raw,
        "max_operational_confidence": max_op,
        "average_operational_confidence": avg_op,
        "average_reliability": avg_rel,
    }


def aggregate_severity(events: List[Any]) -> str:
    """Returns the highest severity among all source observations."""
    highest_sev = "LOW"
    highest_val = 1

    for ev in events:
        s = getattr(ev, "severity", None)
        if s is None and isinstance(ev, dict):
            s = ev.get("severity", "LOW")
        s = str(s).upper()
        val = SEVERITY_ORDER.get(s, 1)
        if val > highest_val:
            highest_val = val
            highest_sev = s

    return highest_sev


def determine_freshness(
    last_observed_timestamp: float,
    current_time: float,
    config: Optional[EventCorrelationConfig] = None
) -> CorrelationFreshness:
    """Computes freshness based on time elapsed since the most recent observation."""
    cfg = config or DEFAULT_CORRELATION_CONFIG
    elapsed_hours = max(0.0, (current_time - last_observed_timestamp) / 3600.0)

    if elapsed_hours <= cfg.fresh_hours:
        return CorrelationFreshness.FRESH
    elif elapsed_hours <= cfg.aging_hours:
        return CorrelationFreshness.AGING
    else:
        return CorrelationFreshness.STALE


def determine_status(
    last_observed_timestamp: float,
    current_time: float,
    explicit_resolved: bool = False,
    config: Optional[EventCorrelationConfig] = None
) -> CorrelationStatus:
    """
    Determines the lifecycle status of the correlated condition.
    Does NOT mark road defects resolved unless explicit resolution workflow occurred.
    """
    if explicit_resolved:
        return CorrelationStatus.RESOLVED

    cfg = config or DEFAULT_CORRELATION_CONFIG
    elapsed_hours = max(0.0, (current_time - last_observed_timestamp) / 3600.0)

    if elapsed_hours <= cfg.fresh_hours:
        return CorrelationStatus.ACTIVE
    elif elapsed_hours <= cfg.aging_hours:
        return CorrelationStatus.AGING
    else:
        return CorrelationStatus.STALE
