"""
Unit tests for Phase 7 Fleet & Traffic Intelligence Analytics.
"""
import pytest

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
from ai.events.models import UrbanEvent, EventType, SeverityLevel, GPSCoordinates, EventEvidence


def make_dummy_event(
    event_id: str,
    event_type: EventType,
    severity: SeverityLevel = SeverityLevel.MEDIUM,
    bus_id: str = "PMP-BUS-001",
    reliability_score: float = 0.85,
    notes: str = "Corridor test",
) -> UrbanEvent:
    return UrbanEvent(
        event_id=event_id,
        event_type=event_type,
        severity=severity,
        confidence=0.85,
        operational_confidence=0.85 * reliability_score,
        reliability={
            "score": reliability_score,
            "raw_confidence": 0.85,
            "operational_confidence": 0.85 * reliability_score,
            "factors": {"lighting": 0.90, "blur": 0.80},
            "unavailable_factors": ["camera_angle"],
            "reasons": ["Good lighting"],
            "is_measured": True,
        },
        bus_id=bus_id,
        camera_id="CAM-FRONT-01",
        timestamp=1789670000.0,
        gps=GPSCoordinates(18.5204, 73.8567, is_simulated=True),
        evidence=EventEvidence(),
        detection={"class_name": "vehicle"},
        notes=notes,
    )


class TestFleetAggregations:
    """Tests for fleet operational metrics."""

    def test_fleet_metrics_calculation(self):
        buses = [
            {"id": "BUS-01", "status": "active", "routeId": "R-101"},
            {"id": "BUS-02", "status": "active", "routeId": "R-101"},
            {"id": "BUS-03", "status": "inactive", "routeId": "R-102"},
            {"id": "BUS-04", "status": "active", "routeId": "R-103"},
        ]
        events = [
            make_dummy_event("E-1", EventType.ROAD_POTHOLE, bus_id="BUS-01"),
            make_dummy_event("E-2", EventType.ROAD_CRACK, bus_id="BUS-01"),
            make_dummy_event("E-3", EventType.TRAFFIC_CONGESTION, bus_id="BUS-02"),
        ]
        fleet = aggregate_fleet_metrics(buses, events)
        assert fleet.total_buses == 4
        assert fleet.active_buses == 3
        assert fleet.reporting_buses == 2
        assert fleet.active_routes_count == 3
        assert fleet.fleet_utilization_pct == 75.0

    def test_empty_fleet(self):
        fleet = aggregate_fleet_metrics([], [])
        assert fleet.total_buses == 0
        assert fleet.active_buses == 0
        assert fleet.fleet_utilization_pct == 0.0


class TestEventAggregations:
    """Tests for urban event metrics."""

    def test_event_metrics_categorization(self):
        events = [
            make_dummy_event("E-1", EventType.ROAD_POTHOLE, SeverityLevel.HIGH, reliability_score=0.90),
            make_dummy_event("E-2", EventType.ROAD_CRACK, SeverityLevel.MEDIUM, reliability_score=0.80),
            make_dummy_event("E-3", EventType.TRAFFIC_CONGESTION, SeverityLevel.HIGH, reliability_score=0.65),  # Low rel (< 0.70)
            make_dummy_event("E-4", EventType.HIT_AND_RUN, SeverityLevel.CRITICAL, reliability_score=0.88),
            make_dummy_event("E-5", EventType.ANPR_DETECTION, SeverityLevel.LOW, reliability_score=0.92),
        ]
        metrics = aggregate_event_metrics(events, low_reliability_threshold=0.70)
        assert metrics.total_events == 5
        assert metrics.road_defects == 2
        assert metrics.traffic_events == 1
        assert metrics.incidents == 1
        assert metrics.anpr_detections == 1
        assert metrics.high_critical_count == 3
        assert metrics.low_reliability_count == 1

    def test_empty_events(self):
        metrics = aggregate_event_metrics([])
        assert metrics.total_events == 0
        assert metrics.road_defects == 0


class TestVehicleClassDistribution:
    """Tests for vehicle distribution calculation."""

    def test_vehicle_distribution_percentages(self):
        detections = [
            {"class_name": "car"},
            {"class_name": "car"},
            {"class_name": "motorcycle"},
            {"class_name": "bus"},
        ]
        dist = aggregate_vehicle_distribution(detections)
        assert len(dist) == 3
        # Car = 2/4 = 50.0%
        car_item = next(d for d in dist if d.class_name == "Car")
        assert car_item.count == 2
        assert car_item.percentage == 50.0

        # Total sum of percentages is 100.0%
        total_pct = sum(d.percentage for d in dist)
        assert round(total_pct, 1) == 100.0

    def test_empty_vehicle_detections(self):
        dist = aggregate_vehicle_distribution([])
        assert len(dist) == 6
        assert all(d.count == 0 for d in dist)


class TestCorridorAndCongestionMetrics:
    """Tests for corridor analytics and congestion evaluations."""

    def test_corridor_delay_estimation_formula(self):
        events = [
            make_dummy_event("E-1", EventType.TRAFFIC_CONGESTION, notes="FC Road Corridor"),
            make_dummy_event("E-2", EventType.TRAFFIC_CONGESTION, notes="FC Road Corridor"),
            make_dummy_event("E-3", EventType.TRAFFIC_CONGESTION, notes="FC Road Corridor"),
        ]
        config = AnalyticsConfig()
        corridors = aggregate_corridor_metrics(events, [], config)
        assert len(corridors) == len(DEFAULT_CORRIDORS)
        
        # Check FC Road corridor
        fc_corr = next(c for c in corridors if "FC Road" in c.corridor_name)
        assert fc_corr.observed_congestion in ["MEDIUM", "HIGH"]
        # Delay formula: baseline * (factor - 1.0)
        expected_delay = fc_corr.baseline_transit_time_min * (fc_corr.congestion_factor - 1.0)
        assert abs(fc_corr.estimated_delay_min - expected_delay) < 0.01

    def test_evaluate_congestion_level(self):
        res_low = evaluate_congestion_level(5)
        assert res_low["congestion_level"] == "LOW"

        res_med = evaluate_congestion_level(15)
        assert res_med["congestion_level"] == "MEDIUM"

        res_high = evaluate_congestion_level(30)
        assert res_high["congestion_level"] == "HIGH"


class TestReliabilitySummary:
    """Tests for observation reliability aggregation."""

    def test_reliability_summary_calculation(self):
        events = [
            make_dummy_event("E-1", EventType.ROAD_POTHOLE, SeverityLevel.HIGH, reliability_score=0.90),
            make_dummy_event("E-2", EventType.ROAD_POTHOLE, SeverityLevel.CRITICAL, reliability_score=0.60),  # low rel & high sev
            make_dummy_event("E-3", EventType.ROAD_POTHOLE, SeverityLevel.LOW, reliability_score=0.65),  # low rel & low sev
        ]
        summary = aggregate_reliability_metrics(events, low_reliability_threshold=0.70)
        assert summary.total_observations == 3
        assert summary.low_reliability_count == 2
        assert summary.high_severity_low_reliability_count == 1
        assert round(summary.average_reliability_score, 2) == 0.72
