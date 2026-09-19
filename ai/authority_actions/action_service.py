"""
Authority Action Service Layer.
Coordinates creation, state transitions, duplicate prevention, and testbed seed actions.
"""
import uuid
import time
from typing import Dict, List, Optional, Any, Tuple
from .models import (
    AuthorityAction,
    ActionHistoryEntry,
    AuthorityActionSummary,
    ActionType,
    ActionStatus,
    ActionPriority,
    TargetType,
)
from .action_store import AuthorityActionStore
from .priority import evaluate_action_priority
from .lifecycle import validate_transition, create_history_entry, InvalidStateTransitionError
from .explain import explain_action_rationale


class AuthorityActionService:
    def __init__(self, store: Optional[AuthorityActionStore] = None):
        self.store = store or AuthorityActionStore()
        self._ensure_seed_data()

    def create_action(
        self,
        target_id: str,
        target_type: str,
        event_type: str,
        title: str,
        description: str,
        severity: str = "HIGH",
        action_type: str = "INSPECT",
        assigned_team: Optional[str] = None,
        assigned_operator: Optional[str] = None,
        source_bus_ids: Optional[List[str]] = None,
        correlation_id: Optional[str] = None,
        review_id: Optional[str] = None,
        review_decision: Optional[str] = None,
        latitude: float = 18.5204,
        longitude: float = 73.8567,
        simulated_gps: bool = True,
        evidence_refs: Optional[List[str]] = None,
        operational_confidence: float = 0.80,
        reliability: float = 0.85,
        created_by: str = "operator-01",
        metadata: Optional[Dict[str, Any]] = None,
        allow_duplicate: bool = False,
    ) -> AuthorityAction:
        """
        Creates a new authority action. Prevents duplicate active actions on the same target.
        """
        if not allow_duplicate:
            existing = self.store.get_action_by_target(target_id, target_type)
            if existing:
                return existing

        now = time.time()
        action_id = f"ACT-{uuid.uuid4().hex[:8].upper()}"

        # Evaluate priority & explanations
        bus_list = source_bus_ids or ["PMP-BUS-001"]
        priority, priority_explanation = evaluate_action_priority(
            severity=severity,
            target_type=target_type,
            review_decision=review_decision,
            correlation_level="CONSENSUS" if len(bus_list) >= 3 else ("CORROBORATION" if len(bus_list) == 2 else None),
            independent_bus_count=len(bus_list),
            operational_confidence=operational_confidence,
            reliability=reliability,
            is_incident=(target_type == TargetType.INCIDENT.value),
        )

        explanations = explain_action_rationale(
            action_type=action_type,
            event_type=event_type,
            priority=priority.value,
            target_type=target_type,
            review_decision=review_decision,
            correlation_id=correlation_id,
            independent_buses=len(bus_list),
        )

        status = ActionStatus.ASSIGNED.value if assigned_team else ActionStatus.NEW.value
        assigned_at = now if assigned_team else None

        action = AuthorityAction(
            action_id=action_id,
            target_id=target_id,
            target_type=target_type,
            event_type=event_type,
            title=title,
            description=description,
            severity=severity.upper(),
            priority=priority.value,
            status=status,
            action_type=action_type.upper(),
            assigned_team=assigned_team,
            assigned_operator=assigned_operator,
            source_bus_ids=bus_list,
            correlation_id=correlation_id,
            review_id=review_id,
            latitude=latitude,
            longitude=longitude,
            simulated_gps=simulated_gps,
            evidence_refs=evidence_refs or [],
            created_at=now,
            assigned_at=assigned_at,
            due_at=now + 86400 * 3,  # 3-day SLA target
            created_by=created_by,
            updated_at=now,
            operational_confidence=operational_confidence,
            reliability=reliability,
            priority_explanation=priority_explanation,
            recommended_response=explanations["recommended_response"],
            metadata=metadata or {},
        )

        self.store.save_action(action)

        # Record creation audit
        init_history = create_history_entry(
            action_id=action_id,
            from_status="NONE",
            to_status=status,
            operator=created_by,
            notes=f"Action created with {priority.value} priority. {priority_explanation}",
        )
        self.store.add_history_entry(init_history)

        return action

    def assign_action(
        self,
        action_id: str,
        assigned_team: str,
        assigned_operator: Optional[str] = None,
        operator: str = "operator-01",
        notes: Optional[str] = None,
    ) -> AuthorityAction:
        action = self.store.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        now = time.time()
        # If NEW, transition to ASSIGNED; if already ASSIGNED/ACTIONED, update assignment
        if action.status == ActionStatus.NEW.value:
            validate_transition(action.status, ActionStatus.ASSIGNED.value)
            action.status = ActionStatus.ASSIGNED.value

        action.assigned_team = assigned_team
        action.assigned_operator = assigned_operator or "field-crew-01"
        action.assigned_at = now
        action.updated_at = now
        self.store.save_action(action)

        hist = create_history_entry(
            action_id=action_id,
            from_status=action.status,
            to_status=ActionStatus.ASSIGNED.value,
            operator=operator,
            notes=notes or f"Assigned to team: {assigned_team} (Operator: {action.assigned_operator})",
        )
        self.store.add_history_entry(hist)
        return action

    def mark_actioned(
        self,
        action_id: str,
        action_notes: str,
        operator: str = "operator-01",
    ) -> AuthorityAction:
        action = self.store.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        validate_transition(action.status, ActionStatus.ACTIONED.value)

        now = time.time()
        prev_status = action.status
        action.status = ActionStatus.ACTIONED.value
        action.action_notes = action_notes
        action.actioned_at = now
        action.updated_at = now
        self.store.save_action(action)

        hist = create_history_entry(
            action_id=action_id,
            from_status=prev_status,
            to_status=ActionStatus.ACTIONED.value,
            operator=operator,
            notes=action_notes,
        )
        self.store.add_history_entry(hist)
        return action

    def mark_reobserve(
        self,
        action_id: str,
        notes: Optional[str] = None,
        operator: str = "operator-01",
    ) -> AuthorityAction:
        action = self.store.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        validate_transition(action.status, ActionStatus.REOBSERVE.value)

        now = time.time()
        prev_status = action.status
        action.status = ActionStatus.REOBSERVE.value
        action.reobserve_at = now
        action.updated_at = now
        self.store.save_action(action)

        hist = create_history_entry(
            action_id=action_id,
            from_status=prev_status,
            to_status=ActionStatus.REOBSERVE.value,
            operator=operator,
            notes=notes or "Transitioned to re-observation mode: scheduled for mobile fleet validation passes.",
        )
        self.store.add_history_entry(hist)
        return action

    def close_action(
        self,
        action_id: str,
        closure_notes: str,
        operator: str = "operator-01",
    ) -> AuthorityAction:
        action = self.store.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        validate_transition(action.status, ActionStatus.CLOSED.value)

        now = time.time()
        prev_status = action.status
        action.status = ActionStatus.CLOSED.value
        action.closure_notes = closure_notes
        action.closed_at = now
        action.updated_at = now
        self.store.save_action(action)

        hist = create_history_entry(
            action_id=action_id,
            from_status=prev_status,
            to_status=ActionStatus.CLOSED.value,
            operator=operator,
            notes=closure_notes,
        )
        self.store.add_history_entry(hist)
        return action

    def cancel_action(
        self,
        action_id: str,
        cancellation_reason: str,
        operator: str = "operator-01",
    ) -> AuthorityAction:
        action = self.store.get_action_by_id(action_id)
        if not action:
            raise ValueError(f"Action '{action_id}' not found.")

        validate_transition(action.status, ActionStatus.CANCELLED.value)

        now = time.time()
        prev_status = action.status
        action.status = ActionStatus.CANCELLED.value
        action.closure_notes = f"CANCELLED: {cancellation_reason}"
        action.closed_at = now
        action.updated_at = now
        self.store.save_action(action)

        hist = create_history_entry(
            action_id=action_id,
            from_status=prev_status,
            to_status=ActionStatus.CANCELLED.value,
            operator=operator,
            notes=f"Action cancelled: {cancellation_reason}",
        )
        self.store.add_history_entry(hist)
        return action

    def get_action(self, action_id: str) -> Optional[AuthorityAction]:
        return self.store.get_action_by_id(action_id)

    def get_action_history(self, action_id: str) -> List[ActionHistoryEntry]:
        return self.store.get_history_for_action(action_id)

    def query_queue(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        action_type: Optional[str] = None,
        target_type: Optional[str] = None,
        assigned_team: Optional[str] = None,
        bus_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AuthorityAction], int]:
        return self.store.query_actions(
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

    def get_summary(self) -> AuthorityActionSummary:
        return self.store.get_summary()

    def _ensure_seed_data(self) -> None:
        """
        Seeds deterministic testbed records if the store is empty.
        """
        actions, total = self.store.query_actions(page=1, page_size=5)
        if total > 0:
            return

        now = time.time()
        # Seed 1: Critical Pedestrian Safety Intervention (From Hotspot / Multi-bus consensus)
        self.create_action(
            target_id="PEDESTRIAN-HOTSPOT-001",
            target_type=TargetType.PEDESTRIAN_RISK.value,
            event_type="PEDESTRIAN_RISK",
            title="Pedestrian Crosswalk Safety Intervention — Karve Road",
            description="Recurring pedestrian proximity events flagged across 4 independent buses during evening peak.",
            severity="CRITICAL",
            action_type=ActionType.SAFETY_INTERVENTION.value,
            assigned_team="Public Safety",
            assigned_operator="safety-lead-01",
            source_bus_ids=["PMP-BUS-001", "PMP-BUS-004", "PMP-BUS-007", "PMP-BUS-011"],
            correlation_id="CORR-000004",
            review_id="REV-00002",
            review_decision="CONFIRMED",
            latitude=18.5089,
            longitude=73.8340,
            operational_confidence=0.84,
            reliability=0.88,
            created_by="system-evaluator",
        )

        # Seed 2: High-Priority Road Defect Patch (From Confirmed Pothole Review)
        self.create_action(
            target_id="EVT-2026-000101",
            target_type=TargetType.ROAD_DEFECT.value,
            event_type="ROAD_POTHOLE",
            title="Asphalt Defect Repair Dispatch — Karve Road Corridor",
            description="Severe road void observed and confirmed in human review. Multi-bus corroboration present.",
            severity="HIGH",
            action_type=ActionType.REPAIR.value,
            assigned_team="Road Maintenance",
            assigned_operator="maintenance-crew-02",
            source_bus_ids=["PMP-BUS-001", "PMP-BUS-007", "PMP-BUS-012"],
            correlation_id="CORR-000001",
            review_id="REV-00001",
            review_decision="CONFIRMED",
            latitude=18.5089,
            longitude=73.8340,
            evidence_refs=["assets/road-defects/pothole-real-01.jpg"],
            operational_confidence=0.82,
            reliability=0.91,
            created_by="system-evaluator",
        )

        # Seed 3: Traffic Control Intervention (From Correlated Congestion)
        self.create_action(
            target_id="CORR-000002",
            target_type=TargetType.CORRELATED_EVENT.value,
            event_type="TRAFFIC_CONGESTION",
            title="Swargate Junction Traffic Signal Parameter Optimization",
            description="Sustained queueing corroborated across 2 distinct bus lines at Swargate approach.",
            severity="HIGH",
            action_type=ActionType.TRAFFIC_CONTROL.value,
            assigned_team="Traffic Operations",
            assigned_operator="traffic-eng-01",
            source_bus_ids=["PMP-BUS-001", "PMP-BUS-004"],
            correlation_id="CORR-000002",
            latitude=18.5019,
            longitude=73.8581,
            operational_confidence=0.86,
            reliability=0.88,
            created_by="system-evaluator",
        )

        # Seed 4: Field Inspection for Reviewed Incident
        self.create_action(
            target_id="INC-2026-001",
            target_type=TargetType.INCIDENT.value,
            event_type="HIT_AND_RUN",
            title="On-Site Intersection Inspection — FC Road Proximity Event",
            description="Potential collision trajectory deviation under human review. Dispatch field audit unit.",
            severity="CRITICAL",
            action_type=ActionType.DISPATCH.value,
            assigned_team="Field Inspection",
            assigned_operator="inspector-03",
            source_bus_ids=["PMP-BUS-001"],
            latitude=18.5204,
            longitude=73.8567,
            evidence_refs=["assets/incidents/road-incident-real-01.jpg"],
            operational_confidence=0.84,
            reliability=0.90,
            created_by="system-evaluator",
        )

        # Seed 5: Re-observation action (completed repair awaiting mobile fleet pass)
        act5 = self.create_action(
            target_id="EVT-2026-000103",
            target_type=TargetType.ROAD_DEFECT.value,
            event_type="ROAD_CRACK",
            title="Shivajinagar Pavement Crack Sealing Re-Observation",
            description="Localized crack sealing completed. Scheduled for automated mobile fleet camera re-observation.",
            severity="MEDIUM",
            action_type=ActionType.REOBSERVE.value,
            assigned_team="Road Maintenance",
            assigned_operator="maintenance-crew-01",
            source_bus_ids=["PMP-BUS-003"],
            correlation_id="CORR-000003",
            review_id="REV-00005",
            review_decision="CONFIRMED",
            latitude=18.5284,
            longitude=73.8423,
            evidence_refs=["assets/road-defects/road-crack-real-01.jpg"],
            operational_confidence=0.68,
            reliability=0.85,
            created_by="system-evaluator",
        )
        # Advance act5 to ACTIONED then REOBSERVE
        try:
            self.mark_actioned(act5.action_id, "Crack seal completed by crew 01.", operator="maintenance-crew-01")
            self.mark_reobserve(act5.action_id, "Re-observation scheduled for next PMP-BUS-003 passes.", operator="operator-01")
        except Exception:
            pass


# Global singleton instance
_action_service_instance: Optional[AuthorityActionService] = None


def get_authority_action_service() -> AuthorityActionService:
    global _action_service_instance
    if _action_service_instance is None:
        _action_service_instance = AuthorityActionService()
    return _action_service_instance
