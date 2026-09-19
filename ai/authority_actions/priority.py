"""
Deterministic priority calculation for Authority Actions.
Reuses existing severity, human review decisions, multi-bus correlation, and reliability factors.
"""
from typing import Dict, List, Optional, Tuple, Any
from .models import ActionPriority


def evaluate_action_priority(
    severity: str,
    target_type: str,
    review_decision: Optional[str] = None,
    correlation_level: Optional[str] = None,
    independent_bus_count: int = 1,
    operational_confidence: float = 0.80,
    reliability: float = 0.85,
    is_incident: bool = False,
    pedestrian_risk_score: Optional[float] = None,
) -> Tuple[ActionPriority, str]:
    """
    Computes an auditable priority level and explanation without inventing new ML models.
    """
    sev_upper = (severity or "MEDIUM").upper()
    reasons: List[str] = []

    score = 50.0  # baseline

    # Severity impact
    if sev_upper == "CRITICAL":
        score += 35.0
        reasons.append("Critical severity observation")
    elif sev_upper == "HIGH":
        score += 20.0
        reasons.append("High severity observation")
    elif sev_upper == "MEDIUM":
        score += 5.0
        reasons.append("Medium severity observation")
    else:
        score -= 10.0
        reasons.append("Low severity observation")

    # Human review decision
    if review_decision:
        dec_upper = review_decision.upper()
        if dec_upper == "CONFIRMED":
            score += 15.0
            reasons.append("Confirmed by human review operator")
        elif dec_upper == "LABEL_CORRECTED":
            score += 10.0
            reasons.append("Validated with corrected label by human reviewer")
        elif dec_upper == "NEEDS_REVIEW":
            score += 0.0
            reasons.append("Human review pending verification")
        elif dec_upper == "REJECTED":
            score -= 30.0
            reasons.append("Observation rejected in human review")

    # Multi-bus corroboration
    if independent_bus_count >= 3 or (correlation_level and "CONSENSUS" in correlation_level.upper()):
        score += 15.0
        reasons.append(f"High multi-bus consensus ({independent_bus_count} independent fleet units)")
    elif independent_bus_count >= 2 or (correlation_level and "CORROBORATION" in correlation_level.upper()):
        score += 8.0
        reasons.append(f"Corroborated by {independent_bus_count} independent buses")

    # Incidents
    if is_incident or target_type == "INCIDENT":
        score += 10.0
        reasons.append("Potential collision/incident trigger")

    # Pedestrian risk
    if pedestrian_risk_score is not None:
        if pedestrian_risk_score >= 75:
            score += 15.0
            reasons.append(f"High pedestrian risk score ({pedestrian_risk_score:.0f}/100)")
        elif pedestrian_risk_score >= 50:
            score += 5.0
            reasons.append(f"Moderate pedestrian risk score ({pedestrian_risk_score:.0f}/100)")

    # Confidence and reliability adjustments
    if operational_confidence >= 0.85 and reliability >= 0.85:
        score += 5.0
        reasons.append("High operational confidence & measurement reliability")
    elif operational_confidence < 0.60 or reliability < 0.60:
        score -= 10.0
        reasons.append("Lower visual quality / reliability scores")

    # Map score to priority
    if score >= 80:
        priority = ActionPriority.CRITICAL
    elif score >= 60:
        priority = ActionPriority.HIGH
    elif score >= 40:
        priority = ActionPriority.MEDIUM
    else:
        priority = ActionPriority.LOW

    explanation = (
        f"{priority.value} priority assigned: " + "; ".join(reasons) + "."
    )
    return priority, explanation
