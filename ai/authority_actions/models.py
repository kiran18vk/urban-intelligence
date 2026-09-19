"""
Data models for the Authority Alert & Action Center.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
import time


class ActionType(str, Enum):
    INSPECT = "INSPECT"
    REPAIR = "REPAIR"
    TRAFFIC_CONTROL = "TRAFFIC_CONTROL"
    SAFETY_INTERVENTION = "SAFETY_INTERVENTION"
    DISPATCH = "DISPATCH"
    REOBSERVE = "REOBSERVE"


class ActionStatus(str, Enum):
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    ACTIONED = "ACTIONED"
    REOBSERVE = "REOBSERVE"
    CLOSED = "CLOSED"
    CANCELLED = "CANCELLED"


class ActionPriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class TargetType(str, Enum):
    HUMAN_REVIEW = "HUMAN_REVIEW"
    INCIDENT = "INCIDENT"
    ROAD_DEFECT = "ROAD_DEFECT"
    PEDESTRIAN_RISK = "PEDESTRIAN_RISK"
    TRAFFIC = "TRAFFIC"
    CORRELATED_EVENT = "CORRELATED_EVENT"
    URBAN_EVENT = "URBAN_EVENT"


@dataclass
class ActionHistoryEntry:
    entry_id: str
    action_id: str
    from_status: str
    to_status: str
    operator: str
    notes: Optional[str] = None
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "action_id": self.action_id,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "operator": self.operator,
            "notes": self.notes,
            "timestamp": self.timestamp,
        }


@dataclass
class AuthorityAction:
    action_id: str
    target_id: str
    target_type: str
    event_type: str
    title: str
    description: str
    severity: str
    priority: str
    status: str
    action_type: str
    assigned_team: Optional[str] = None
    assigned_operator: Optional[str] = None
    source_bus_ids: List[str] = field(default_factory=list)
    correlation_id: Optional[str] = None
    review_id: Optional[str] = None
    latitude: float = 18.5204
    longitude: float = 73.8567
    simulated_gps: bool = True
    evidence_refs: List[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    assigned_at: Optional[float] = None
    actioned_at: Optional[float] = None
    reobserve_at: Optional[float] = None
    closed_at: Optional[float] = None
    due_at: Optional[float] = None
    action_notes: Optional[str] = None
    closure_notes: Optional[str] = None
    created_by: str = "system"
    updated_at: float = field(default_factory=time.time)
    operational_confidence: float = 0.80
    reliability: float = 0.85
    priority_explanation: Optional[str] = None
    recommended_response: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "action_id": self.action_id,
            "target_id": self.target_id,
            "target_type": self.target_type,
            "event_type": self.event_type,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "priority": self.priority,
            "status": self.status,
            "action_type": self.action_type,
            "assigned_team": self.assigned_team,
            "assigned_operator": self.assigned_operator,
            "source_bus_ids": self.source_bus_ids,
            "correlation_id": self.correlation_id,
            "review_id": self.review_id,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "simulated_gps": self.simulated_gps,
            "evidence_refs": self.evidence_refs,
            "created_at": self.created_at,
            "assigned_at": self.assigned_at,
            "actioned_at": self.actioned_at,
            "reobserve_at": self.reobserve_at,
            "closed_at": self.closed_at,
            "due_at": self.due_at,
            "action_notes": self.action_notes,
            "closure_notes": self.closure_notes,
            "created_by": self.created_by,
            "updated_at": self.updated_at,
            "operational_confidence": self.operational_confidence,
            "reliability": self.reliability,
            "priority_explanation": self.priority_explanation,
            "recommended_response": self.recommended_response,
            "metadata": self.metadata,
        }


@dataclass
class AuthorityActionSummary:
    total: int = 0
    open_count: int = 0
    critical_count: int = 0
    assigned_count: int = 0
    actioned_count: int = 0
    reobserve_count: int = 0
    closed_count: int = 0
    cancelled_count: int = 0
    by_type: Dict[str, int] = field(default_factory=dict)
    by_priority: Dict[str, int] = field(default_factory=dict)
    by_target_type: Dict[str, int] = field(default_factory=dict)
    by_assigned_team: Dict[str, int] = field(default_factory=dict)
    disclaimer: str = (
        "Prototype authority workflow: assignments and action states are simulated "
        "application records and are not connected to municipal dispatch systems."
    )
    generated_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total": self.total,
            "open_count": self.open_count,
            "critical_count": self.critical_count,
            "assigned_count": self.assigned_count,
            "actioned_count": self.actioned_count,
            "reobserve_count": self.reobserve_count,
            "closed_count": self.closed_count,
            "cancelled_count": self.cancelled_count,
            "by_type": self.by_type,
            "by_priority": self.by_priority,
            "by_target_type": self.by_target_type,
            "by_assigned_team": self.by_assigned_team,
            "disclaimer": self.disclaimer,
            "generated_at": self.generated_at,
        }
