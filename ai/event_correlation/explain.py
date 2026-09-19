"""
Explanation Engine for Correlated Urban Events.
Generates human-readable, auditable summaries explaining WHY observations were correlated.
"""
from typing import Any, Dict, List
import datetime


def format_duration(seconds: float) -> str:
    """Formats duration in seconds into a clean human-readable string."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    if hours > 0:
        return f"{hours}h {minutes}m"
    elif minutes > 0:
        return f"{minutes} min"
    return f"{int(seconds)} sec"


def generate_correlation_explanation(
    event_type: str,
    independent_bus_count: int,
    observation_count: int,
    bus_ids: List[str],
    max_distance_meters: float,
    time_span_seconds: float,
    correlation_level_str: str,
) -> Dict[str, Any]:
    """
    Constructs an auditable explanation dictionary for the correlated issue.
    """
    # Summary statement
    if independent_bus_count >= 3:
        statement = f"Same {event_type.replace('_', ' ').lower()} condition independently observed by {independent_bus_count} distinct buses."
    elif independent_bus_count == 2:
        statement = f"Corroborating observations of {event_type.replace('_', ' ').lower()} recorded across 2 independent buses."
    elif independent_bus_count == 1:
        if observation_count > 1:
            statement = f"Repeated observations ({observation_count}x) of {event_type.replace('_', ' ').lower()} from a single bus ({bus_ids[0] if bus_ids else 'unknown'})."
        else:
            statement = f"Single-bus observation of {event_type.replace('_', ' ').lower()} awaiting multi-bus corroboration."
    else:
        statement = f"Insufficient observation data for {event_type}."

    pedestrian_note = None
    if "PEDESTRIAN" in event_type:
        pedestrian_note = "Pedestrian consensus corroboration provided by Pedestrian Risk Consensus Engine."

    incident_note = None
    if "INCIDENT" in event_type or "HIT_AND_RUN" in event_type:
        incident_note = "Requires human review. OCR observation validation only; no official RTO registry check."

    return {
        "event_type": event_type,
        "statement": statement,
        "spatial_proximity": f"{observation_count} observation{'s' if observation_count != 1 else ''} within {round(max_distance_meters, 1)} m",
        "temporal_window": f"{observation_count} observation{'s' if observation_count != 1 else ''} within {format_duration(time_span_seconds)}",
        "independent_bus_count": independent_bus_count,
        "observation_count": observation_count,
        "bus_ids": bus_ids,
        "correlation_level": correlation_level_str,
        "pedestrian_note": pedestrian_note,
        "incident_note": incident_note,
        "reasoning": [
            f"Event type match: {event_type}",
            f"Spatial clustering within {round(max_distance_meters, 1)}m radius",
            f"Temporal alignment across {format_duration(time_span_seconds)} span",
            f"Corroborated by {independent_bus_count} unique fleet unit{'s' if independent_bus_count != 1 else ''} ({', '.join(bus_ids)})",
        ],
    }
