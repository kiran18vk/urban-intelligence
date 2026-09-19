"""
Fleet & Traffic Intelligence Analytics Package (Phase 7, SIH 2026 PS 26124).
"""
from ai.analytics.models import (
    FleetMetrics,
    EventMetrics,
    VehicleClassDistribution,
    TrafficMetrics,
    CorridorMetric,
    ReliabilitySummary,
    AnalyticsSummary,
)
from ai.analytics.config import AnalyticsConfig, DEFAULT_CORRIDORS
from ai.analytics.aggregators import (
    aggregate_fleet_metrics,
    aggregate_event_metrics,
    aggregate_vehicle_distribution,
    aggregate_reliability_metrics,
)
from ai.analytics.route_metrics import aggregate_corridor_metrics
from ai.analytics.congestion import evaluate_congestion_level

__all__ = [
    "FleetMetrics",
    "EventMetrics",
    "VehicleClassDistribution",
    "TrafficMetrics",
    "CorridorMetric",
    "ReliabilitySummary",
    "AnalyticsSummary",
    "AnalyticsConfig",
    "DEFAULT_CORRIDORS",
    "aggregate_fleet_metrics",
    "aggregate_event_metrics",
    "aggregate_vehicle_distribution",
    "aggregate_reliability_metrics",
    "aggregate_corridor_metrics",
    "evaluate_congestion_level",
]
