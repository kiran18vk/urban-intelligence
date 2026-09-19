"""
Data Models for Urban Digital Twin Layer (SIH 2026 PS 26124).

Prototype Urban Digital Twin for AI-Powered Mobile Sensing.
Maintains persistent representations of road segments, traffic zones, transit corridors,
and detected urban infrastructure assets.
"""

from dataclasses import dataclass, field, asdict
from enum import Enum
from typing import Dict, Any, List, Optional, Tuple


class FreshnessState(str, Enum):
    FRESH = "FRESH"      # Observed recently (e.g. <= 15 min)
    AGING = "AGING"      # Observed 15-60 min ago
    STALE = "STALE"      # No recent observation (> 60 min)


class ConditionState(str, Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    DEGRADED = "DEGRADED"
    CRITICAL = "CRITICAL"


class CongestionLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class AssetType(str, Enum):
    ROAD = "ROAD"
    TRAFFIC_SIGNAL = "TRAFFIC_SIGNAL"
    DIVIDER = "DIVIDER"
    ZEBRA_CROSSING = "ZEBRA_CROSSING"
    TRAFFIC_SIGN = "TRAFFIC_SIGN"
    STREETLIGHT = "STREETLIGHT"
    OTHER = "OTHER"


@dataclass
class RoadSegment:
    """Digital twin representation of a physical road segment in the testbed."""
    id: str
    name: str
    corridor_id: str
    coordinates: List[Tuple[float, float]]  # [(lat, lng), ...]
    condition_state: str = ConditionState.GOOD.value
    defect_count: int = 0
    latest_observation_id: Optional[str] = None
    latest_event_type: Optional[str] = None
    observation_confidence: float = 1.0
    operational_confidence: float = 1.0
    reliability_score: float = 1.0
    freshness: str = FreshnessState.FRESH.value
    last_updated: str = ""
    observation_source: str = "deterministic_simulation"
    is_simulated: bool = True
    priority_score: int = 45
    priority_level: str = "MEDIUM"
    deterioration_index: float = 3.2
    deterioration_trend: str = "SLOWLY_DETERIORATING"
    estimated_cost_inr: int = 15000
    cost_range_min_inr: int = 12000
    cost_range_max_inr: int = 19000
    lifecycle_counts: Dict[str, int] = field(default_factory=lambda: {
        "DETECTED": 1, "VERIFIED": 0, "PRIORITIZED": 0, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 0
    })

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TrafficZone:
    """Digital twin representation of a traffic corridor / zone."""
    id: str
    name: str
    center_coord: Tuple[float, float]
    radius_km: float = 1.0
    current_density: str = "LOW"
    congestion_level: str = CongestionLevel.LOW.value
    vehicle_count: int = 0
    average_observed_speed_kmh: float = 35.0
    estimated_delay_min: float = 0.0
    freshness: str = FreshnessState.FRESH.value
    last_updated: str = ""
    is_simulated: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TransitRouteTwin:
    """Digital twin route perspective aggregating bus telemetry & delay."""
    id: str
    route_name: str
    active_buses: int = 0
    total_buses: int = 0
    current_delay_min: float = 0.0
    congestion_exposure: str = "LOW"
    last_updated: str = ""
    is_simulated: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class UrbanAsset:
    """Detected physical infrastructure asset on the road network."""
    id: str
    asset_type: str  # from AssetType
    name: str
    location: Tuple[float, float]  # (lat, lng)
    condition: str = "GOOD"
    defect_count: int = 0
    confidence: float = 1.0
    operational_confidence: float = 1.0
    freshness: str = FreshnessState.FRESH.value
    last_inspected: str = ""
    is_simulated: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class TwinObservation:
    """Traceable observation linked to a digital twin entity."""
    observation_id: str
    entity_id: str
    entity_type: str  # "road", "traffic_zone", "asset", "incident"
    event_type: str
    timestamp: str
    gps: Dict[str, Any]
    raw_confidence: float
    operational_confidence: float
    reliability: Dict[str, Any] = field(default_factory=dict)
    source_bus: str = "PMP-BUS-001"
    source_camera: str = "CAM-FRONT-01"
    evidence_reference: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class StateTimelineEntry:
    """Historical/change-log entry for the Digital Twin."""
    timestamp: str
    title: str
    description: str
    entity_id: str
    event_type: str
    severity: str = "LOW"
    is_simulated: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class DigitalTwinSummary:
    """Top-level snapshot of the Urban Digital Twin."""
    generated_at: str
    data_source: str = "demo_simulation"
    testbed: str = "Pune Urban Mobility Testbed (PMPML)"
    disclaimer: str = (
        "Prototype Urban Digital Twin for Mobile Sensing. All road geometries, traffic states, "
        "and scenario projections are derived deterministically from fleet perception observations."
    )
    active_buses: int = 0
    roads_observed: int = 0
    active_defects: int = 0
    congested_zones: int = 0
    recent_incidents: int = 0
    observations_count: int = 0
    timeline: List[StateTimelineEntry] = field(default_factory=list)
    roads: List[RoadSegment] = field(default_factory=list)
    traffic_zones: List[TrafficZone] = field(default_factory=list)
    assets: List[UrbanAsset] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "generated_at": self.generated_at,
            "data_source": self.data_source,
            "testbed": self.testbed,
            "disclaimer": self.disclaimer,
            "active_buses": self.active_buses,
            "roads_observed": self.roads_observed,
            "active_defects": self.active_defects,
            "congested_zones": self.congested_zones,
            "recent_incidents": self.recent_incidents,
            "observations_count": self.observations_count,
            "timeline": [t.to_dict() if hasattr(t, "to_dict") else t for t in self.timeline],
            "roads": [r.to_dict() if hasattr(r, "to_dict") else r for r in self.roads],
            "traffic_zones": [z.to_dict() if hasattr(z, "to_dict") else z for z in self.traffic_zones],
            "assets": [a.to_dict() if hasattr(a, "to_dict") else a for a in self.assets],
        }


@dataclass
class SimulationResult:
    """Result of a What-If scenario projection."""
    scenario_type: str
    target_id: str
    target_name: str
    baseline_metrics: Dict[str, Any]
    simulated_metrics: Dict[str, Any]
    impact_summary: str
    delta: Dict[str, Any]
    formula_used: str
    disclaimer: str = "SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)
