"""
Lifecycle management and state transition rules for Authority Actions.
Enforces valid transitions and records audit history entries.
"""
import uuid
import time
from typing import Dict, List, Optional, Set, Tuple
from .models import ActionStatus, ActionHistoryEntry


# Allowed state transitions
VALID_TRANSITIONS: Dict[ActionStatus, Set[ActionStatus]] = {
    ActionStatus.NEW: {ActionStatus.ASSIGNED, ActionStatus.CANCELLED},
    ActionStatus.ASSIGNED: {ActionStatus.ACTIONED, ActionStatus.CANCELLED},
    ActionStatus.ACTIONED: {ActionStatus.REOBSERVE, ActionStatus.CLOSED, ActionStatus.CANCELLED},
    ActionStatus.REOBSERVE: {ActionStatus.CLOSED, ActionStatus.ACTIONED, ActionStatus.CANCELLED},
    ActionStatus.CLOSED: set(),  # Final state
    ActionStatus.CANCELLED: set(),  # Final state
}


class InvalidStateTransitionError(Exception):
    """Raised when an invalid state transition is requested."""
    pass


def validate_transition(from_status: str, to_status: str) -> None:
    """
    Validates if transitioning from `from_status` to `to_status` is legal.
    Raises InvalidStateTransitionError if illegal.
    """
    try:
        from_enum = ActionStatus(from_status)
        to_enum = ActionStatus(to_status)
    except ValueError as e:
        raise InvalidStateTransitionError(f"Unknown status: {e}")

    allowed = VALID_TRANSITIONS.get(from_enum, set())
    if to_enum not in allowed:
        raise InvalidStateTransitionError(
            f"Cannot transition authority action from '{from_status}' to '{to_status}'. "
            f"Allowed next states: {[s.value for s in allowed]}"
        )


def create_history_entry(
    action_id: str,
    from_status: str,
    to_status: str,
    operator: str,
    notes: Optional[str] = None,
) -> ActionHistoryEntry:
    """
    Creates an immutable audit history record for an action transition.
    """
    return ActionHistoryEntry(
        entry_id=f"HIST-{uuid.uuid4().hex[:8].upper()}",
        action_id=action_id,
        from_status=from_status,
        to_status=to_status,
        operator=operator or "operator-01",
        notes=notes,
        timestamp=time.time(),
    )
