"""
Data models for Fleet & Traffic Intelligence Analytics (Phase 7, SIH 2026 PS 26124).

Standardizes aggregated metrics across fleet operations, urban events,
traffic perception, vehicle classification, and corridor delays.
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional
import time


@dataclass
class FleetMetrics:
    """Aggregated fleet operational statistics."""
    total_buses: int = 0
    active_buses: int = 0
    reporting_buses: int = 0
    active_routes_count: int = 0
    fleet_utilization_pct: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_buses": self.total_buses,
            "active_buses": self.active_buses,
            "reporting_buses": self.reporting_buses,
            "active_routes_count": self.active_routes_count,
            "fleet_utilization_pct": round(self.fleet_utilization_pct, 1),
        }


@dataclass
class EventMetrics:
    """Aggregated urban sensing event counts."""
    total_events: int = 0
    road_defects: int = 0
    traffic_events: int = 0
    incidents: int = 0
    anpr_detections: int = 0
    high_critical_count: int = 0
    low_reliability_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_events": self.total_events,
            "road_defects": self.road_defects,
            "traffic_events": self.traffic_events,
            "incidents": self.incidents,
            "anpr_detections": self.anpr_detections,
            "high_critical_count": self.high_critical_count,
            "low_reliability_count": self.low_reliability_count,
        }


@dataclass
class VehicleClassDistribution:
    """Distribution for a single tracked vehicle class."""
    class_name: str
    count: int
    percentage: float

    def to_dict(self) -> Dict[str, Any]:
        return {
            "class_name": self.class_name,
            "count": self.count,
            "percentage": round(self.percentage, 1),
        }


@dataclass
class TrafficMetrics:
    """Aggregated traffic perception metrics."""
    total_vehicles_observed: int = 0
    vehicle_distribution: List[VehicleClassDistribution] = field(default_factory=list)
    average_density_level: str = "MEDIUM"
    peak_corridor: str = "FC Road Corridor"
    high_congestion_zones_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_vehicles_observed": self.total_vehicles_observed,
            "vehicle_distribution": [v.to_dict() for v in self.vehicle_distribution],
            "average_density_level": self.average_density_level,
            "peak_corridor": self.peak_corridor,
            "high_congestion_zones_count": self.high_congestion_zones_count,
        }


@dataclass
class CorridorMetric:
    """Corridor-level operational and congestion metrics."""
    corridor_id: str
    corridor_name: str
    event_count: int = 0
    road_defects: int = 0
    traffic_events: int = 0
    incidents: int = 0
    observed_congestion: str = "LOW"
    congestion_factor: float = 1.0
    baseline_transit_time_min: float = 20.0
    estimated_delay_min: float = 0.0
    low_reliability_count: int = 0
    average_reliability: float = 0.85
    is_demo_estimate: bool = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "corridor_id": self.corridor_id,
            "corridor_name": self.corridor_name,
            "event_count": self.event_count,
            "road_defects": self.road_defects,
            "traffic_events": self.traffic_events,
            "incidents": self.incidents,
            "observed_congestion": self.observed_congestion,
            "congestion_factor": round(self.congestion_factor, 2),
            "baseline_transit_time_min": round(self.baseline_transit_time_min, 1),
            "estimated_delay_min": round(self.estimated_delay_min, 1),
            "low_reliability_count": self.low_reliability_count,
            "average_reliability": round(self.average_reliability, 2),
            "is_demo_estimate": self.is_demo_estimate,
        }


@dataclass
class ReliabilitySummary:
    """Observation reliability aggregate statistics."""
    total_observations: int = 0
    low_reliability_count: int = 0
    average_reliability_score: float = 0.82
    high_severity_low_reliability_count: int = 0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_observations": self.total_observations,
            "low_reliability_count": self.low_reliability_count,
            "average_reliability_score": round(self.average_reliability_score, 2),
            "high_severity_low_reliability_count": self.high_severity_low_reliability_count,
        }


@dataclass
class AnalyticsSummary:
    """Complete analytics summary payload."""
    generated_at: str
    data_source: str  # "live_backend" | "demo_simulation" | "mixed"
    fleet: FleetMetrics
    events: EventMetrics
    traffic: TrafficMetrics
    corridors: List[CorridorMetric]
    reliability: ReliabilitySummary
    disclaimer: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "generated_at": self.generated_at,
            "data_source": self.data_source,
            "fleet": self.fleet.to_dict(),
            "events": self.events.to_dict(),
            "traffic": self.traffic.to_dict(),
            "corridors": [c.to_dict() for c in self.corridors],
            "reliability": self.reliability.to_dict(),
            "disclaimer": self.disclaimer,
        }
