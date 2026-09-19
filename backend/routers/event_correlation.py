"""
FastAPI router for Generic Multi-Bus Event Correlation (SIH 2026 PS 26124).
Exposes endpoints for correlated urban issues, independent-bus consensus metrics,
source-event audits, and on-demand recomputation.
"""
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.event_correlation import (
    EventCorrelator,
    CorrelatedEvent,
    CorrelationSummary,
    CorrelationLevel,
    CorrelationStatus,
    get_default_testbed_events,
)
from ai.events.models import UrbanEvent

router = APIRouter(prefix="/event-correlation", tags=["event-correlation"])

# Singleton engine instance
_correlator = EventCorrelator()

# In-memory store of source events & computed correlations
_SOURCE_EVENTS: List[UrbanEvent] = get_default_testbed_events()
_CORRELATED_CACHE: List[CorrelatedEvent] = _correlator.correlate(_SOURCE_EVENTS)


def _get_all_source_events() -> List[UrbanEvent]:
    """Gathers all available source events from live event store and seed testbed."""
    all_events = list(_SOURCE_EVENTS)
    try:
        try:
            from routers.events import LIVE_URBAN_EVENTS
        except ImportError:
            from backend.routers.events import LIVE_URBAN_EVENTS
        for lev in LIVE_URBAN_EVENTS:
            # Avoid duplicate IDs
            if not any(e.event_id == lev.event_id for e in all_events):
                all_events.append(lev)
    except Exception:
        pass
    return all_events


def _recompute_correlations() -> List[CorrelatedEvent]:
    """Recomputes correlation clusters from all available source events."""
    global _CORRELATED_CACHE
    all_sources = _get_all_source_events()
    _CORRELATED_CACHE = _correlator.correlate(all_sources)
    return _CORRELATED_CACHE


@router.get("/summary", summary="Retrieve Multi-Bus Event Correlation Summary")
def get_correlation_summary() -> Dict[str, Any]:
    """
    Returns aggregated correlation metrics:
    - total_correlated_events
    - single_bus_events
    - multi_bus_corroborated
    - multi_bus_consensus
    - average_independent_buses
    - active/aging/stale counts
    """
    correlations = _recompute_correlations()
    summary = _correlator.compute_summary(correlations)
    return summary.to_dict()


@router.get("/events", summary="List Correlated Events with Filtering")
def list_correlated_events(
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. ROAD_POTHOLE, TRAFFIC_CONGESTION)"),
    correlation_level: Optional[str] = Query(None, description="Filter by correlation level (SINGLE_BUS_OBSERVATION, MULTI_BUS_CORROBORATION, MULTI_BUS_CONSENSUS)"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, AGING, STALE, RESOLVED)"),
    bus_id: Optional[str] = Query(None, description="Filter by confirming bus ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
) -> List[Dict[str, Any]]:
    """Lists all correlated urban issues with optional multi-attribute filtering."""
    correlations = _recompute_correlations()
    filtered = _correlator.filter_correlated_events(
        correlations,
        event_type=event_type,
        correlation_level=correlation_level,
        status=status,
        bus_id=bus_id,
        severity=severity,
    )
    return [c.to_dict() for c in filtered]


@router.get("/events/{correlation_id}", summary="Retrieve Single Correlated Event")
def get_correlated_event_by_id(correlation_id: str) -> Dict[str, Any]:
    """Returns details for a specific correlation ID."""
    correlations = _recompute_correlations()
    target = next((c for c in correlations if c.correlation_id.upper() == correlation_id.upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Correlated event '{correlation_id}' not found")
    return target.to_dict()


@router.get("/source-events/{correlation_id}", summary="Audit Source Observations for a Correlated Event")
def get_source_events_for_correlation(correlation_id: str) -> Dict[str, Any]:
    """
    Returns the full list of original source events/observations that formed
    the specified correlation cluster.
    """
    correlations = _recompute_correlations()
    target = next((c for c in correlations if c.correlation_id.upper() == correlation_id.upper()), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Correlated event '{correlation_id}' not found")

    all_sources = _get_all_source_events()
    matched_sources = [
        s.to_dict() if hasattr(s, "to_dict") else s
        for s in all_sources
        if (s.event_id if hasattr(s, "event_id") else s.get("event_id")) in target.source_event_ids
    ]

    return {
        "correlation_id": target.correlation_id,
        "event_type": target.event_type,
        "correlation_level": target.correlation_level.value if isinstance(target.correlation_level, CorrelationLevel) else str(target.correlation_level),
        "independent_bus_count": target.independent_bus_count,
        "bus_ids": target.bus_ids,
        "observation_count": len(matched_sources),
        "source_events": matched_sources,
        "explanation": target.explanation,
    }


@router.post("/recompute", summary="Trigger On-Demand Correlation Clustering")
def trigger_recompute() -> Dict[str, Any]:
    """Forces recalculation of all correlation clusters across active sources."""
    correlations = _recompute_correlations()
    summary = _correlator.compute_summary(correlations)
    return {
        "status": "ok",
        "message": f"Successfully recomputed {len(correlations)} correlated event clusters.",
        "summary": summary.to_dict(),
    }


@router.get("/health", summary="Health Check for Event Correlation Service")
def get_correlation_health() -> Dict[str, Any]:
    """Returns engine health and active configuration."""
    return {
        "status": "healthy",
        "service": "event-correlation-engine",
        "spatial_radius_meters": _correlator.config.spatial_radius_meters,
        "temporal_windows_hours": _correlator.config.temporal_windows_hours,
        "active_correlations": len(_CORRELATED_CACHE),
    }
