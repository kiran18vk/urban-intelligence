"""
Persistence & Escalation Handler (Feature #8).
"""
from typing import Dict, Any, Optional
import time
from ai.reobservation.models import ReObservation, OutcomeStatus, VerificationStatus


class EscalationHandler:
    """
    Handles escalation workflows for unresolved or worsened conditions after re-observation.
    """

    @staticmethod
    def can_escalate(reobs: ReObservation) -> bool:
        """Determines if a re-observation record is eligible for escalation."""
        return reobs.outcome in (OutcomeStatus.UNCHANGED.value, OutcomeStatus.WORSENED.value)

    @staticmethod
    def process_escalation(
        reobs: ReObservation,
        operator: str,
        escalation_notes: str,
    ) -> Dict[str, Any]:
        """
        Executes escalation transition on the re-observation and prepares action updates.
        """
        if not EscalationHandler.can_escalate(reobs):
            raise ValueError(f"Cannot escalate re-observation with outcome '{reobs.outcome}'. Only UNCHANGED or WORSENED can be escalated.")

        reobs.verification_status = VerificationStatus.ESCALATED.value
        reobs.escalation_notes = escalation_notes
        reobs.updated_at = time.time()

        # Recommended escalation priority
        recommended_priority = "CRITICAL" if reobs.outcome == OutcomeStatus.WORSENED.value else "HIGH"

        return {
            "reobservation_id": reobs.reobservation_id,
            "authority_action_id": reobs.authority_action_id,
            "target_id": reobs.target_id,
            "status": VerificationStatus.ESCALATED.value,
            "recommended_priority": recommended_priority,
            "operator": operator,
            "notes": escalation_notes,
            "escalated_at": reobs.updated_at,
        }
