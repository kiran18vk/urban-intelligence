"""
Data models for Pedestrian Risk Intelligence & Mitigation Engine (SIH 2026 PS 26124).

All models reflect prototype decision-support representations based on observed fleet perception indicators.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import time


class RiskLevel(str, Enum):
    LOW = "LOW"             # 0 - 24
    MODERATE = "MODERATE"   # 25 - 49
    HIGH = "HIGH"           # 50 - 74
    CRITICAL = "CRITICAL"   # 75 - 100


class TrendDirection(str, Enum):
    INCREASING = "INCREASING"
    STABLE = "STABLE"
    DECREASING = "DECREASING"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class DataSufficiency(str, Enum):
    GOOD = "GOOD"                 # >= 5 observations, >= 2 unique buses
    LIMITED = "LIMITED"           # 2 - 4 observations
    INSUFFICIENT = "INSUFFICIENT" # 1 observation


class ConsensusStatus(str, Enum):
    SINGLE_BUS_OBSERVATION = "SINGLE_BUS_OBSERVATION"       # 1 unique bus
    MULTI_BUS_CORROBORATION = "MULTI_BUS_CORROBORATION"     # 2 unique buses
    MULTI_BUS_CONSENSUS = "MULTI_BUS_CONSENSUS"             # >= 3 unique buses
    INSUFFICIENT = "INSUFFICIENT"                           # 0 buses / no valid observations


class MitigationScenarioType(str, Enum):
    CROSSING_IMPROVEMENT = "CROSSING_IMPROVEMENT"
    STREET_LIGHTING = "STREET_LIGHTING"
    TRAFFIC_CALMING = "TRAFFIC_CALMING"
    TARGETED_ENFORCEMENT = "TARGETED_ENFORCEMENT"
    COMBINED_INTERVENTION = "COMBINED_INTERVENTION"


@dataclass
class PedestrianRiskObservation:
    """Individual observation captured from fleet camera perception."""
    observation_id: str
    bus_id: str
    timestamp: float
    latitude: float
    longitude: float
    road_id: str
    road_name: str
    pedestrian_count: int
    vehicle_count: int
    traffic_density: str # LOW, MEDIUM, HIGH, CONGESTED
    proximity_events: int
    operational_reliability: float # 0.0 - 1.0 from Phase 5 evaluator
    lighting_condition: Optional[str] = "GOOD" # DAYLIGHT, LOW_LIGHT, NIGHT, NOT_OBSERVED
    visibility_score: Optional[float] = 0.90 # 0.0 - 1.0
    road_defect_present: bool = False
    infrastructure_observed: Optional[str] = "Not observed" # e.g. "Marked Crossing", "Not observed"
    is_simulated_gps: bool = True
    camera_id: str = "CAM-FRONT-01"
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "observation_id": self.observation_id,
            "bus_id": self.bus_id,
            "timestamp": self.timestamp,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "road_id": self.road_id,
            "road_name": self.road_name,
            "pedestrian_count": self.pedestrian_count,
            "vehicle_count": self.vehicle_count,
            "traffic_density": self.traffic_density,
            "proximity_events": self.proximity_events,
            "operational_reliability": self.operational_reliability,
            "lighting_condition": self.lighting_condition,
            "visibility_score": self.visibility_score,
            "road_defect_present": self.road_defect_present,
            "infrastructure_observed": self.infrastructure_observed,
            "is_simulated_gps": self.is_simulated_gps,
            "camera_id": self.camera_id,
            "notes": self.notes,
        }


@dataclass
class RiskFactorScore:
    name: str
    key: str
    score: float # 0 - 100
    weight: float # 0.0 - 1.0
    weighted_contribution: float # score * weight
    evidence_text: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "key": self.key,
            "score": round(self.score, 1),
            "weight": round(self.weight, 2),
            "weighted_contribution": round(self.weighted_contribution, 1),
            "evidence_text": self.evidence_text,
        }


@dataclass
class PedestrianRiskScore:
    """Composite explainable risk score (0-100) with factor breakdown."""
    score: int # 0 - 100
    risk_level: RiskLevel
    factor_scores: List[RiskFactorScore]
    explanation: List[str]
    operational_reliability: float
    data_sufficiency: DataSufficiency
    disclaimer: str = "Prototype risk score based on observed indicators"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": self.score,
            "risk_level": self.risk_level.value,
            "factor_scores": [f.to_dict() for f in self.factor_scores],
            "explanation": self.explanation,
            "operational_reliability": round(self.operational_reliability, 2),
            "data_sufficiency": self.data_sufficiency.value,
            "disclaimer": self.disclaimer,
        }


@dataclass
class MitigationRecommendation:
    priority: int
    title: str
    description: str
    rationale: str
    target_scenario: MitigationScenarioType
    estimated_score_reduction_points: int # Modelled points reduction
    requires_authority_review: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "priority": self.priority,
            "title": self.title,
            "description": self.description,
            "rationale": self.rationale,
            "target_scenario": self.target_scenario.value,
            "estimated_score_reduction_points": self.estimated_score_reduction_points,
            "requires_authority_review": self.requires_authority_review,
        }


@dataclass
class TimeRiskSlot:
    time_window: str # e.g. "06:00–09:00"
    average_risk_score: int
    risk_level: RiskLevel
    observation_count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "time_window": self.time_window,
            "average_risk_score": self.average_risk_score,
            "risk_level": self.risk_level.value,
            "observation_count": self.observation_count,
        }


@dataclass
class PedestrianHotspot:
    """Spatially & temporally correlated pedestrian risk hotspot with multi-bus consensus corroboration."""
    hotspot_id: str
    name: str
    road_id: str
    road_name: str
    latitude: float
    longitude: float
    observation_count: int
    unique_bus_count: int
    total_pedestrians_observed: int
    total_vehicles_observed: int
    total_proximity_events: int
    average_risk_score: int
    maximum_risk_score: int
    current_risk_score: int
    risk_level: RiskLevel
    operational_reliability: float
    data_sufficiency: DataSufficiency
    trend: TrendDirection
    trend_history: List[int] # Last 5-7 risk observations
    peak_period: str # e.g. "16:00–19:00" or "Insufficient observations for peak-period analysis."
    time_distribution: List[TimeRiskSlot]
    risk_factors: List[str] # Grounded "WHY THIS LOCATION IS FLAGGED"
    factor_breakdown: List[RiskFactorScore]
    recommendations: List[MitigationRecommendation]
    first_observed: float
    latest_observed: float
    freshness_seconds: int
    confirming_bus_ids: List[str] = field(default_factory=list)
    consensus_status: ConsensusStatus = ConsensusStatus.SINGLE_BUS_OBSERVATION
    consensus_strength: float = 0.33
    consensus_freshness: str = "FRESH"
    source: str = "TESTBED"
    is_simulated_gps: bool = True
    disclaimer: str = "Prototype risk score based on observed indicators"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hotspot_id": self.hotspot_id,
            "name": self.name,
            "road_id": self.road_id,
            "road_name": self.road_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "observation_count": self.observation_count,
            "unique_bus_count": self.unique_bus_count,
            "confirming_bus_ids": self.confirming_bus_ids,
            "consensus_status": self.consensus_status.value if isinstance(self.consensus_status, ConsensusStatus) else self.consensus_status,
            "consensus_strength": round(self.consensus_strength, 2),
            "consensus_freshness": self.consensus_freshness,
            "total_pedestrians_observed": self.total_pedestrians_observed,
            "total_vehicles_observed": self.total_vehicles_observed,
            "total_proximity_events": self.total_proximity_events,
            "average_risk_score": self.average_risk_score,
            "maximum_risk_score": self.maximum_risk_score,
            "current_risk_score": self.current_risk_score,
            "risk_level": self.risk_level.value,
            "operational_reliability": round(self.operational_reliability, 2),
            "data_sufficiency": self.data_sufficiency.value,
            "trend": self.trend.value,
            "trend_history": self.trend_history,
            "peak_period": self.peak_period,
            "time_distribution": [t.to_dict() for t in self.time_distribution],
            "risk_factors": self.risk_factors,
            "factor_breakdown": [f.to_dict() for f in self.factor_breakdown],
            "recommendations": [r.to_dict() for r in self.recommendations],
            "first_observed": self.first_observed,
            "latest_observed": self.latest_observed,
            "freshness_seconds": self.freshness_seconds,
            "source": self.source,
            "is_simulated_gps": self.is_simulated_gps,
            "disclaimer": self.disclaimer,
        }


@dataclass
class PedestrianWhatIfResult:
    hotspot_id: str
    scenario_type: str
    scenario_name: str
    baseline_score: int
    baseline_level: RiskLevel
    simulated_score: int
    simulated_level: RiskLevel
    score_delta: int
    factor_changes: Dict[str, Any]
    disclaimer: str = "Scenario estimate — decision support only"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hotspot_id": self.hotspot_id,
            "scenario_type": self.scenario_type,
            "scenario_name": self.scenario_name,
            "baseline_score": self.baseline_score,
            "baseline_level": self.baseline_level.value,
            "simulated_score": self.simulated_score,
            "simulated_level": self.simulated_level.value,
            "score_delta": self.score_delta,
            "factor_changes": self.factor_changes,
            "disclaimer": self.disclaimer,
        }


@dataclass
class PedestrianSummary:
    total_hotspots: int
    high_critical_count: int
    total_risk_observations: int
    average_risk_score: float
    peak_observed_period: str
    increasing_hotspots_count: int
    generated_at: str
    single_bus_count: int = 0
    multi_bus_corroborated_count: int = 0
    multi_bus_consensus_count: int = 0
    average_independent_buses: float = 1.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_hotspots": self.total_hotspots,
            "high_critical_count": self.high_critical_count,
            "total_risk_observations": self.total_risk_observations,
            "average_risk_score": round(self.average_risk_score, 1),
            "peak_observed_period": self.peak_observed_period,
            "increasing_hotspots_count": self.increasing_hotspots_count,
            "generated_at": self.generated_at,
            "single_bus_count": self.single_bus_count,
            "multi_bus_corroborated_count": self.multi_bus_corroborated_count,
            "multi_bus_consensus_count": self.multi_bus_consensus_count,
            "average_independent_buses": round(self.average_independent_buses, 1),
        }
