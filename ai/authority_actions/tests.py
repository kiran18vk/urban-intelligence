"""
Unit tests for the Authority Alert & Action Center.
"""
import unittest
import tempfile
import os
import shutil
import time

from .models import (
    AuthorityAction,
    ActionType,
    ActionStatus,
    ActionPriority,
    TargetType,
)
from .action_store import AuthorityActionStore
from .priority import evaluate_action_priority
from .lifecycle import validate_transition, InvalidStateTransitionError, create_history_entry
from .explain import explain_action_rationale
from .action_service import AuthorityActionService


class TestAuthorityActions(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.db_path = os.path.join(self.test_dir, "test_actions.db")
        self.store = AuthorityActionStore(self.db_path)
        self.service = AuthorityActionService(self.store)

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    def test_01_create_action(self):
        action = self.service.create_action(
            target_id="DEF-TEST-001",
            target_type=TargetType.ROAD_DEFECT.value,
            event_type="ROAD_POTHOLE",
            title="Test Road Pothole Repair",
            description="Severe road void on arterial lane.",
            severity="HIGH",
            action_type=ActionType.REPAIR.value,
            source_bus_ids=["PMP-BUS-001", "PMP-BUS-004"],
            created_by="operator-test",
        )
        self.assertIsNotNone(action.action_id)
        self.assertEqual(action.status, ActionStatus.NEW.value)
        self.assertEqual(action.target_id, "DEF-TEST-001")
        self.assertEqual(action.priority, ActionPriority.HIGH.value)
        self.assertEqual(len(action.source_bus_ids), 2)

    def test_02_priority_calculation(self):
        # Critical severity + confirmed review + multi-bus consensus = CRITICAL
        p1, exp1 = evaluate_action_priority(
            severity="CRITICAL",
            target_type="ROAD_DEFECT",
            review_decision="CONFIRMED",
            independent_bus_count=3,
            operational_confidence=0.88,
            reliability=0.92,
        )
        self.assertEqual(p1, ActionPriority.CRITICAL)
        self.assertIn("Critical", exp1)

        # Low severity + rejected review = LOW
        p2, exp2 = evaluate_action_priority(
            severity="LOW",
            target_type="ROAD_DEFECT",
            review_decision="REJECTED",
            independent_bus_count=1,
            operational_confidence=0.50,
            reliability=0.55,
        )
        self.assertEqual(p2, ActionPriority.LOW)
        self.assertIn("Low", exp2)

    def test_03_lifecycle_valid_transitions(self):
        # NEW -> ASSIGNED -> ACTIONED -> REOBSERVE -> CLOSED
        action = self.service.create_action(
            target_id="INC-TEST-001",
            target_type=TargetType.INCIDENT.value,
            event_type="HIT_AND_RUN",
            title="Test Collision Review",
            description="Vehicle departure interaction.",
            severity="CRITICAL",
            action_type=ActionType.DISPATCH.value,
        )
        self.assertEqual(action.status, ActionStatus.NEW.value)

        # 1. Assign
        assigned = self.service.assign_action(
            action.action_id,
            assigned_team="Field Inspection",
            assigned_operator="inspector-01",
            notes="Assigning field inspection unit",
        )
        self.assertEqual(assigned.status, ActionStatus.ASSIGNED.value)
        self.assertEqual(assigned.assigned_team, "Field Inspection")

        # 2. Mark Actioned
        actioned = self.service.mark_actioned(
            action.action_id,
            action_notes="Field unit arrived on scene; obstruction cleared.",
        )
        self.assertEqual(actioned.status, ActionStatus.ACTIONED.value)
        self.assertIsNotNone(actioned.actioned_at)

        # 3. Mark Reobserve
        reobserved = self.service.mark_reobserve(
            action.action_id,
            notes="Awaiting next bus pass-by verification.",
        )
        self.assertEqual(reobserved.status, ActionStatus.REOBSERVE.value)
        self.assertIsNotNone(reobserved.reobserve_at)

        # 4. Close
        closed = self.service.close_action(
            action.action_id,
            closure_notes="Mobile fleet pass confirmed clear corridor flow.",
        )
        self.assertEqual(closed.status, ActionStatus.CLOSED.value)
        self.assertIsNotNone(closed.closed_at)

    def test_04_invalid_transitions(self):
        # NEW cannot go directly to CLOSED
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition(ActionStatus.NEW.value, ActionStatus.CLOSED.value)

        # CLOSED cannot transition to any other status
        with self.assertRaises(InvalidStateTransitionError):
            validate_transition(ActionStatus.CLOSED.value, ActionStatus.NEW.value)

    def test_05_cancellation(self):
        action = self.service.create_action(
            target_id="CORR-TEST-001",
            target_type=TargetType.CORRELATED_EVENT.value,
            event_type="TRAFFIC_CONGESTION",
            title="Duplicate Traffic Alert",
            description="Correlated queueing event.",
            severity="MEDIUM",
            action_type=ActionType.TRAFFIC_CONTROL.value,
        )
        cancelled = self.service.cancel_action(
            action.action_id,
            cancellation_reason="Duplicate observation created in error.",
        )
        self.assertEqual(cancelled.status, ActionStatus.CANCELLED.value)

    def test_06_audit_history(self):
        action = self.service.create_action(
            target_id="PED-TEST-001",
            target_type=TargetType.PEDESTRIAN_RISK.value,
            event_type="PEDESTRIAN_RISK",
            title="Pedestrian Zone Crosswalk Intervention",
            description="Recurring close interactions.",
            severity="HIGH",
            action_type=ActionType.SAFETY_INTERVENTION.value,
        )
        self.service.assign_action(action.action_id, "Public Safety", "safety-officer-01")
        self.service.mark_actioned(action.action_id, "Temporary crosswalk delineators installed.")

        history = self.service.get_action_history(action.action_id)
        # Should have at least 3 entries: initial create, assigned, actioned
        self.assertGreaterEqual(len(history), 3)
        statuses = [h.to_status for h in history]
        self.assertIn(ActionStatus.NEW.value, statuses)
        self.assertIn(ActionStatus.ASSIGNED.value, statuses)
        self.assertIn(ActionStatus.ACTIONED.value, statuses)

    def test_07_duplicate_prevention(self):
        act1 = self.service.create_action(
            target_id="DEF-TEST-999",
            target_type=TargetType.ROAD_DEFECT.value,
            event_type="ROAD_POTHOLE",
            title="Pothole on FC Road",
            description="Pothole void.",
        )
        # Attempt to create duplicate for same target
        act2 = self.service.create_action(
            target_id="DEF-TEST-999",
            target_type=TargetType.ROAD_DEFECT.value,
            event_type="ROAD_POTHOLE",
            title="Duplicate Action Attempt",
            description="Pothole void duplicate.",
        )
        self.assertEqual(act1.action_id, act2.action_id)

    def test_08_queue_filtering_and_pagination(self):
        items, total = self.service.query_queue(page=1, page_size=10)
        self.assertGreaterEqual(total, 5)  # including seed data
        self.assertLessEqual(len(items), 10)

        # Filter by severity
        crit_items, crit_total = self.service.query_queue(priority="CRITICAL")
        for itm in crit_items:
            self.assertEqual(itm.priority, "CRITICAL")

    def test_09_summary_metrics(self):
        summary = self.service.get_summary()
        self.assertGreaterEqual(summary.total, 5)
        self.assertGreaterEqual(summary.open_count, 1)
        self.assertIn("Prototype authority workflow", summary.disclaimer)

    def test_10_explanations(self):
        expl = explain_action_rationale(
            action_type=ActionType.SAFETY_INTERVENTION.value,
            event_type="PEDESTRIAN_RISK",
            priority="CRITICAL",
            target_type="HUMAN_REVIEW",
            review_decision="CONFIRMED",
            independent_buses=4,
        )
        self.assertIn("human review verification", expl["why_this_action"])
        self.assertIn("crosswalk markings", expl["recommended_response"])

    def test_11_persistence(self):
        action = self.service.create_action(
            target_id="PERSIST-001",
            target_type="ROAD_DEFECT",
            event_type="ROAD_CRACK",
            title="Persistence Test",
            description="Checking SQLite storage survival.",
        )
        # Create a new store instance pointing to same db
        new_store = AuthorityActionStore(self.db_path)
        fetched = new_store.get_action_by_id(action.action_id)
        self.assertIsNotNone(fetched)
        self.assertEqual(fetched.title, "Persistence Test")


if __name__ == "__main__":
    unittest.main()
