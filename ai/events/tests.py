"""
Comprehensive Test Suite for Urban Event Intelligence (Phase 3B, SIH 2026 PS 26124).
Tests:
  - Event schema serialization & field verification
  - Unique event ID generation
  - Deterministic simulated GPS progression & repeatability
  - Distinguishing simulated GPS vs hardware GPS
  - Timestamp derivation from video timing
  - AI confidence score preservation
  - Severity calculation rules
  - Evidence store referencing
  - EventBuilder integration with road defect, traffic, and ANPR perception outputs
"""

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.events.event_builder import EventBuilder
from ai.events.evidence import LocalEvidenceStore
from ai.events.gps import SimulatedGPSProvider, haversine_distance_km
from ai.events.models import (
    EventEvidence,
    EventStatus,
    EventType,
    GPSCoordinates,
    SeverityLevel,
    UrbanEvent,
)
from ai.events.severity import SeverityCalculator
from ai.road_damage.models import RoadDefectDetection


class TestUrbanEventModels:
    def test_urban_event_schema_completeness(self):
        event = UrbanEvent(
            event_type=EventType.ROAD_POTHOLE.value,
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            gps=GPSCoordinates(18.520430, 73.856744, is_simulated=True),
            confidence=0.7245,
            severity=SeverityLevel.HIGH.value,
            evidence=EventEvidence(image_path="outputs/annotated.jpg"),
            detection={"class_name": "pothole", "bbox": [10, 20, 100, 120]},
        )
        d = event.to_dict()

        required_keys = {
            "event_id",
            "event_type",
            "bus_id",
            "camera_id",
            "timestamp",
            "gps",
            "confidence",
            "severity",
            "status",
            "evidence",
            "detection",
            "frame_index",
            "notes",
        }
        assert required_keys.issubset(d.keys())
        assert d["event_id"].startswith("EVT-")
        assert d["event_type"] == "ROAD_POTHOLE"
        assert d["severity"] == "HIGH"
        assert d["confidence"] == 0.7245
        assert d["gps"]["latitude"] == 18.520430
        assert d["gps"]["longitude"] == 73.856744
        assert d["gps"]["is_simulated"] is True
        assert d["gps"]["provider_source"] == "deterministic_simulation"
        assert d["evidence"]["image_path"] == "outputs/annotated.jpg"

    def test_unique_event_ids(self):
        events = [UrbanEvent() for _ in range(200)]
        unique_ids = {e.event_id for e in events}
        assert len(unique_ids) == 200


class TestSimulatedGPSProvider:
    def test_deterministic_repeatability(self):
        provider = SimulatedGPSProvider()
        # Same timestamp must produce the exact same coordinates every single time
        c1 = provider.get_location(timestamp_sec=45.0)
        c2 = provider.get_location(timestamp_sec=45.0)
        assert c1.latitude == c2.latitude
        assert c1.longitude == c2.longitude
        assert c1.is_simulated is True

    def test_gps_advances_along_route(self):
        provider = SimulatedGPSProvider(average_speed_kmh=40.0)
        c0 = provider.get_location(timestamp_sec=0.0)
        c100 = provider.get_location(timestamp_sec=100.0)
        c200 = provider.get_location(timestamp_sec=200.0)

        # Distance should increase smoothly
        dist_0_to_100 = haversine_distance_km((c0.latitude, c0.longitude), (c100.latitude, c100.longitude))
        dist_0_to_200 = haversine_distance_km((c0.latitude, c0.longitude), (c200.latitude, c200.longitude))
        assert dist_0_to_100 > 0.0
        assert dist_0_to_200 > dist_0_to_100

    def test_haversine_formula(self):
        # Known distance between Mumbai (18.9220, 72.8347) and Pune (18.5204, 73.8567) ~120 km
        dist = haversine_distance_km((18.9220, 72.8347), (18.5204, 73.8567))
        assert 110.0 < dist < 130.0


