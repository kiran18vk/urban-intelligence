"""
Comprehensive Unit Tests for Human Review and Model Feedback Module.
Validates review lifecycle, concurrency handling, persistence, immutability,
feedback generation, and descriptive summary statistics.
"""
import unittest
import tempfile
import os
import shutil
from pathlib import Path

from ai.human_review.models import (
    ReviewRecord,
    ReviewDecision,
    ReviewStatus,
    ReviewReason,
)
from ai.human_review.config import HumanReviewConfig
from ai.human_review.review_store import HumanReviewStore
from ai.human_review.review_service import HumanReviewService, calculate_review_priority
from ai.human_review.feedback import compute_review_summary
from ai.human_review.explain import explain_review_decision


class TestHumanReviewModule(unittest.TestCase):
    """Test suite for human review service, SQLite store, and feedback generation."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_human_review.db")
        self.config = HumanReviewConfig(db_path=self.db_path)
        self.store = HumanReviewStore(self.db_path)
        self.service = HumanReviewService(store=self.store, config=self.config)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_enqueue_review_and_priority(self):
        record = self.service.enqueue_review(
            target_type="URBAN_EVENT",
            target_id="EVT-TEST-001",
            original_event_type="ROAD_POTHOLE",
            original_confidence=0.72,
            original_operational_confidence=0.61,
            original_reliability=0.81,
            severity="HIGH",
            source_bus_id="PMP-BUS-001",
        )
        self.assertIsNotNone(record.review_id)
        self.assertEqual(record.status, ReviewStatus.PENDING.value)
        self.assertGreaterEqual(record.priority_score, 40)

        # Query from store
        fetched = self.store.get_review_by_id(record.review_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.target_id, "EVT-TEST-001")
        self.assertEqual(fetched.original_confidence, 0.72)

    def test_start_review_transitions(self):
        record = self.service.enqueue_review(
            target_type="URBAN_EVENT",
            target_id="EVT-TEST-002",
            original_event_type="TRAFFIC_CONGESTION",
            original_confidence=0.85,
            severity="HIGH",
        )
        # Transition to IN_REVIEW
        updated, err = self.service.start_review(record.review_id, reviewer_id="operator-01")
        self.assertIsNone(err)
        self.assertEqual(updated.status, ReviewStatus.IN_REVIEW.value)
        self.assertEqual(updated.reviewer_id, "operator-01")

        # Second reviewer attempting to start should get conflict error
        _, conflict_err = self.service.start_review(record.review_id, reviewer_id="operator-02")
        self.assertIsNotNone(conflict_err)

    def test_submit_confirmed_decision(self):
        record = self.service.enqueue_review(
            target_type="URBAN_EVENT",
            target_id="EVT-TEST-003",
            original_event_type="ROAD_POTHOLE",
            original_confidence=0.88,
            original_operational_confidence=0.82,
            original_reliability=0.91,
            severity="HIGH",
        )
        self.service.start_review(record.review_id, reviewer_id="operator-01")
        completed, err = self.service.submit_decision(
            review_id=record.review_id,
            decision=ReviewDecision.CONFIRMED.value,
            reviewer_id="operator-01",
            reason=ReviewReason.TRUE_POSITIVE.value,
            notes="Clearly visible severe pothole.",
        )
        self.assertIsNone(err)
        self.assertEqual(completed.status, ReviewStatus.COMPLETED.value)
        self.assertEqual(completed.decision, ReviewDecision.CONFIRMED.value)

        # Verify feedback record was created
        feedback_list, total_fb = self.store.query_feedback()
        matched_fb = [fb for fb in feedback_list if fb.review_id == record.review_id]
        self.assertEqual(len(matched_fb), 1)
        self.assertEqual(matched_fb[0].decision, "CONFIRMED")
        self.assertEqual(matched_fb[0].reason, "TRUE_POSITIVE")

    def test_submit_rejected_decision(self):
        record = self.service.enqueue_review(
            target_type="URBAN_EVENT",
            target_id="EVT-TEST-004",
            original_event_type="ANPR_DETECTION",
            original_confidence=0.65,
            severity="LOW",
        )
        completed, err = self.service.submit_decision(
            review_id=record.review_id,
            decision=ReviewDecision.REJECTED.value,
            reviewer_id="operator-01",
            reason=ReviewReason.LOW_IMAGE_QUALITY.value,
            notes="Vehicle plate heavily occluded by dirt.",
        )
        self.assertIsNone(err)
        self.assertEqual(completed.status, ReviewStatus.COMPLETED.value)
        self.assertEqual(completed.decision, ReviewDecision.REJECTED.value)
        self.assertEqual(completed.reason, "LOW_IMAGE_QUALITY")

    def test_original_ai_immutability(self):
        # AI event confidence must NEVER be modified by a human review decision
        record = self.service.enqueue_review(
            target_type="URBAN_EVENT",
            target_id="EVT-TEST-005",
            original_event_type="ROAD_POTHOLE",
            original_confidence=0.72,
            severity="HIGH",
        )
        self.service.submit_decision(
            review_id=record.review_id,
            decision=ReviewDecision.CONFIRMED.value,
            reviewer_id="operator-01",
        )
        fetched = self.store.get_review_by_id(record.review_id)
        self.assertEqual(fetched.original_confidence, 0.72)
        self.assertEqual(fetched.original_event_type, "ROAD_POTHOLE")

    def test_correlated_event_review(self):
        record = self.service.enqueue_review(
            target_type="CORRELATED_EVENT",
            target_id="CORR-000001",
            correlation_id="CORR-000001",
            original_event_type="ROAD_POTHOLE",
            original_confidence=0.91,
            severity="HIGH",
            source_bus_id="PMP-BUS-001",
        )
        self.assertEqual(record.correlation_id, "CORR-000001")
        self.assertEqual(record.target_type, "CORRELATED_EVENT")

    def test_confirmation_rate_and_summary(self):
        # Create 3 reviews: 2 CONFIRMED, 1 REJECTED, 1 PENDING
        r1 = self.service.enqueue_review("URBAN_EVENT", "E1", "ROAD_POTHOLE", 0.90)
        r2 = self.service.enqueue_review("URBAN_EVENT", "E2", "ROAD_POTHOLE", 0.85)
        r3 = self.service.enqueue_review("URBAN_EVENT", "E3", "ROAD_POTHOLE", 0.60)
        r4 = self.service.enqueue_review("URBAN_EVENT", "E4", "ROAD_POTHOLE", 0.80)

        self.service.submit_decision(r1.review_id, ReviewDecision.CONFIRMED.value, "op1")
        self.service.submit_decision(r2.review_id, ReviewDecision.CONFIRMED.value, "op1")
        self.service.submit_decision(r3.review_id, ReviewDecision.REJECTED.value, "op1", reason="FALSE_POSITIVE")

        summary = self.service.get_summary()
        # Seed items + our newly created items
        self.assertGreaterEqual(summary.completed, 3)
        self.assertGreater(summary.confirmation_rate, 0.0)
        self.assertLessEqual(summary.confirmation_rate, 1.0)
        self.assertIn("FALSE_POSITIVE", summary.top_rejection_reasons)

    def test_explain_review_decision(self):
        record = self.service.enqueue_review("URBAN_EVENT", "E10", "ROAD_POTHOLE", 0.88)
        self.service.submit_decision(
            record.review_id,
            ReviewDecision.CONFIRMED.value,
            "operator-01",
            reason="TRUE_POSITIVE",
            notes="Valid detection.",
        )
        fetched = self.store.get_review_by_id(record.review_id)
        expl = explain_review_decision(fetched)
        self.assertIn("operator-01", expl["statement"])
        self.assertIn("immutable", expl["immutability_guarantee"].lower())


if __name__ == "__main__":
    unittest.main()
