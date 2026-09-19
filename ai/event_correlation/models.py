"""
Generic Multi-Bus Event Correlation Models.
Defines CorrelatedEvent, correlation levels, lifecycle status, and summary metrics.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import datetime


class CorrelationLevel(str, Enum):
    """Corroboration strength based on distinct, independent buses."""
    INSUFFICIENT = "INSUFFICIENT"
    SINGLE_BUS_OBSERVATION = "SINGLE_BUS_OBSERVATION"
    MULTI_BUS_CORROBORATION = "MULTI_BUS_CORROBORATION"
    MULTI_BUS_CONSENSUS = "MULTI_BUS_CONSENSUS"


class CorrelationStatus(str, Enum):
    """Lifecycle status of the correlated urban condition."""
    ACTIVE = "ACTIVE"
    AGING = "AGING"
    STALE = "STALE"
    RESOLVED = "RESOLVED"


class CorrelationFreshness(str, Enum):
    """Observation freshness state."""
    FRESH = "FRESH"
    AGING = "AGING"
    STALE = "STALE"


@dataclass
class CorrelatedEvent:
    """
    Standardized Correlated Urban Event.
    Represents an aggregated, deduplicated urban condition corroborated across
    independent bus observations.
    """
    correlation_id: str
    event_type: str
    canonical_location: Dict[str, Any]
    latitude: float
    longitude: float
    first_observed_at: str
    last_observed_at: str
    observation_count: int
    independent_bus_count: int
    bus_ids: List[str]
    source_event_ids: List[str]
    severity: str
    max_raw_confidence: float
    max_operational_confidence: float
    average_operational_confidence: float
    average_reliability: float
    correlation_strength: float
    correlation_level: CorrelationLevel
    freshness: str
    evidence_references: List[str]
    status: str
    explanation: Dict[str, Any]
    is_simulated: bool = True
    road_id: Optional[str] = None
    zone_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "correlation_id": self.correlation_id,
            "event_type": self.event_type,
            "canonical_location": self.canonical_location,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "first_observed_at": self.first_observed_at,
            "last_observed_at": self.last_observed_at,
            "observation_count": self.observation_count,
            "independent_bus_count": self.independent_bus_count,
            "bus_ids": self.bus_ids,
            "source_event_ids": self.source_event_ids,
            "severity": self.severity,
            "max_raw_confidence": round(self.max_raw_confidence, 4),
            "max_operational_confidence": round(self.max_operational_confidence, 4),
            "average_operational_confidence": round(self.average_operational_confidence, 4),
            "average_reliability": round(self.average_reliability, 4),
            "correlation_strength": round(self.correlation_strength, 2),
            "correlation_level": self.correlation_level.value if isinstance(self.correlation_level, CorrelationLevel) else str(self.correlation_level),
            "freshness": self.freshness,
            "evidence_references": self.evidence_references,
            "status": self.status,
            "explanation": self.explanation,
            "is_simulated": self.is_simulated,
            "road_id": self.road_id,
            "zone_id": self.zone_id,
        }


@dataclass
class CorrelationSummary:
    """Aggregated metrics across all correlated urban issues."""
    total_correlated_events: int
    single_bus_events: int
    multi_bus_corroborated: int
    multi_bus_consensus: int
    average_independent_buses: float
    active_correlations: int
    aging_correlations: int
    stale_correlations: int
    event_type_breakdown: Dict[str, int] = field(default_factory=dict)
    generated_at: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    disclaimer: str = (
        "Independent-bus corroboration represents multi-source observation consistency, "
        "not guaranteed physical ground-truth. Simulated GPS."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_correlated_events": self.total_correlated_events,
            "single_bus_events": self.single_bus_events,
            "multi_bus_corroborated": self.multi_bus_corroborated,
            "multi_bus_consensus": self.multi_bus_consensus,
            "average_independent_buses": round(self.average_independent_buses, 2),
            "active_correlations": self.active_correlations,
            "aging_correlations": self.aging_correlations,
            "stale_correlations": self.stale_correlations,
            "event_type_breakdown": self.event_type_breakdown,
            "generated_at": self.generated_at,
            "disclaimer": self.disclaimer,
        }
