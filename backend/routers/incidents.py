"""
Incident Intelligence API Router (Phase 6, SIH 2026 PS 26124).

Exposes endpoints for listing recent incidents, fetching incident details,
ingesting incident triggers, and updating status workflows.
"""
from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Dict, Any, Optional
import time

from ai.incidents.models import IncidentRecord, IncidentTrigger, IncidentType, IncidentStatus
from ai.incidents.config import IncidentConfig
from ai.incidents.incident_builder import IncidentBuilder
from ai.events.models import SeverityLevel
from data import INCIDENTS as LEGACY_INCIDENTS

router = APIRouter(prefix="/incidents", tags=["incidents"])

# In-memory store for Incident Records
_INCIDENT_BUILDER = IncidentBuilder()
_INCIDENT_STORE: List[IncidentRecord] = []


def _seed_demo_incidents():
    """Seeds initial deterministic demonstration incidents for UI & API testing."""
    if _INCIDENT_STORE:
        return

    # 1. Primary Demo Incident - Potential Hit-and-Run Suspect
    inc1 = _INCIDENT_BUILDER.build_demo_incident(
        incident_id="INC-DEMO-0001",
        bus_id="PMP-BUS-001",
        camera_id="CAM-FRONT-01",
        track_id=101,
        synthetic_plate="SYNTHETIC-DEMO",
    )
    inc1.status = IncidentStatus.NEW

    # 2. Secondary Demo Incident - Suspicious Proximity with Plate Not Readable
    trigger2 = IncidentTrigger(
        trigger_type=IncidentType.SUSPICIOUS_PROXIMITY,
        track_id=142,
        timestamp=time.time() - 900,
        frame_index=210,
        confidence=0.81,
        description="High-speed close proximity event near Shivajinagar Junction. Plate obscured / not readable.",
        proximity_distance_px=28.4,
        persistence_frames=8,
        metadata={"is_demo": True},
    )
    inc2 = _INCIDENT_BUILDER.build_from_trigger(
        trigger=trigger2,
        bus_id="PMP-BUS-002",
        camera_id="CAM-FRONT-01",
        vehicle_class="motorcycle",
        plate_text=None,  # Plate not readable - honest
        anpr_status="NOT_READABLE",
        image_path="evidence/demo_proximity_frame_210.jpg",
        video_path="ai/traffic/bus_video_test.mp4",
        is_demo=True,
        incident_id="INC-DEMO-0002",
    )
    inc2.status = IncidentStatus.REVIEW

    # 3. Tertiary Demo Incident - Sudden Trajectory Deviation
    trigger3 = IncidentTrigger(
        trigger_type=IncidentType.SUDDEN_DEVIATION,
        track_id=208,
        timestamp=time.time() - 1800,
        frame_index=350,
        confidence=0.74,
        description="Abrupt steering deviation (> 46.2°) on Kasarwadi corridor. Flagged for review.",
        trajectory_deviation=46.2,
        persistence_frames=14,
        metadata={"is_demo": True},
    )
    inc3 = _INCIDENT_BUILDER.build_from_trigger(
        trigger=trigger3,
        bus_id="PMP-BUS-001",
        camera_id="CAM-FRONT-01",
        vehicle_class="truck",
        plate_text="SYNTHETIC-MH-12",
        plate_confidence=0.82,
        anpr_status="SYNTHETIC_DEMO_FORMAT",
        image_path="evidence/demo_deviation_frame_350.jpg",
        video_path="ai/traffic/bus_video_test.mp4",
        is_demo=True,
        incident_id="INC-DEMO-0003",
    )
    inc3.status = IncidentStatus.ACTIONED

    _INCIDENT_STORE.extend([inc1, inc2, inc3])


_seed_demo_incidents()


@router.get("", response_model=List[Dict[str, Any]])
def list_incidents():
    """
    Legacy compatibility endpoint. Returns all incidents.
    """
    return [inc.to_dict() for inc in _INCIDENT_STORE] or LEGACY_INCIDENTS


