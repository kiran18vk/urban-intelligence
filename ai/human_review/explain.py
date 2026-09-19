"""
Explanation generator for Human Review decisions.
"""
from typing import Any, Dict, Optional
from ai.human_review.models import ReviewRecord


def explain_review_decision(record: ReviewRecord) -> Dict[str, Any]:
    """Provides an auditable explanation of the review status and decision."""
    decision_text = record.decision or "AWAITING_REVIEW"
    statement = f"Target {record.target_id} ({record.original_event_type}) is currently {record.status}."
    if record.decision:
        statement = f"Target {record.target_id} was marked {record.decision} by reviewer '{record.reviewer_id}' on {record.reviewed_at}."

    return {
        "review_id": record.review_id,
        "target_id": record.target_id,
        "original_event_type": record.original_event_type,
        "status": record.status,
        "decision": decision_text,
        "statement": statement,
        "reason": record.reason,
        "notes": record.notes,
        "original_ai_confidence": record.original_confidence,
        "operational_confidence": record.original_operational_confidence,
        "reliability": record.original_reliability,
        "immutability_guarantee": (
            "Original AI event confidence, severity, and observations remain immutable. "
            "Human decision is stored independently for evaluation dataset creation."
        ),
    }