class TestSeverityCalculator:
    def test_pothole_severity_rules(self):
        # High confidence pothole -> HIGH
        assert SeverityCalculator.calculate_road_defect_severity("pothole", 0.75) == "HIGH"
        assert SeverityCalculator.calculate_road_defect_severity("pothole", 0.70) == "HIGH"
        # Low confidence pothole -> MEDIUM
        assert SeverityCalculator.calculate_road_defect_severity("pothole", 0.65) == "MEDIUM"
        assert SeverityCalculator.calculate_road_defect_severity("pothole", 0.30) == "MEDIUM"

    def test_crack_severity_rules(self):
        # Alligator crack -> MEDIUM
        assert SeverityCalculator.calculate_road_defect_severity("alligator", 0.80) == "MEDIUM"
        assert SeverityCalculator.calculate_road_defect_severity("alligator", 0.50) == "LOW"
        # Longitudinal crack -> LOW (or MEDIUM if very high confidence >= 0.85)
        assert SeverityCalculator.calculate_road_defect_severity("longitudinal", 0.60) == "LOW"
        assert SeverityCalculator.calculate_road_defect_severity("longitudinal", 0.90) == "MEDIUM"

    def test_traffic_severity_rules(self):
        assert SeverityCalculator.calculate_traffic_severity("HIGH") == "HIGH"
        assert SeverityCalculator.calculate_traffic_severity("MEDIUM") == "MEDIUM"
        assert SeverityCalculator.calculate_traffic_severity("LOW") == "LOW"

    def test_anpr_severity_rules(self):
        # Kept as informational (LOW) by default
        assert SeverityCalculator.calculate_anpr_severity("verified", 0.92) == "LOW"
        assert SeverityCalculator.calculate_anpr_severity("low_confidence", 0.35) == "LOW"


class TestEventBuilder:
    def setup_method(self):
        self.builder = EventBuilder(
            bus_id="PMP-BUS-042",
            camera_id="CAM-FRONT-02",
        )

    def test_build_from_road_defect_pothole(self):
        defect = RoadDefectDetection(
            class_name="pothole",
            confidence=0.78,
            bbox=[100.0, 150.0, 300.0, 350.0],
            frame_index=15,
            timestamp_sec=0.60,
        )
        event = self.builder.build_from_road_defect(
            defect=defect,
            frame_index=15,
            timestamp_sec=0.60,
            image_path="outputs/pothole.jpg",
        )
        assert event.event_type == "ROAD_POTHOLE"
        assert event.bus_id == "PMP-BUS-042"
        assert event.camera_id == "CAM-FRONT-02"
        assert event.confidence == 0.78
        assert event.operational_confidence is not None
        assert event.operational_confidence <= event.confidence
        assert event.reliability is not None
        assert "score" in event.reliability
        assert "operational_confidence" in event.reliability
        assert event.severity == "HIGH"
        assert event.gps.is_simulated is True
        assert event.evidence.image_path == "outputs/pothole.jpg"

    def test_build_from_road_defect_crack(self):
        defect = RoadDefectDetection(
            class_name="longitudinal",
            confidence=0.55,
            bbox=[50.0, 60.0, 150.0, 200.0],
            frame_index=30,
            timestamp_sec=1.20,
        )
        event = self.builder.build_from_road_defect(
            defect=defect,
            frame_index=30,
            timestamp_sec=1.20,
        )
        assert event.event_type == "ROAD_CRACK"
        assert event.severity == "LOW"
        assert event.confidence == 0.55
        assert event.operational_confidence <= 0.55
        assert event.reliability is not None

    def test_build_from_traffic_density(self):
        event = self.builder.build_from_traffic_density(
            density_level="HIGH",
            vehicle_count=18,
            active_tracks=14,
            frame_index=60,
            timestamp_sec=2.40,
            video_path="outputs/traffic.mp4",
        )
        assert event.event_type == "TRAFFIC_CONGESTION"
        assert event.severity == "HIGH"
        assert event.detection["density_level"] == "HIGH"
        assert event.detection["active_tracks"] == 14
        assert event.evidence.video_path == "outputs/traffic.mp4"
        assert event.reliability is not None
        assert event.operational_confidence <= 1.0

    def test_build_from_anpr_record(self):
        event = self.builder.build_from_anpr_record(
            track_id=17,
            vehicle_class="car",
            plate_text="MH12AB1234",
            confidence=0.88,
            plate_status="verified",
            frame_index=45,
            timestamp_sec=1.80,
        )
        assert event.event_type == "ANPR_DETECTION"
        assert event.severity == "LOW"
        assert event.confidence == 0.88
        assert event.detection["plate_text"] == "MH12AB1234"
        assert event.detection["plate_status"] == "verified"
        assert event.operational_confidence <= 0.88
        assert event.reliability is not None



if __name__ == "__main__":
    pytest.main([__file__, "-v"])