@router.get("/recent", response_model=List[Dict[str, Any]])
def get_recent_incidents(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of incidents to return"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    status: Optional[str] = Query(None, description="Filter by status (NEW, REVIEW, ACTIONED, CLOSED)"),
):
    """
    Returns recent structured incident intelligence records.
    """
    results = list(_INCIDENT_STORE)

    if severity:
        sev_upper = severity.upper()
        if sev_upper not in [s.value for s in SeverityLevel]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid severity '{severity}'. Supported: {[s.value for s in SeverityLevel]}",
            )
        results = [inc for inc in results if inc.severity.value == sev_upper]

    if status:
        status_upper = status.upper()
        if status_upper not in [st.value for st in IncidentStatus]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{status}'. Supported: {[st.value for st in IncidentStatus]}",
            )
        results = [inc for inc in results if inc.status.value == status_upper]

    # Sort newest first
    results.sort(key=lambda x: x.timestamp, reverse=True)
    return [inc.to_dict() for inc in results[:limit]]


@router.get("/{incident_id}", response_model=Dict[str, Any])
def get_incident(incident_id: str):
    """
    Fetches details for a specific incident by ID.
    """
    for inc in _INCIDENT_STORE:
        if inc.incident_id.lower() == incident_id.lower():
            return inc.to_dict()

    # Legacy fallback
    for legacy in LEGACY_INCIDENTS:
        if legacy.get("id", "").lower() == incident_id.lower():
            return legacy

    raise HTTPException(status_code=404, detail=f"Incident with ID '{incident_id}' not found")


@router.post("/from-trigger", response_model=Dict[str, Any])
def create_incident_from_trigger(payload: Dict[str, Any] = Body(...)):
    """
    Constructs a structured IncidentRecord from an AI trigger payload.
    """
    try:
        raw_type = payload.get("trigger_type", "HIT_AND_RUN_SUSPECT")
        try:
            trigger_type = IncidentType(raw_type)
        except ValueError:
            trigger_type = IncidentType.HIT_AND_RUN_SUSPECT

        trigger = IncidentTrigger(
            trigger_type=trigger_type,
            track_id=payload.get("track_id"),
            timestamp=payload.get("timestamp_sec", time.time()),
            frame_index=payload.get("frame_index", 0),
            confidence=float(payload.get("confidence", 0.80)),
            description=payload.get("description", "Potential incident trigger detected"),
            trajectory_deviation=payload.get("trajectory_deviation"),
            proximity_distance_px=payload.get("proximity_distance_px"),
            persistence_frames=payload.get("persistence_frames", 1),
            metadata=payload.get("metadata", {}),
        )

        record = _INCIDENT_BUILDER.build_from_trigger(
            trigger=trigger,
            bus_id=payload.get("bus_id"),
            camera_id=payload.get("camera_id"),
            vehicle_class=payload.get("vehicle_class", "vehicle"),
            plate_text=payload.get("plate_text"),
            plate_confidence=payload.get("plate_confidence"),
            anpr_status=payload.get("anpr_status"),
            image_path=payload.get("image_path"),
            video_path=payload.get("video_path"),
            crop_path=payload.get("crop_path"),
            is_demo=payload.get("is_demo", False),
        )

        _INCIDENT_STORE.insert(0, record)
        return record.to_dict()

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create incident from trigger: {str(e)}")


@router.patch("/{incident_id}/status", response_model=Dict[str, Any])
def update_incident_status(incident_id: str, payload: Dict[str, Any] = Body(...)):
    """
    Updates the workflow status of an incident record (NEW -> REVIEW -> ACTIONED -> CLOSED).
    """
    new_status_str = payload.get("status", "").upper()
    if new_status_str not in [s.value for s in IncidentStatus]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{new_status_str}'. Allowed: {[s.value for s in IncidentStatus]}",
        )

    for inc in _INCIDENT_STORE:
        if inc.incident_id.lower() == incident_id.lower():
            inc.status = IncidentStatus(new_status_str)
            return inc.to_dict()

    raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found")
