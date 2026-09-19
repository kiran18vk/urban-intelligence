"""
Data models for Closed-Loop Re-Observation & Outcome Verification (Feature #8).
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
import time


class OutcomeStatus(str, Enum):
    IMPROVED = "IMPROVED"
    UNCHANGED = "UNCHANGED"
    WORSENED = "WORSENED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class VerificationStatus(str, Enum):
    PENDING_REOBSERVATION = "PENDING_REOBSERVATION"
    VERIFIED = "VERIFIED"
    ESCALATED = "ESCALATED"
    REQUIRES_REVIEW = "REQUIRES_REVIEW"


class EvidenceSufficiency(str, Enum):
    GOOD = "GOOD"
    LIMITED = "LIMITED"
    INSUFFICIENT = "INSUFFICIENT"


class CorroborationLevel(str, Enum):
    SINGLE_BUS_OBSERVATION = "SINGLE_BUS_OBSERVATION"
    MULTI_BUS_CORROBORATION = "MULTI_BUS_CORROBORATION"
    MULTI_BUS_CONSENSUS = "MULTI_BUS_CONSENSUS"


@dataclass
class ReObservationHistoryEntry:
    entry_id: str
    reobservation_id: str
    action_type: str  # e.g. "CREATED", "VERIFIED", "ESCALATED", "ANOTHER_REQUESTED"
    operator: str
    from_status: str
    to_status: str
    notes: Optional[str] = None
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "reobservation_id": self.reobservation_id,
            "action_type": self.action_type,
            "operator": self.operator,
            "from_status": self.from_status,
            "to_status": self.to_status,
            "notes": self.notes,
            "timestamp": self.timestamp,
        }


@dataclass
class ReObservation:
    reobservation_id: str
    authority_action_id: str
    target_id: str
    target_type: str  # ROAD_DEFECT, INCIDENT, PEDESTRIAN_RISK, TRAFFIC, CORRELATED_EVENT, URBAN_EVENT
    original_event_id: Optional[str] = None
    original_correlation_id: Optional[str] = None
    source_bus_id: str = "PMP-BUS-001"
    source_bus_ids: List[str] = field(default_factory=lambda: ["PMP-BUS-001"])
    observation_timestamp: float = field(default_factory=time.time)
    latitude: float = 18.5204
    longitude: float = 73.8567
    simulated_gps: bool = True
    evidence_refs: List[str] = field(default_factory=list)
    raw_confidence: float = 0.85
    operational_confidence: float = 0.80
    reliability: float = 0.85
    observed_condition: str = "Pothole depth diminished"
    defect_count: Optional[int] = None
    severity: str = "LOW"
    
    # Comparison and outcome fields
    outcome: str = OutcomeStatus.IMPROVED.value
    verification_status: str = VerificationStatus.VERIFIED.value
    verification_score: float = 85.0
    evidence_sufficiency: str = EvidenceSufficiency.GOOD.value
    spatial_distance_m: float = 24.5
    spatial_match: bool = True
    temporal_delta_hours: float = 48.0
    corroboration_level: str = CorroborationLevel.SINGLE_BUS_OBSERVATION.value
    independent_bus_count: int = 1
    
    # Audit trail and details
    explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    before_observation: Dict[str, Any] = field(default_factory=dict)
    after_observation: Dict[str, Any] = field(default_factory=dict)
    
    # Lifecycle notes
    verification_notes: Optional[str] = None
    escalation_notes: Optional[str] = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "reobservation_id": self.reobservation_id,
            "authority_action_id": self.authority_action_id,
            "target_id": self.target_id,
            "target_type": self.target_type,
            "original_event_id": self.original_event_id,
            "original_correlation_id": self.original_correlation_id,
            "source_bus_id": self.source_bus_id,
            "source_bus_ids": self.source_bus_ids,
            "observation_timestamp": self.observation_timestamp,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "simulated_gps": self.simulated_gps,
            "evidence_refs": self.evidence_refs,
            "raw_confidence": self.raw_confidence,
            "operational_confidence": self.operational_confidence,
            "reliability": self.reliability,
            "observed_condition": self.observed_condition,
            "defect_count": self.defect_count,
            "severity": self.severity,
            "outcome": self.outcome,
            "verification_status": self.verification_status,
            "verification_score": self.verification_score,
            "evidence_sufficiency": self.evidence_sufficiency,
            "spatial_distance_m": self.spatial_distance_m,
            "spatial_match": self.spatial_match,
            "temporal_delta_hours": self.temporal_delta_hours,
            "corroboration_level": self.corroboration_level,
            "independent_bus_count": self.independent_bus_count,
            "explanation": self.explanation,
            "recommended_action": self.recommended_action,
            "before_observation": self.before_observation,
            "after_observation": self.after_observation,
            "verification_notes": self.verification_notes,
            "escalation_notes": self.escalation_notes,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class ReObservationSummary:
    total_reobservations: int
    pending_reobservation: int
    verified_improved: int
    unchanged: int
    worsened: int
    insufficient_data: int
    escalated: int
    avg_verification_score: float
    outcomes_by_target: Dict[str, int] = field(default_factory=dict)
    outcomes_by_type: Dict[str, int] = field(default_factory=dict)
    disclaimer: str = (
        "Prototype closed-loop verification: outcomes compare available observations "
        "and do not independently verify physical repair completion."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_reobservations": self.total_reobservations,
            "pending_reobservation": self.pending_reobservation,
            "verified_improved": self.verified_improved,
            "unchanged": self.unchanged,
            "worsened": self.worsened,
            "insufficient_data": self.insufficient_data,
            "escalated": self.escalated,
            "avg_verification_score": self.avg_verification_score,
            "outcomes_by_target": self.outcomes_by_target,
            "outcomes_by_type": self.outcomes_by_type,
            "disclaimer": self.disclaimer,
        }
