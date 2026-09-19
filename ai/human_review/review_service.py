"""
Human Review Service orchestrates the review workflow, concurrency locks,
priority scoring, and testbed seed population.
"""
import datetime
import uuid
from typing import Any, Dict, List, Optional, Tuple

from ai.human_review.models import (
    ReviewRecord,
    FeedbackRecord,
    ReviewSummary,
    ReviewDecision,
    ReviewStatus,
    ReviewReason,
    ReviewTargetType,
)
from ai.human_review.config import HumanReviewConfig, DEFAULT_HUMAN_REVIEW_CONFIG
from ai.human_review.review_store import HumanReviewStore
from ai.human_review.feedback import create_feedback_record_from_review, compute_review_summary
from ai.events.models import UrbanEvent


def calculate_review_priority(
    severity: str,
    operational_confidence: Optional[float],
    config: Optional[HumanReviewConfig] = None,
) -> int:
    """
    Computes a deterministic priority score between 1 and 100.
    - Critical severity gets high weight.
    - Lower confidence / higher uncertainty gets prioritization bonus.
    """
    cfg = config or DEFAULT_HUMAN_REVIEW_CONFIG
    base_weight = cfg.severity_weights.get(str(severity).upper(), 20)

    # Uncertainty bonus: lower confidence -> higher priority
    conf = operational_confidence if operational_confidence is not None else 0.75
    uncertainty_fraction = max(0.0, min(1.0, 1.0 - conf))
    bonus = int(uncertainty_fraction * cfg.uncertainty_max_bonus)

    return max(1, min(100, base_weight + bonus + 10))


