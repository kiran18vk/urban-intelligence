"""
Auditable Explanation Generator for Re-Observation Outcomes (Feature #8).
"""
from typing import Dict, Any
from ai.reobservation.models import OutcomeStatus, EvidenceSufficiency, CorroborationLevel


class OutcomeExplainer:
    """
    Constructs auditable textual explanations and recommendations for re-observation outcomes.
    """

    @staticmethod
    def generate_explanation(
        outcome: OutcomeStatus,
        comparison: Dict[str, Any],
        sufficiency: EvidenceSufficiency,
        corroboration: CorroborationLevel,
        independent_bus_count: int,
        target_type: str,
    ) -> str:
        """
        Generates auditable 'Why this outcome?' statement.
        """
        dist_m = comparison.get("spatial_distance_m", 0.0)
        rel_pct = int(comparison.get("after_reliability", 0.85) * 100)
        b_def = comparison.get("before_defect_count")
        a_def = comparison.get("after_defect_count")

        if outcome == OutcomeStatus.IMPROVED:
            if b_def is not None and a_def is not None:
                return (
                    f"Original observation recorded {b_def} defect(s). Re-observation recorded {a_def} defect(s) "
                    f"within {dist_m:.0f} m. Observation reliability is {rel_pct}%. Evidence indicates condition improvement; "
                    "physical repair completion is an operational deduction requiring authority signoff."
                )
            else:
                return (
                    f"Re-observation within {dist_m:.0f} m shows reduced severity and diminished visual indicators "
                    f"with {rel_pct}% visual reliability. Corroborated across {independent_bus_count} bus(es)."
                )

        elif outcome == OutcomeStatus.UNCHANGED:
            if b_def is not None and a_def is not None:
                return (
                    f"Condition remains observable ({a_def} defects detected vs {b_def} originally) at {dist_m:.0f} m offset. "
                    f"Visual reliability is {rel_pct}%. Condition appears persistent after previous authority action."
                )
            else:
                return (
                    f"Condition indicators remain active with similar severity at {dist_m:.0f} m offset. "
                    f"Observed with {rel_pct}% visual reliability across {independent_bus_count} bus(es)."
                )

        elif outcome == OutcomeStatus.WORSENED:
            if b_def is not None and a_def is not None:
                return (
                    f"Defect count increased from {b_def} to {a_def} at {dist_m:.0f} m offset. "
                    f"Visual reliability is {rel_pct}%. Active deterioration detected requiring elevated priority."
                )
            else:
                return (
                    f"Severity elevated from {comparison.get('before_severity', 'MEDIUM')} to "
                    f"{comparison.get('after_severity', 'HIGH')} at {dist_m:.0f} m offset. "
                    f"Visual reliability is {rel_pct}%."
                )

        else:  # INSUFFICIENT_DATA
            if not comparison.get("spatial_match", True):
                return (
                    f"Re-observation coordinates are {dist_m:.0f} m away from original target "
                    f"(exceeds {comparison.get('spatial_threshold_m', 150):.0f} m corridor). Cannot verify outcome."
                )
            else:
                return (
                    f"Observation reliability ({rel_pct}%) or image clarity is insufficient for a defensible "
                    "outcome comparison. Additional transit pass-by observation is required."
                )

    @staticmethod
    def generate_recommended_action(
        outcome: OutcomeStatus,
        verification_score: float,
        target_type: str,
    ) -> str:
        """
        Generates recommended next step for authority workflow.
        """
        if outcome == OutcomeStatus.IMPROVED:
            return "Verify outcome and proceed toward defect resolution in the operational lifecycle."
        elif outcome == OutcomeStatus.UNCHANGED:
            return "Escalate authority action for secondary field inspection or scheduled contractor re-work."
        elif outcome == OutcomeStatus.WORSENED:
            return "Urgent escalation: Increase maintenance priority and alert supervisor for immediate intervention."
        else:
            return "Request another transit observation pass with improved camera exposure and spatial alignment."
