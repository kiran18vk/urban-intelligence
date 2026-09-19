"""
Tests for Phase 6 Incident Intelligence & Hit-and-Run Workflow.
"""
import pytest
import numpy as np

from ai.incidents.models import (
    IncidentType,
    IncidentStatus,
    IncidentTrigger,
    IncidentRecord,
)
from ai.incidents.config import IncidentConfig
from ai.incidents.incident_detector import IncidentDetector
from ai.incidents.incident_builder import IncidentBuilder
from ai.events.models import EventType, SeverityLevel


class TestIncidentModels:
    """Tests for incident data models."""

    def test_incident_trigger_serialization(self):
        trigger = IncidentTrigger(
            trigger_type=IncidentType.SUDDEN_DEVIATION,
            track_id=12,
            confidence=0.78,
            trajectory_deviation=48.5,
        )
        d = trigger.to_dict()
        assert d["trigger_type"] == "SUDDEN_DEVIATION"
        assert d["track_id"] == 12
        assert d["trajectory_deviation"] == 48.5
        assert d["confidence"] == 0.78

    def test_incident_record_to_urban_event(self):
        builder = IncidentBuilder()
        trigger = IncidentTrigger(
            trigger_type=IncidentType.HIT_AND_RUN_SUSPECT,
            track_id=44,
            confidence=0.85,
        )
        record = builder.build_from_trigger(
            trigger=trigger,
            plate_text="SYNTHETIC-DEMO-99",
            plate_confidence=0.89,
            is_demo=True,
        )
        urban_evt = record.to_urban_event()
        assert urban_evt.event_type == EventType.HIT_AND_RUN
        assert urban_evt.severity == SeverityLevel.CRITICAL
        assert urban_evt.confidence == 0.85
        assert urban_evt.operational_confidence <= urban_evt.confidence
        assert urban_evt.gps.is_simulated is True
        assert "[DEMO ONLY]" in urban_evt.notes
        assert urban_evt.detection["plate_text"] == "SYNTHETIC-DEMO-99"


class TestIncidentDetector:
    """Tests for rule-based incident detection heuristics."""

    def test_sudden_trajectory_deviation_triggers_incident(self):
        detector = IncidentDetector()
        # Create a motion history that turns sharply (e.g. straight then 90 degrees right)
        history = [
            (100.0, 100.0),
            (100.0, 150.0),
            (100.0, 200.0),
            (150.0, 200.0),
            (200.0, 200.0),
        ]
        status, trigger = detector.evaluate_track_motion(
            track_id=7,
            history=history,
            current_frame=30,
        )
        assert status == "POTENTIAL_INCIDENT"
        assert trigger is not None
        assert trigger.trigger_type == IncidentType.SUDDEN_DEVIATION
        assert trigger.track_id == 7
        assert trigger.trajectory_deviation is not None
        assert trigger.trajectory_deviation >= 40.0

    def test_smooth_trajectory_no_incident(self):
        detector = IncidentDetector()
        # Straight line motion
        history = [
            (100.0, 100.0),
            (100.0, 120.0),
            (100.0, 140.0),
            (100.0, 160.0),
        ]
        status, trigger = detector.evaluate_track_motion(
            track_id=8,
            history=history,
            current_frame=20,
        )
        assert status == "NO_INCIDENT"
        assert trigger is None

    def test_track_abrupt_disappearance_triggers_incident(self):
        detector = IncidentDetector()
        history = [(100.0, 100.0), (105.0, 110.0), (110.0, 120.0)]
        status, trigger = detector.evaluate_track_motion(
            track_id=9,
            history=history,
            current_frame=15,
            is_disappeared=True,
        )
        assert status == "POTENTIAL_INCIDENT"
        assert trigger is not None
        assert trigger.trigger_type == IncidentType.HIT_AND_RUN_SUSPECT

    def test_proximity_interaction(self):
        detector = IncidentDetector()
        # Two bounding boxes very close (< 60px)
        bbox_a = [100.0, 100.0, 150.0, 150.0]
        bbox_b = [120.0, 110.0, 170.0, 160.0]
        status, trigger = detector.evaluate_proximity_interaction(
            track_id_a=1,
            bbox_a=bbox_a,
            track_id_b=2,
            bbox_b=bbox_b,
            current_frame=50,
        )
        assert status == "POTENTIAL_INCIDENT"
        assert trigger is not None
        assert trigger.trigger_type == IncidentType.SUSPICIOUS_PROXIMITY

    def test_demo_trigger_creation(self):
        detector = IncidentDetector()
        status, trigger = detector.create_demo_trigger(track_id=101)
        assert status == "DEMO_INCIDENT"
        assert trigger.metadata.get("is_demo") is True


class TestIncidentBuilderAndIntegration:
    """Tests for building complete incidents with ANPR, Reliability, and GPS."""

    def test_anpr_not_readable_does_not_invent_plate(self):
        builder = IncidentBuilder()
        trigger = IncidentTrigger(
            trigger_type=IncidentType.HIT_AND_RUN_SUSPECT,
            track_id=5,
            confidence=0.80,
        )
        record = builder.build_from_trigger(
            trigger=trigger,
            plate_text=None,  # Unreadable plate
        )
        assert record.plate_text is None
        assert record.plate_confidence is None
        assert record.anpr_status == "NOT_READABLE"

    def test_operational_confidence_never_exceeds_raw(self):
        builder = IncidentBuilder()
        trigger = IncidentTrigger(
            trigger_type=IncidentType.POTENTIAL_COLLISION,
            track_id=14,
            confidence=0.82,
        )
        # Low quality blurred image
        dark_blurred = np.full((100, 100, 3), 15, dtype=np.uint8)
        record = builder.build_from_trigger(
            trigger=trigger,
            image_np=dark_blurred,
        )
        assert record.confidence == 0.82
        assert record.operational_confidence <= record.confidence
        assert record.reliability is not None
        assert record.reliability["score"] < 0.80

    def test_demo_incident_generation(self):
        builder = IncidentBuilder()
        record = builder.build_demo_incident(
            incident_id="INC-DEMO-9999",
            synthetic_plate="SYNTHETIC-DEMO-01",
        )
        assert record.incident_id == "INC-DEMO-9999"
        assert record.is_demo is True
        assert record.plate_text == "SYNTHETIC-DEMO-01"
        assert record.gps.is_simulated is True
        assert record.status == IncidentStatus.NEW

    def test_status_lifecycle(self):
        record = IncidentRecord(
            incident_id="INC-001",
            incident_type=IncidentType.HIT_AND_RUN_SUSPECT,
            status=IncidentStatus.NEW,
            severity=SeverityLevel.CRITICAL,
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=1000.0,
            gps=builder_gps(),
        )
        assert record.status == IncidentStatus.NEW
        record.status = IncidentStatus.REVIEW
        assert record.status == IncidentStatus.REVIEW
        record.status = IncidentStatus.ACTIONED
        assert record.status == IncidentStatus.ACTIONED
        record.status = IncidentStatus.CLOSED
        assert record.status == IncidentStatus.CLOSED


def builder_gps():
    from ai.events.models import GPSCoordinates
    return GPSCoordinates(latitude=18.5204, longitude=73.8567, is_simulated=True)