class HumanReviewService:
    """Core domain service for human-in-the-loop review operations."""

    def __init__(self, store: Optional[HumanReviewStore] = None, config: Optional[HumanReviewConfig] = None):
        self.config = config or DEFAULT_HUMAN_REVIEW_CONFIG
        self.store = store or HumanReviewStore(self.config.db_path)
        self._ensure_testbed_records()

    def enqueue_review(
        self,
        target_type: str,
        target_id: str,
        original_event_type: str,
        original_confidence: float,
        severity: str = "MEDIUM",
        event_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        original_operational_confidence: Optional[float] = None,
        original_reliability: Optional[float] = None,
        evidence_reference: Optional[str] = None,
        source_bus_id: str = "PMP-BUS-001",
        is_simulated: bool = True,
    ) -> ReviewRecord:
        """Enqueues an AI observation for human review with calculated priority."""
        existing = self.store.get_review_by_target(target_id)
        if existing:
            return existing

        review_id = f"REV-{uuid.uuid4().hex[:8].upper()}"
        priority = calculate_review_priority(severity, original_operational_confidence, self.config)

        record = ReviewRecord(
            review_id=review_id,
            target_type=target_type,
            target_id=target_id,
            event_id=event_id or (target_id if "EVT" in target_id else None),
            correlation_id=correlation_id,
            original_event_type=original_event_type,
            original_confidence=original_confidence,
            original_operational_confidence=original_operational_confidence,
            original_reliability=original_reliability,
            severity=severity,
            status=ReviewStatus.PENDING.value,
            evidence_reference=evidence_reference,
            source_bus_id=source_bus_id,
            is_simulated=is_simulated,
            priority_score=priority,
        )
        self.store.insert_review(record)
        return record

    def start_review(self, review_id: str, reviewer_id: str) -> Tuple[Optional[ReviewRecord], Optional[str]]:
        """
        Transitions a review item from PENDING to IN_REVIEW.
        Handles concurrent review conflicts.
        """
        record = self.store.get_review_by_id(review_id)
        if not record:
            return None, f"Review '{review_id}' not found."

        if record.status == ReviewStatus.IN_REVIEW.value:
            if record.reviewer_id and record.reviewer_id != reviewer_id:
                return None, f"Review is already being inspected by '{record.reviewer_id}'."

        record.status = ReviewStatus.IN_REVIEW.value
        record.reviewer_id = reviewer_id
        self.store.update_review(record)
        return record, None

    def submit_decision(
        self,
        review_id: str,
        decision: str,
        reviewer_id: str,
        reason: Optional[str] = None,
        corrected_event_type: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Tuple[Optional[ReviewRecord], Optional[str]]:
        """
        Records human decision (CONFIRMED, REJECTED, NEEDS_REVIEW, LABEL_CORRECTED).
        Maintains strict immutability of original AI event and creates a FeedbackRecord.
        """
        record = self.store.get_review_by_id(review_id)
        if not record:
            return None, f"Review '{review_id}' not found."

        dec_upper = decision.upper()
        if dec_upper not in [d.value for d in ReviewDecision]:
            return None, f"Invalid decision '{decision}'. Must be one of {[d.value for d in ReviewDecision]}."

        record.decision = dec_upper
        record.reviewer_id = reviewer_id
        record.reason = reason
        record.corrected_event_type = corrected_event_type
        record.notes = notes
        record.reviewed_at = datetime.datetime.now(datetime.timezone.utc).isoformat()

        if dec_upper in [ReviewDecision.CONFIRMED.value, ReviewDecision.REJECTED.value, ReviewDecision.LABEL_CORRECTED.value]:
            record.status = ReviewStatus.COMPLETED.value
            # Generate structured model feedback record
            feedback = create_feedback_record_from_review(
                review=record,
                reviewer_id=reviewer_id,
                decision=dec_upper,
                reason=reason,
                corrected_event_type=corrected_event_type,
                notes=notes,
            )
            self.store.insert_feedback(feedback)
        elif dec_upper == ReviewDecision.NEEDS_REVIEW.value:
            record.status = ReviewStatus.PENDING.value

        self.store.update_review(record)
        return record, None

    def get_summary(self) -> ReviewSummary:
        """Retrieves summary metrics for the review queue."""
        reviews, _ = self.store.query_reviews(limit=1000)
        return compute_review_summary(reviews)

    def _ensure_testbed_records(self):
        """Populates seed review items if database is freshly initialized."""
        existing, total = self.store.query_reviews(limit=1)
        if total > 0:
            return

        seed_items = [
            ReviewRecord(
                review_id="REV-000001",
                target_type="URBAN_EVENT",
                target_id="EVT-2026-CORR-001",
                event_id="EVT-2026-CORR-001",
                correlation_id="CORR-000001",
                original_event_type="ROAD_POTHOLE",
                original_confidence=0.88,
                original_operational_confidence=0.82,
                original_reliability=0.91,
                severity="HIGH",
                status=ReviewStatus.PENDING.value,
                evidence_reference="assets/road-defects/pothole-real-01.jpg",
                source_bus_id="PMP-BUS-001",
                is_simulated=True,
                priority_score=85,
            ),
            ReviewRecord(
                review_id="REV-000002",
                target_type="CORRELATED_EVENT",
                target_id="CORR-000001",
                correlation_id="CORR-000001",
                original_event_type="ROAD_POTHOLE",
                original_confidence=0.91,
                original_operational_confidence=0.85,
                original_reliability=0.89,
                severity="HIGH",
                status=ReviewStatus.PENDING.value,
                evidence_reference="assets/road-defects/pothole-real-01.jpg",
                source_bus_id="PMP-BUS-001",
                is_simulated=True,
                priority_score=88,
            ),
            ReviewRecord(
                review_id="REV-000003",
                target_type="URBAN_EVENT",
                target_id="EVT-2026-CORR-004",
                event_id="EVT-2026-CORR-004",
                correlation_id="CORR-000002",
                original_event_type="TRAFFIC_CONGESTION",
                original_confidence=0.92,
                original_operational_confidence=0.86,
                original_reliability=0.89,
                severity="HIGH",
                status=ReviewStatus.PENDING.value,
                source_bus_id="PMP-BUS-001",
                is_simulated=True,
                priority_score=75,
            ),
            ReviewRecord(
                review_id="REV-000004",
                target_type="URBAN_EVENT",
                target_id="EVT-2026-CORR-009",
                event_id="EVT-2026-CORR-009",
                correlation_id="CORR-000004",
                original_event_type="PEDESTRIAN_RISK",
                original_confidence=0.86,
                original_operational_confidence=0.80,
                original_reliability=0.88,
                severity="HIGH",
                status=ReviewStatus.PENDING.value,
                source_bus_id="PMP-BUS-001",
                is_simulated=True,
                priority_score=82,
            ),
            ReviewRecord(
                review_id="REV-000005",
                target_type="URBAN_EVENT",
                target_id="INC-DEMO-0001",
                event_id="INC-DEMO-0001",
                original_event_type="HIT_AND_RUN",
                original_confidence=0.88,
                original_operational_confidence=0.77,
                original_reliability=0.88,
                severity="CRITICAL",
                status=ReviewStatus.PENDING.value,
                source_bus_id="PMP-BUS-001",
                is_simulated=True,
                priority_score=95,
            ),
            ReviewRecord(
                review_id="REV-000006",
                target_type="URBAN_EVENT",
                target_id="EVT-2026-CORR-006",
                event_id="EVT-2026-CORR-006",
                correlation_id="CORR-000003",
                original_event_type="ROAD_CRACK",
                original_confidence=0.74,
                original_operational_confidence=0.68,
                original_reliability=0.85,
                severity="MEDIUM",
                decision="CONFIRMED",
                reviewer_id="operator-01",
                reason="TRUE_POSITIVE",
                notes="Longitudinal asphalt crack observed on FC Road inbound.",
                reviewed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                status=ReviewStatus.COMPLETED.value,
                evidence_reference="assets/road-defects/road-crack-real-01.jpg",
                source_bus_id="PMP-BUS-003",
                is_simulated=True,
                priority_score=60,
            ),
            ReviewRecord(
                review_id="REV-000007",
                target_type="URBAN_EVENT",
                target_id="EVT-2026-CORR-012",
                event_id="EVT-2026-CORR-012",
                original_event_type="ANPR_DETECTION",
                original_confidence=0.70,
                original_operational_confidence=0.62,
                original_reliability=0.68,
                severity="LOW",
                decision="REJECTED",
                reviewer_id="operator-01",
                reason="LOW_IMAGE_QUALITY",
                notes="Motion blur at night made plate characters indistinct.",
                reviewed_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
                status=ReviewStatus.COMPLETED.value,
                source_bus_id="PMP-BUS-001",
                is_simulated=True,
                priority_score=40,
            ),
        ]

        for item in seed_items:
            self.store.insert_review(item)
            if item.status == ReviewStatus.COMPLETED.value and item.decision:
                feedback = create_feedback_record_from_review(
                    review=item,
                    reviewer_id=item.reviewer_id or "operator-01",
                    decision=item.decision,
                    reason=item.reason,
                    corrected_event_type=item.corrected_event_type,
                    notes=item.notes,
                )
                self.store.insert_feedback(feedback)
