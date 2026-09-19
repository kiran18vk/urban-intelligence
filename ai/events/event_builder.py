"""
Standardized Urban Event Builder (Phase 3B, SIH 2026 PS 26124).
Translates raw AI perception detections into structured, geo-referenced urban events.
"""

import datetime
from typing import Any, Dict, Optional, Union
import numpy as np

from ai.events.evidence import EvidenceStore, LocalEvidenceStore
from ai.events.gps import GPSProvider, SimulatedGPSProvider
from ai.events.models import EventStatus, EventType, SeverityLevel, UrbanEvent
from ai.events.severity import SeverityCalculator
from ai.reliability.scorer import ReliabilityScorer
from ai.road_damage.models import RoadDefectDetection


class EventBuilder:
    """
    Factory for producing geo-referenced, standardized UrbanEvent objects from AI outputs.
    Integrates Observation Reliability Intelligence (Phase 5).
    """

    def __init__(
        self,
        gps_provider: Optional[GPSProvider] = None,
        severity_calculator: Optional[SeverityCalculator] = None,
        evidence_store: Optional[EvidenceStore] = None,
        reliability_scorer: Optional[ReliabilityScorer] = None,
        bus_id: str = "PMP-BUS-001",
        camera_id: str = "CAM-FRONT-01",
        base_datetime: Optional[datetime.datetime] = None,
    ):
        self.gps_provider = gps_provider or SimulatedGPSProvider(bus_id=bus_id, camera_id=camera_id)
        self.severity_calculator = severity_calculator or SeverityCalculator()
        self.evidence_store = evidence_store or LocalEvidenceStore()
        self.reliability_scorer = reliability_scorer or ReliabilityScorer()
        self.bus_id = bus_id
        self.camera_id = camera_id
        self.base_datetime = base_datetime or datetime.datetime.now(datetime.timezone.utc)

    def _derive_iso_timestamp(self, timestamp_sec: float) -> str:
        """Derives a consistent ISO 8601 timestamp from base time + elapsed video seconds."""
        event_time = self.base_datetime + datetime.timedelta(seconds=timestamp_sec)
        return event_time.isoformat()


    def build_from_road_defect(
        self,
        defect: RoadDefectDetection,
        frame_index: int = 0,
        timestamp_sec: float = 0.0,
        image_path: Optional[str] = None,
        video_path: Optional[str] = None,
        crop: Optional[np.ndarray] = None,
        image: Optional[np.ndarray] = None,
    ) -> UrbanEvent:
        """
        Builds a ROAD_POTHOLE or ROAD_CRACK event from a RoadDefectDetection.
        """
        event_type = (
            EventType.ROAD_POTHOLE.value
            if defect.class_name.lower() == "pothole"
            else EventType.ROAD_CRACK.value
        )

        severity = self.severity_calculator.calculate_road_defect_severity(
            class_name=defect.class_name,
            confidence=defect.confidence,
        )

        gps_coords = self.gps_provider.get_location(
            timestamp_sec=timestamp_sec,
            frame_index=frame_index,
        )

        rel_result = self.reliability_scorer.evaluate_observation(
            raw_confidence=defect.confidence,
            image=image,
            crop=crop,
        )

        event = UrbanEvent(
            event_type=event_type,
            bus_id=self.bus_id,
            camera_id=self.camera_id,
            timestamp=self._derive_iso_timestamp(timestamp_sec),
            gps=gps_coords,
            confidence=defect.confidence,
            operational_confidence=rel_result.operational_confidence,
            severity=severity,
            status=EventStatus.NEW.value,
            frame_index=frame_index,
            detection=defect.to_dict(),
            reliability=rel_result.to_dict(),
            notes=f"Detected {defect.class_name} with confidence {defect.confidence:.2f}",
        )

        event.evidence = self.evidence_store.store_evidence(
            event_id=event.event_id,
            image_path=image_path,
            video_path=video_path,
            crop=crop,
        )

        return event

    def build_from_traffic_density(
        self,
        density_level: str,
        vehicle_count: int,
        active_tracks: int,
        frame_index: int = 0,
        timestamp_sec: float = 0.0,
        video_path: Optional[str] = None,
        image: Optional[np.ndarray] = None,
    ) -> UrbanEvent:
        """
        Builds a TRAFFIC_CONGESTION event from traffic tracking metrics.
        """
        severity = self.severity_calculator.calculate_traffic_severity(density_level)
        gps_coords = self.gps_provider.get_location(
            timestamp_sec=timestamp_sec,
            frame_index=frame_index,
        )

        rel_result = self.reliability_scorer.evaluate_observation(
            raw_confidence=1.0,
            image=image,
            track_history_length=active_tracks,
            consecutive_hits=active_tracks,
        )

        event = UrbanEvent(
            event_type=EventType.TRAFFIC_CONGESTION.value,
            bus_id=self.bus_id,
            camera_id=self.camera_id,
            timestamp=self._derive_iso_timestamp(timestamp_sec),
            gps=gps_coords,
            confidence=1.0,  # Metric derived from multi-object tracking
            operational_confidence=rel_result.operational_confidence,
            severity=severity,
            status=EventStatus.NEW.value,
            frame_index=frame_index,
            detection={
                "density_level": density_level,
                "vehicle_count": vehicle_count,
                "active_tracks": active_tracks,
            },
            reliability=rel_result.to_dict(),
            notes=f"Traffic density level: {density_level} ({active_tracks} active vehicles)",
        )

        event.evidence = self.evidence_store.store_evidence(
            event_id=event.event_id,
            video_path=video_path,
        )

        return event

    def build_from_anpr_record(
        self,
        track_id: int,
        vehicle_class: str,
        plate_text: str,
        confidence: float,
        plate_status: str,
        frame_index: int = 0,
        timestamp_sec: float = 0.0,
        image_path: Optional[str] = None,
        crop: Optional[np.ndarray] = None,
        image: Optional[np.ndarray] = None,
    ) -> UrbanEvent:
        """
        Builds an ANPR_DETECTION event from an ANPR vehicle plate record.
        """
        severity = self.severity_calculator.calculate_anpr_severity(
            plate_status=plate_status,
            confidence=confidence,
        )

        gps_coords = self.gps_provider.get_location(
            timestamp_sec=timestamp_sec,
            frame_index=frame_index,
        )

        rel_result = self.reliability_scorer.evaluate_observation(
            raw_confidence=confidence,
            image=image,
            crop=crop,
            track_history_length=5,
        )

        event = UrbanEvent(
            event_type=EventType.ANPR_DETECTION.value,
            bus_id=self.bus_id,
            camera_id=self.camera_id,
            timestamp=self._derive_iso_timestamp(timestamp_sec),
            gps=gps_coords,
            confidence=confidence,
            operational_confidence=rel_result.operational_confidence,
            severity=severity,
            status=EventStatus.NEW.value,
            frame_index=frame_index,
            detection={
                "track_id": track_id,
                "vehicle_class": vehicle_class,
                "plate_text": plate_text,
                "plate_status": plate_status,
                "ocr_confidence": confidence,
            },
            reliability=rel_result.to_dict(),
            notes=f"ANPR reading for {vehicle_class} (Track ID {track_id}): '{plate_text}' ({plate_status})",
        )

        event.evidence = self.evidence_store.store_evidence(
            event_id=event.event_id,
            image_path=image_path,
            crop=crop,
        )

        return event

    def build_from_generic_detection(
        self,
        detection_data: Dict[str, Any],
        event_type: str = EventType.VEHICLE_DETECTED.value,
        confidence: float = 0.50,
        frame_index: int = 0,
        timestamp_sec: float = 0.0,
        severity: Optional[str] = None,
        image_path: Optional[str] = None,
        image: Optional[np.ndarray] = None,
    ) -> UrbanEvent:
        """
        Builds an UrbanEvent from an arbitrary perception detection dictionary.
        """
        resolved_severity = severity or SeverityLevel.LOW.value
        gps_coords = self.gps_provider.get_location(
            timestamp_sec=timestamp_sec,
            frame_index=frame_index,
        )

        rel_result = self.reliability_scorer.evaluate_observation(
            raw_confidence=confidence,
            image=image,
        )

        event = UrbanEvent(
            event_type=event_type,
            bus_id=self.bus_id,
            camera_id=self.camera_id,
            timestamp=self._derive_iso_timestamp(timestamp_sec),
            gps=gps_coords,
            confidence=confidence,
            operational_confidence=rel_result.operational_confidence,
            severity=resolved_severity,
            status=EventStatus.NEW.value,
            frame_index=frame_index,
            detection=detection_data,
            reliability=rel_result.to_dict(),
        )

        event.evidence = self.evidence_store.store_evidence(
            event_id=event.event_id,
            image_path=image_path,
        )

        return event

