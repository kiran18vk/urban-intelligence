"""
Feedback Generation and Analytics Calculator for Human-in-the-Loop Reviews.
Computes descriptive statistics (confirmation rate, average confidences, rejection reasons).
"""
import uuid
import datetime
from typing import Any, Dict, List, Optional

from ai.human_review.models import ReviewRecord, FeedbackRecord, ReviewSummary, ReviewDecision, ReviewStatus


def create_feedback_record_from_review(
    review: ReviewRecord,
    reviewer_id: str,
    decision: str,
    reason: Optional[str] = None,
    corrected_event_type: Optional[str] = None,
    notes: Optional[str] = None,
) -> FeedbackRecord:
    """Creates a structured feedback record from a completed review."""
    return FeedbackRecord(
        feedback_id=f"FEEDBACK-{uuid.uuid4().hex[:8].upper()}",
        review_id=review.review_id,
        target_type=review.target_type,
        target_id=review.target_id,
        event_type=review.original_event_type,
        original_confidence=review.original_confidence,
        operational_confidence=review.original_operational_confidence,
        reliability=review.original_reliability,
        decision=decision,
        reason=reason,
        corrected_event_type=corrected_event_type,
        reviewer_id=reviewer_id,
        reviewed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        evidence_reference=review.evidence_reference,
        notes=notes,
    )


def compute_review_summary(reviews: List[ReviewRecord]) -> ReviewSummary:
    """
    Calculates summary metrics from a collection of reviews:
    - Total, Pending, In Review, Completed
    - Confirmed, Rejected, Needs Review, Label Corrected
    - Confirmation rate = Confirmed / Completed (descriptive statistic)
    - Average AI confidences & reliabilities grouped by decision
    - Rejection reasons breakdown
    """
    total = len(reviews)
    pending = 0
    in_review = 0
    completed = 0
    confirmed = 0
    rejected = 0
    needs_review = 0
    label_corrected = 0

    conf_confirmed: List[float] = []
    conf_rejected: List[float] = []
    rel_confirmed: List[float] = []
    rel_rejected: List[float] = []

    rejection_reasons: Dict[str, int] = {}
    event_type_breakdown: Dict[str, Dict[str, int]] = {}

    for r in reviews:
        # Status counts
        st = r.status.upper()
        if st == ReviewStatus.PENDING.value:
            pending += 1
        elif st == ReviewStatus.IN_REVIEW.value:
            in_review += 1
        elif st == ReviewStatus.COMPLETED.value:
            completed += 1

        # Event type tracking
        etype = r.original_event_type
        if etype not in event_type_breakdown:
            event_type_breakdown[etype] = {"confirmed": 0, "rejected": 0, "needs_review": 0, "total": 0}
        event_type_breakdown[etype]["total"] += 1

        # Decision counts
        dec = (r.decision or "").upper()
        if dec == ReviewDecision.CONFIRMED.value:
            confirmed += 1
            conf_confirmed.append(r.original_confidence)
            if r.original_reliability is not None:
                rel_confirmed.append(r.original_reliability)
            event_type_breakdown[etype]["confirmed"] += 1
        elif dec == ReviewDecision.REJECTED.value:
            rejected += 1
            conf_rejected.append(r.original_confidence)
            if r.original_reliability is not None:
                rel_rejected.append(r.original_reliability)
            event_type_breakdown[etype]["rejected"] += 1
            if r.reason:
                rejection_reasons[r.reason] = rejection_reasons.get(r.reason, 0) + 1
        elif dec == ReviewDecision.NEEDS_REVIEW.value:
            needs_review += 1
            event_type_breakdown[etype]["needs_review"] += 1
        elif dec == ReviewDecision.LABEL_CORRECTED.value:
            label_corrected += 1
            conf_confirmed.append(r.original_confidence)
            if r.original_reliability is not None:
                rel_confirmed.append(r.original_reliability)
            event_type_breakdown[etype]["confirmed"] += 1

    confirmation_rate = (confirmed / completed) if completed > 0 else 0.0
    avg_conf_conf = (sum(conf_confirmed) / len(conf_confirmed)) if conf_confirmed else 0.0
    avg_conf_rej = (sum(conf_rejected) / len(conf_rejected)) if conf_rejected else 0.0
    avg_rel_conf = (sum(rel_confirmed) / len(rel_confirmed)) if rel_confirmed else 0.85
    avg_rel_rej = (sum(rel_rejected) / len(rel_rejected)) if rel_rejected else 0.70

    return ReviewSummary(
        total=total,
        pending=pending,
        in_review=in_review,
        completed=completed,
        confirmed=confirmed,
        rejected=rejected,
        needs_review=needs_review,
        label_corrected=label_corrected,
        confirmation_rate=confirmation_rate,
        avg_conf_confirmed=avg_conf_conf,
        avg_conf_rejected=avg_conf_rej,
        avg_rel_confirmed=avg_rel_conf,
        avg_rel_rejected=avg_rel_rej,
        top_rejection_reasons=rejection_reasons,
        event_type_breakdown=event_type_breakdown,
    )
