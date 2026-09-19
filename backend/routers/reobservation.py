"""
FastAPI Router for Closed-Loop Re-Observation & Outcome Verification (Feature #8).
"""
from fastapi import APIRouter, HTTPException, Query, Body, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from ai.reobservation import (
    ReObservationService,
    OutcomeStatus,
    VerificationStatus,
    EvidenceSufficiency,
)

router = APIRouter(
    prefix="/reobservation",
    tags=["reobservation"],
)

_service_instance: Optional[ReObservationService] = None


def get_reobservation_service() -> ReObservationService:
    global _service_instance
    if _service_instance is None:
        _service_instance = ReObservationService()
    return _service_instance


# Pydantic Schemas
class CreateReObservationRequest(BaseModel):
    authority_action_id: str
    target_id: str
    target_type: str = "ROAD_DEFECT"
    original_event_id: Optional[str] = None
    original_correlation_id: Optional[str] = None
    source_bus_id: str = "PMP-BUS-007"
    source_bus_ids: Optional[List[str]] = None
    observation_timestamp: Optional[float] = None
    latitude: float = 18.5204
    longitude: float = 73.8567
    simulated_gps: bool = True
    evidence_refs: Optional[List[str]] = None
    raw_confidence: float = 0.85
    operational_confidence: float = 0.80
    reliability: float = 0.85
    observed_condition: str = "Pothole filled with asphalt patch"
    defect_count: Optional[int] = None
    severity: str = "LOW"
    before_observation: Optional[Dict[str, Any]] = None
    after_observation: Optional[Dict[str, Any]] = None
    created_by: str = "transit-operator-01"


class VerifyOutcomeRequest(BaseModel):
    operator: str = "operator-01"
    notes: str = "Verified outcome matches available observations."


class EscalateRequest(BaseModel):
    operator: str = "supervisor-01"
    escalation_notes: str = "Condition persistent after action; escalated for secondary inspection."


class RequestAnotherRequest(BaseModel):
    operator: str = "operator-01"
    notes: str = "Image clarity/angle insufficient; requesting additional transit pass."


@router.get("/summary")
def get_summary():
    """Returns high-level KPI metrics for outcome verification."""
    service = get_reobservation_service()
    summary = service.get_summary()
    return summary.to_dict()


@router.get("/health")
def get_health():
    """Healthcheck endpoint for re-observation database and service."""
    service = get_reobservation_service()
    summary = service.get_summary()
    return {
        "status": "healthy",
        "total_reobservations": summary.total_reobservations,
        "db_exists": True,
    }


@router.get("/queue")
def get_queue(
    outcome: Optional[str] = Query(None, description="Outcome filter: ALL, IMPROVED, UNCHANGED, WORSENED, INSUFFICIENT_DATA"),
    target_type: Optional[str] = Query(None, description="Target type filter"),
    authority_action_id: Optional[str] = Query(None, description="Linked authority action filter"),
    bus_id: Optional[str] = Query(None, description="Bus ID filter"),
    verification_status: Optional[str] = Query(None, description="Verification status filter"),
    search: Optional[str] = Query(None, description="Search query"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """Retrieves paginated and filtered re-observation queue."""
    service = get_reobservation_service()
    items, total = service.query_reobservations(
        outcome=outcome,
        target_type=target_type,
        authority_action_id=authority_action_id,
        bus_id=bus_id,
        verification_status=verification_status,
        search=search,
        page=page,
        page_size=page_size,
    )
    return {
        "items": [item.to_dict() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/compare/{authority_action_id}")
def compare_action(authority_action_id: str):
    """Returns before/after comparison preview or existing re-observation for an action."""
    service = get_reobservation_service()
    try:
        res = service.compare_authority_action(authority_action_id)
        return res
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{reobservation_id}/history")
def get_history(reobservation_id: str):
    """Retrieves immutable audit history timeline for a re-observation."""
    service = get_reobservation_service()
    reobs = service.get_reobservation(reobservation_id)
    if not reobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Re-observation '{reobservation_id}' not found.",
        )
    history = service.get_history(reobservation_id)
    return [h.to_dict() for h in history]


@router.get("/{reobservation_id}")
def get_reobservation_by_id(reobservation_id: str):
    """Retrieves a single re-observation record by ID."""
    service = get_reobservation_service()
    reobs = service.get_reobservation(reobservation_id)
    if not reobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Re-observation '{reobservation_id}' not found.",
        )
    return reobs.to_dict()


@router.post("", status_code=status.HTTP_201_CREATED)
def create_reobservation(req: CreateReObservationRequest):
    """Creates a new re-observation record and performs outcome verification."""
    service = get_reobservation_service()
    payload = req.dict(exclude_unset=True)
    reobs = service.create_reobservation(payload)
    return reobs.to_dict()


@router.post("/{reobservation_id}/verify")
def verify_outcome(reobservation_id: str, req: VerifyOutcomeRequest):
    """Records human verification of an outcome."""
    service = get_reobservation_service()
    try:
        updated = service.verify_outcome(
            reobservation_id=reobservation_id,
            operator=req.operator,
            notes=req.notes,
        )
        return updated.to_dict()
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{reobservation_id}/escalate")
def escalate_reobservation(reobservation_id: str, req: EscalateRequest):
    """Escalates an unchanged or worsened condition."""
    service = get_reobservation_service()
    try:
        result = service.escalate(
            reobservation_id=reobservation_id,
            operator=req.operator,
            escalation_notes=req.escalation_notes,
        )
        return result
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{reobservation_id}/request-another")
def request_another_observation(reobservation_id: str, req: RequestAnotherRequest):
    """Requests follow-up transit pass observation."""
    service = get_reobservation_service()
    try:
        updated = service.request_another_observation(
            reobservation_id=reobservation_id,
            operator=req.operator,
            notes=req.notes,
        )
        return updated.to_dict()
    except KeyError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
