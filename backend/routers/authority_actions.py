"""
FastAPI Router for Authority Alert & Action Center.
Provides REST endpoints for authority response orchestration, state transitions, and audit tracking.
"""
from fastapi import APIRouter, HTTPException, Query, Body, status
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from ai.authority_actions import (
    get_authority_action_service,
    ActionType,
    ActionStatus,
    ActionPriority,
    TargetType,
    InvalidStateTransitionError,
)

router = APIRouter(
    prefix="/authority-actions",
    tags=["authority-actions"],
)


# Pydantic request models
class CreateActionRequest(BaseModel):
    target_id: str
    target_type: str
    event_type: str
    title: str
    description: str
    severity: str = "HIGH"
    action_type: str = "INSPECT"
    assigned_team: Optional[str] = None
    assigned_operator: Optional[str] = None
    source_bus_ids: Optional[List[str]] = None
    correlation_id: Optional[str] = None
    review_id: Optional[str] = None
    review_decision: Optional[str] = None
    latitude: float = 18.5204
    longitude: float = 73.8567
    simulated_gps: bool = True
    evidence_refs: Optional[List[str]] = None
    operational_confidence: float = 0.80
    reliability: float = 0.85
    created_by: str = "operator-01"
    metadata: Optional[Dict[str, Any]] = None
    allow_duplicate: bool = False


class AssignActionRequest(BaseModel):
    assigned_team: str
    assigned_operator: Optional[str] = None
    operator: str = "operator-01"
    notes: Optional[str] = None


class MarkActionedRequest(BaseModel):
    action_notes: str
    operator: str = "operator-01"


class ReobserveRequest(BaseModel):
    notes: Optional[str] = None
    operator: str = "operator-01"


class CloseActionRequest(BaseModel):
    closure_notes: str
    operator: str = "operator-01"


class CancelActionRequest(BaseModel):
    cancellation_reason: str
    operator: str = "operator-01"


@router.get("/summary")
def get_authority_actions_summary():
    """
    Returns high-level KPI metrics across open, assigned, actioned, reobserve, and closed actions.
    """
    service = get_authority_action_service()
    return service.get_summary().to_dict()


@router.get("/health")
def get_authority_actions_health():
    """
    Health check for authority actions SQLite storage.
    """
    service = get_authority_action_service()
    summary = service.get_summary()
    return {
        "status": "healthy",
        "db_exists": True,
        "total_actions": summary.total,
    }


@router.get("/queue")
def get_authority_actions_queue(
    status: Optional[str] = Query(None, description="Filter by status (NEW, ASSIGNED, ACTIONED, REOBSERVE, CLOSED, CANCELLED)"),
    priority: Optional[str] = Query(None, description="Filter by priority (CRITICAL, HIGH, MEDIUM, LOW)"),
    action_type: Optional[str] = Query(None, description="Filter by action type (INSPECT, REPAIR, TRAFFIC_CONTROL, etc.)"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    assigned_team: Optional[str] = Query(None, description="Filter by assigned team"),
    bus_id: Optional[str] = Query(None, description="Filter by contributing bus ID"),
    search: Optional[str] = Query(None, description="Free text search across action title, id, or target"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
):
    """
    Paginated queue of authority actions ordered by operational priority and status.
    """
    service = get_authority_action_service()
    items, total = service.query_queue(
        status=status,
        priority=priority,
        action_type=action_type,
        target_type=target_type,
        assigned_team=assigned_team,
        bus_id=bus_id,
        search=search,
        page=page,
        page_size=page_size,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return {
        "items": [item.to_dict() for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
    }


@router.get("/{action_id}")
def get_authority_action_detail(action_id: str):
    """
    Retrieves a single authority action record with full context and explanations.
    """
    service = get_authority_action_service()
    action = service.get_action(action_id)
    if not action:
        raise HTTPException(status_code=404, detail=f"Authority action '{action_id}' not found.")
    return action.to_dict()


@router.get("/{action_id}/history")
def get_authority_action_history(action_id: str):
    """
    Returns the immutable audit history entries for the specified authority action.
    """
    service = get_authority_action_service()
    action = service.get_action(action_id)
    if not action:
        raise HTTPException(status_code=404, detail=f"Authority action '{action_id}' not found.")
    history = service.get_action_history(action_id)
    return [h.to_dict() for h in history]


@router.post("", status_code=status.HTTP_201_CREATED)
def create_authority_action(req: CreateActionRequest):
    """
    Creates a new authority action from an existing actionable record.
    Prevents duplicate active actions unless allow_duplicate is explicitly True.
    """
    service = get_authority_action_service()
    action = service.create_action(
        target_id=req.target_id,
        target_type=req.target_type,
        event_type=req.event_type,
        title=req.title,
        description=req.description,
        severity=req.severity,
        action_type=req.action_type,
        assigned_team=req.assigned_team,
        assigned_operator=req.assigned_operator,
        source_bus_ids=req.source_bus_ids,
        correlation_id=req.correlation_id,
        review_id=req.review_id,
        review_decision=req.review_decision,
        latitude=req.latitude,
        longitude=req.longitude,
        simulated_gps=req.simulated_gps,
        evidence_refs=req.evidence_refs,
        operational_confidence=req.operational_confidence,
        reliability=req.reliability,
        created_by=req.created_by,
        metadata=req.metadata,
        allow_duplicate=req.allow_duplicate,
    )
    return action.to_dict()


@router.post("/{action_id}/assign")
def assign_authority_action(action_id: str, req: AssignActionRequest):
    """
    Assigns an authority action to a team/operator and transitions status to ASSIGNED.
    """
    service = get_authority_action_service()
    try:
        action = service.assign_action(
            action_id=action_id,
            assigned_team=req.assigned_team,
            assigned_operator=req.assigned_operator,
            operator=req.operator,
            notes=req.notes,
        )
        return action.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/action")
def mark_authority_action_actioned(action_id: str, req: MarkActionedRequest):
    """
    Marks an assigned action as ACTIONED with operator resolution notes.
    """
    service = get_authority_action_service()
    try:
        action = service.mark_actioned(
            action_id=action_id,
            action_notes=req.action_notes,
            operator=req.operator,
        )
        return action.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/reobserve")
def mark_authority_action_reobserve(action_id: str, req: ReobserveRequest):
    """
    Transitions an actioned task to REOBSERVE mode for automated fleet verification.
    """
    service = get_authority_action_service()
    try:
        action = service.mark_reobserve(
            action_id=action_id,
            notes=req.notes,
            operator=req.operator,
        )
        return action.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/close")
def close_authority_action(action_id: str, req: CloseActionRequest):
    """
    Closes an authority action with final verification notes.
    """
    service = get_authority_action_service()
    try:
        action = service.close_action(
            action_id=action_id,
            closure_notes=req.closure_notes,
            operator=req.operator,
        )
        return action.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{action_id}/cancel")
def cancel_authority_action(action_id: str, req: CancelActionRequest):
    """
    Cancels an authority action with cancellation justification.
    """
    service = get_authority_action_service()
    try:
        action = service.cancel_action(
            action_id=action_id,
            cancellation_reason=req.cancellation_reason,
            operator=req.operator,
        )
        return action.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except InvalidStateTransitionError as e:
        raise HTTPException(status_code=400, detail=str(e))
