"""
Auditable explanation generators for Authority Actions.
"""
from typing import Dict, Optional, Any
from .models import ActionType, ActionPriority


def explain_action_rationale(
    action_type: str,
    event_type: str,
    priority: str,
    target_type: str,
    review_decision: Optional[str] = None,
    correlation_id: Optional[str] = None,
    independent_buses: int = 1,
) -> Dict[str, str]:
    """
    Generates structured, human-readable explanations based on existing data.
    """
    # Why this action was created
    why_parts = []
    if target_type == "HUMAN_REVIEW":
        why_parts.append(f"Derived from human review verification (decision: {review_decision or 'CONFIRMED'})")
    elif target_type == "CORRELATED_EVENT":
        why_parts.append(f"Derived from multi-bus correlated event {correlation_id or ''} ({independent_buses} independent fleet passes)")
    elif target_type == "INCIDENT":
        why_parts.append("Triggered by potential collision or proximity incident requiring field review")
    elif target_type == "PEDESTRIAN_RISK":
        why_parts.append("Triggered by elevated pedestrian risk threshold at transit corridor")
    elif target_type == "ROAD_DEFECT":
        why_parts.append("Derived from recurring road surface defect observation")
    else:
        why_parts.append(f"Initiated for observed {event_type}")

    if independent_buses > 1:
        why_parts.append(f"Corroborated across {independent_buses} independent fleet buses")

    why_this_action = ". ".join(why_parts) + "."

    # Recommended response guidance
    recommendations = {
        ActionType.INSPECT.value: "Field inspection recommended to confirm structural pavement or physical asset condition on-site.",
        ActionType.REPAIR.value: "Dispatch routine municipal road maintenance crew for surface patching or localized crack sealing.",
        ActionType.TRAFFIC_CONTROL.value: "Adjust corridor signal timing parameters or evaluate temporary traffic warden management.",
        ActionType.SAFETY_INTERVENTION.value: "Evaluate pedestrian crosswalk markings, illumination enhancement, or traffic calming cushions.",
        ActionType.DISPATCH.value: "Alert field inspection unit to review potential traffic incident or corridor obstruction.",
        ActionType.REOBSERVE.value: "Schedule automated mobile fleet cameras on next service passes to verify post-intervention condition.",
    }

    recommended_response = recommendations.get(
        action_type,
        f"Proceed with {action_type} protocol under standard municipal decision support guidelines."
    )

    return {
        "why_this_action": why_this_action,
        "recommended_response": recommended_response,
    }
