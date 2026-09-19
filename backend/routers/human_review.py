"""
FastAPI router for Human-in-the-Loop Review and Model Feedback Workflow (SIH 2026 PS 26124).
Provides review queue management, decision submission, and structured feedback export.
"""
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query, status

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.human_review import (
    HumanReviewService,
    ReviewRecord,
    FeedbackRecord,
    ReviewSummary,
    ReviewDecision,
    ReviewStatus,
    ReviewReason,
    ReviewTargetType,
)

router = APIRouter(prefix="/reviews", tags=["human-review"])

# Singleton service instance
_review_service = HumanReviewService()


class StartReviewPayload(BaseModel):
    reviewer_id: str = "operator-01"


class DecisionPayload(BaseModel):
    decision: str
    reviewer_id: str = "operator-01"
    reason: Optional[str] = None
    corrected_event_type: Optional[str] = None
    notes: Optional[str] = None


class CreateReviewPayload(BaseModel):
    target_type: str = "URBAN_EVENT"
    target_id: str
    original_event_type: str
    original_confidence: float
    severity: str = "MEDIUM"
    event_id: Optional[str] = None
    correlation_id: Optional[str] = None
    original_operational_confidence: Optional[float] = None
    original_reliability: Optional[float] = None
    evidence_reference: Optional[str] = None
    source_bus_id: str = "PMP-BUS-001"
    is_simulated: bool = True


@router.get("/summary", summary="Retrieve Human Review Queue Summary and Metrics")
def get_review_summary() -> Dict[str, Any]:
    """
    Returns aggregated metrics:
    - total, pending, in_review, completed
    - confirmed, rejected, needs_review, label_corrected
    - confirmation_rate (among reviewed events)
    - top_rejection_reasons
    """
    summary = _review_service.get_summary()
    return summary.to_dict()


@router.get("/queue", summary="Query Human Review Queue with Filtering and Pagination")
def get_review_queue(
    status: Optional[str] = Query(None, description="Filter by status (PENDING, IN_REVIEW, COMPLETED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW)"),
    target_type: Optional[str] = Query(None, description="Filter by target type (URBAN_EVENT, CORRELATED_EVENT)"),
    decision: Optional[str] = Query(None, description="Filter by decision (CONFIRMED, REJECTED, NEEDS_REVIEW, LABEL_CORRECTED)"),
    event_type: Optional[str] = Query(None, description="Filter by original event type"),
    bus_id: Optional[str] = Query(None, description="Filter by source bus ID"),
    correlation_id: Optional[str] = Query(None, description="Filter by correlation ID"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
) -> Dict[str, Any]:
    """Returns paginated review items ordered by dynamic review priority."""
    offset = (page - 1) * page_size
    records, total = _review_service.store.query_reviews(
        status=status,
        severity=severity,
        target_type=target_type,
        decision=decision,
        event_type=event_type,
        bus_id=bus_id,
        correlation_id=correlation_id,
        limit=page_size,
        offset=offset,
    )
    return {
        "items": [r.to_dict() for r in records],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }


@router.get("/feedback", summary="Export Model Evaluation Feedback Records")
def get_feedback_records(
    decision: Optional[str] = Query(None, description="Filter by decision (CONFIRMED, REJECTED)"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    target_type: Optional[str] = Query(None, description="Filter by target type"),
    reviewer_id: Optional[str] = Query(None, description="Filter by reviewer ID"),
    limit: int = Query(100, ge=1, le=500, description="Limit records"),
    offset: int = Query(0, ge=0, description="Offset records"),
) -> Dict[str, Any]:
    """Returns structured feedback records for future offline model evaluation / retraining."""
    records, total = _review_service.store.query_feedback(
        decision=decision,
        event_type=event_type,
        target_type=target_type,
        reviewer_id=reviewer_id,
        limit=limit,
        offset=offset,
    )
    return {
        "feedback_records": [fb.to_dict() for fb in records],
        "total": total,
        "disclaimer": "Structured human feedback records for offline model evaluation. No automated retraining executed.",
    }


@router.get("/health", summary="Health Check for Human Review Service")
def get_review_health() -> Dict[str, Any]:
    """Returns review service health status and queue counts."""
    counts = _review_service.store.count_by_status()
    return {
        "status": "healthy",
        "service": "human-review-service",
        "db_path": str(_review_service.store.db_path),
        "queue_status_counts": counts,
    }


@router.get("/{review_id}", summary="Retrieve a Single Review Item by ID")
def get_review_item(review_id: str) -> Dict[str, Any]:
    """Returns full details for a specific review record."""
    record = _review_service.store.get_review_by_id(review_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Review '{review_id}' not found.")
    return record.to_dict()


@router.post("/{review_id}/start", summary="Start Reviewing Item (PENDING -> IN_REVIEW)")
def start_review(review_id: str, payload: StartReviewPayload) -> Dict[str, Any]:
    """Locks the review item for the given reviewer ID."""
    record, err = _review_service.start_review(review_id, reviewer_id=payload.reviewer_id)
    if err:
        raise HTTPException(status_code=409, detail=err)
    return {
        "status": "ok",
        "message": f"Review '{review_id}' is now IN_REVIEW by '{payload.reviewer_id}'.",
        "review": record.to_dict(),
    }


@router.post("/{review_id}/decision", summary="Submit Human Review Decision")
def submit_decision(review_id: str, payload: DecisionPayload) -> Dict[str, Any]:
    """
    Submits a final decision (CONFIRMED, REJECTED, NEEDS_REVIEW, LABEL_CORRECTED).
    Leaves the original AI observation completely immutable.
    """
    record, err = _review_service.submit_decision(
        review_id=review_id,
        decision=payload.decision,
        reviewer_id=payload.reviewer_id,
        reason=payload.reason,
        corrected_event_type=payload.corrected_event_type,
        notes=payload.notes,
    )
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {
        "status": "ok",
        "message": f"Review decision '{payload.decision}' successfully recorded.",
        "review": record.to_dict(),
    }


@router.post("", summary="Enqueue an AI Observation for Human Review")
def create_review(payload: CreateReviewPayload) -> Dict[str, Any]:
    """Enqueues a new item into the human review queue."""
    record = _review_service.enqueue_review(
        target_type=payload.target_type,
        target_id=payload.target_id,
        original_event_type=payload.original_event_type,
        original_confidence=payload.original_confidence,
        severity=payload.severity,
        event_id=payload.event_id,
        correlation_id=payload.correlation_id,
        original_operational_confidence=payload.original_operational_confidence,
        original_reliability=payload.original_reliability,
        evidence_reference=payload.evidence_reference,
        source_bus_id=payload.source_bus_id,
        is_simulated=payload.is_simulated,
    )
    return {
        "status": "ok",
        "message": f"Review '{record.review_id}' enqueued successfully.",
        "review": record.to_dict(),
    }

