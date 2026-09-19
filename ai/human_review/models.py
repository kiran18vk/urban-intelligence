"""
Domain models and Enums for Human Review and Model Feedback Workflow (SIH 2026 PS 26124).
Provides auditable separation between raw AI perception and human validation.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import datetime
import uuid


class ReviewDecision(str, Enum):
    """Decision submitted by the human reviewer."""
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"
    NEEDS_REVIEW = "NEEDS_REVIEW"
    LABEL_CORRECTED = "LABEL_CORRECTED"


class ReviewStatus(str, Enum):
    """Lifecycle state of the human review queue item."""
    PENDING = "PENDING"
    IN_REVIEW = "IN_REVIEW"
    COMPLETED = "COMPLETED"


class ReviewReason(str, Enum):
    """Structured categories explaining human decisions."""
    TRUE_POSITIVE = "TRUE_POSITIVE"
    FALSE_POSITIVE = "FALSE_POSITIVE"
    WRONG_EVENT_TYPE = "WRONG_EVENT_TYPE"
    LOW_IMAGE_QUALITY = "LOW_IMAGE_QUALITY"
    OCCLUSION = "OCCLUSION"
    DUPLICATE_EVENT = "DUPLICATE_EVENT"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    LOCATION_MISMATCH = "LOCATION_MISMATCH"
    TEMPORAL_MISMATCH = "TEMPORAL_MISMATCH"
    OTHER = "OTHER"


class ReviewTargetType(str, Enum):
    """Types of objects subject to human review."""
    URBAN_EVENT = "URBAN_EVENT"
    CORRELATED_EVENT = "CORRELATED_EVENT"
    ROAD_DAMAGE = "ROAD_DAMAGE"
    TRAFFIC_CONGESTION = "TRAFFIC_CONGESTION"
    PEDESTRIAN_RISK = "PEDESTRIAN_RISK"
    INCIDENT = "INCIDENT"
    ANPR = "ANPR"


@dataclass
class ReviewRecord:
    """
    Persistent Human Review Queue Item.
    Holds metadata and decision while preserving the immutable original AI observation.
    """
    review_id: str
    target_type: str
    target_id: str
    event_id: Optional[str] = None
    correlation_id: Optional[str] = None
    reviewer_id: Optional[str] = None
    decision: Optional[str] = None
    original_event_type: str = "ROAD_POTHOLE"
    corrected_event_type: Optional[str] = None
    original_confidence: float = 0.0
    original_operational_confidence: Optional[float] = None
    original_reliability: Optional[float] = None
    severity: str = "MEDIUM"
    reason: Optional[str] = None
    notes: Optional[str] = None
    reviewed_at: Optional[str] = None
    created_at: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    status: str = ReviewStatus.PENDING.value
    evidence_reference: Optional[str] = None
    source_bus_id: str = "PMP-BUS-001"
    is_simulated: bool = True
    priority_score: int = 50  # Dynamic review priority: 1 (lowest) to 100 (highest)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "review_id": self.review_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "event_id": self.event_id,
            "correlation_id": self.correlation_id,
            "reviewer_id": self.reviewer_id,
            "decision": self.decision,
            "original_event_type": self.original_event_type,
            "corrected_event_type": self.corrected_event_type,
            "original_confidence": round(self.original_confidence, 4),
            "original_operational_confidence": round(self.original_operational_confidence, 4) if self.original_operational_confidence is not None else None,
            "original_reliability": round(self.original_reliability, 4) if self.original_reliability is not None else None,
            "severity": self.severity,
            "reason": self.reason,
            "notes": self.notes,
            "reviewed_at": self.reviewed_at,
            "created_at": self.created_at,
            "status": self.status,
            "evidence_reference": self.evidence_reference,
            "source_bus_id": self.source_bus_id,
            "is_simulated": self.is_simulated,
            "priority_score": self.priority_score,
        }


@dataclass
class FeedbackRecord:
    """
    Structured Model Evaluation and Future Retraining Dataset Entry.
    Generated upon completion of a human review.
    """
    feedback_id: str
    review_id: str
    target_type: str
    target_id: str
    event_type: str
    original_confidence: float
    operational_confidence: Optional[float]
    reliability: Optional[float]
    decision: str
    reason: Optional[str]
    corrected_event_type: Optional[str]
    reviewer_id: str
    reviewed_at: str
    evidence_reference: Optional[str] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "feedback_id": self.feedback_id,
            "review_id": self.review_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "event_type": self.event_type,
            "original_confidence": round(self.original_confidence, 4),
            "operational_confidence": round(self.operational_confidence, 4) if self.operational_confidence is not None else None,
            "reliability": round(self.reliability, 4) if self.reliability is not None else None,
            "decision": self.decision,
            "reason": self.reason,
            "corrected_event_type": self.corrected_event_type,
            "reviewer_id": self.reviewer_id,
            "reviewed_at": self.reviewed_at,
            "evidence_reference": self.evidence_reference,
            "notes": self.notes,
        }


@dataclass
class ReviewSummary:
    """Summary metrics of the human review queue and confirmation rates."""
    total: int
    pending: int
    in_review: int
    completed: int
    confirmed: int
    rejected: int
    needs_review: int
    label_corrected: int
    confirmation_rate: float  # confirmed / completed (descriptive statistic)
    avg_conf_confirmed: float
    avg_conf_rejected: float
    avg_rel_confirmed: float
    avg_rel_rejected: float
    top_rejection_reasons: Dict[str, int] = field(default_factory=dict)
    event_type_breakdown: Dict[str, Dict[str, int]] = field(default_factory=dict)
    generated_at: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    disclaimer: str = (
        "Human confirmation rate represents reviewer assessments among reviewed items, "
        "not generalized AI model accuracy. Stored separately for offline evaluation."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "pending": self.pending,
            "in_review": self.in_review,
            "completed": self.completed,
            "confirmed": self.confirmed,
            "rejected": self.rejected,
            "needs_review": self.needs_review,
            "label_corrected": self.label_corrected,
            "confirmation_rate": round(self.confirmation_rate, 4),
            "avg_conf_confirmed": round(self.avg_conf_confirmed, 4),
            "avg_conf_rejected": round(self.avg_conf_rejected, 4),
            "avg_rel_confirmed": round(self.avg_rel_confirmed, 4),
            "avg_rel_rejected": round(self.avg_rel_rejected, 4),
            "top_rejection_reasons": self.top_rejection_reasons,
            "event_type_breakdown": self.event_type_breakdown,
            "generated_at": self.generated_at,
            "disclaimer": self.disclaimer,
        }
