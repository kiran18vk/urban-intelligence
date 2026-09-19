"""
Authority Alert & Action Center Package.
Provides auditable, human-in-the-loop authority response tracking and lifecycle management.
"""
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
from .action_service import AuthorityActionService, get_authority_action_service

__all__ = [
    "AuthorityAction",
    "ActionHistoryEntry",
    "AuthorityActionSummary",
    "ActionType",
    "ActionStatus",
    "ActionPriority",
    "TargetType",
    "AuthorityActionStore",
    "evaluate_action_priority",
    "validate_transition",
    "create_history_entry",
    "InvalidStateTransitionError",
    "explain_action_rationale",
    "AuthorityActionService",
    "get_authority_action_service",
]
