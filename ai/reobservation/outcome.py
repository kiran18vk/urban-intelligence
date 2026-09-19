"""
Outcome Determination Engine for Re-Observation (Feature #8).
"""
from typing import Dict, Any
from ai.reobservation.models import OutcomeStatus


class OutcomeEngine:
    """
    Evaluates comparison metrics to deterministically produce an outcome status.
    """

    @staticmethod
    def determine_outcome(
        comparison: Dict[str, Any],
        target_type: str,
        after_condition: str = "",
    ) -> OutcomeStatus:
        """
        Determines the outcome status based on comparison metrics and target type.
        """
        # 1. Check data sufficiency gates
        spatial_match = comparison.get("spatial_match", True)
        after_reliability = comparison.get("after_reliability", 0.85)

        # Insufficient data if location is outside verification corridor or image quality is too low
        if not spatial_match:
            return OutcomeStatus.INSUFFICIENT_DATA
        if after_reliability < 0.60:
            return OutcomeStatus.INSUFFICIENT_DATA

        cond_lower = after_condition.lower()
        if "insufficient" in cond_lower or "unclear" in cond_lower or "obscured" in cond_lower:
            return OutcomeStatus.INSUFFICIENT_DATA

        # 2. Defect Count evaluation (if available)
        defect_delta = comparison.get("defect_delta")
        if defect_delta is not None:
            if defect_delta < 0:
                return OutcomeStatus.IMPROVED
            elif defect_delta > 0:
                return OutcomeStatus.WORSENED
            # If defect delta is 0, check severity delta
            sev_delta = comparison.get("severity_delta", 0)
            if sev_delta < 0:
                return OutcomeStatus.IMPROVED
            elif sev_delta > 0:
                return OutcomeStatus.WORSENED
            return OutcomeStatus.UNCHANGED

        # 3. Severity-based evaluation
        sev_delta = comparison.get("severity_delta", 0)
        if sev_delta < 0:
            return OutcomeStatus.IMPROVED
        elif sev_delta > 0:
            return OutcomeStatus.WORSENED

        # 4. Textual / Condition heuristics
        if any(w in cond_lower for w in ["diminished", "cleared", "repaired", "reduced", "smooth", "improved"]):
            return OutcomeStatus.IMPROVED
        elif any(w in cond_lower for w in ["deteriorated", "expanded", "worsened", "increased", "severe", "new cracks"]):
            return OutcomeStatus.WORSENED

        return OutcomeStatus.UNCHANGED
