"""
Incident Builder Module.

Constructs fully-structured IncidentRecord objects from IncidentTriggers by integrating:
- ByteTrack track identifier & class
- ANPR plate reading & OCR confidence (without fabricating plates or claiming RTO verification)
- Observation reliability scoring (Phase 5)
- Deterministic simulated GPS (Phase 3B)
- Evidence references (Phase 3B)
"""
from typing import Dict, Any, Optional
import time
import uuid

from ai.incidents.models import IncidentRecord, IncidentTrigger, IncidentType, IncidentStatus
from ai.incidents.config import IncidentConfig
from ai.events.models import SeverityLevel, GPSCoordinates, EventEvidence
from ai.events.gps import SimulatedGPSProvider
from ai.reliability.scorer import ReliabilityScorer
from ai.reliability.models import ReliabilityResult


class IncidentBuilder:
    """
    Assembles IncidentRecord and corresponding UrbanEvent objects from incident triggers.
    """

    def __init__(
        self,
        config: Optional[IncidentConfig] = None,
        gps_provider: Optional[SimulatedGPSProvider] = None,
        reliability_scorer: Optional[ReliabilityScorer] = None,
    ):
        self.config = config or IncidentConfig()
        self.gps_provider = gps_provider or SimulatedGPSProvider()
        self.reliability_scorer = reliability_scorer or ReliabilityScorer()

    def build_from_trigger(
        self,
        trigger: IncidentTrigger,
        bus_id: Optional[str] = None,
        camera_id: Optional[str] = None,
        vehicle_class: str = "car",
        plate_text: Optional[str] = None,
        plate_confidence: Optional[float] = None,
        anpr_status: Optional[str] = None,
        image_np: Optional[Any] = None,
        image_path: Optional[str] = None,
        video_path: Optional[str] = None,
        crop_path: Optional[str] = None,
        is_demo: bool = False,
        incident_id: Optional[str] = None,
    ) -> IncidentRecord:
        """
        Builds an IncidentRecord from a trigger.
        """
        active_bus_id = bus_id or self.config.default_bus_id
        active_camera_id = camera_id or self.config.default_camera_id
        current_time = trigger.timestamp or time.time()
        
        # 1. Deterministic Simulated GPS
        gps = self.gps_provider.get_location(
            timestamp_sec=current_time,
            frame_index=trigger.frame_index,
        )

        # 2. Map Severity
        if trigger.trigger_type == IncidentType.HIT_AND_RUN_SUSPECT or trigger.trigger_type == IncidentType.POTENTIAL_COLLISION:
            severity = SeverityLevel.CRITICAL
        elif trigger.trigger_type == IncidentType.SUSPICIOUS_PROXIMITY:
            severity = SeverityLevel.HIGH
        else:
            severity = SeverityLevel.MEDIUM

        # 3. ANPR Evaluation & Honesty
        if plate_text:
            verified_anpr_status = anpr_status or "VERIFIED_FORMAT_ONLY"
            clean_plate = plate_text
            clean_plate_conf = plate_confidence or 0.85
        else:
            verified_anpr_status = "NOT_READABLE"
            clean_plate = None
            clean_plate_conf = None

        # 4. Observation Reliability Evaluation (Phase 5)
        raw_ai_conf = trigger.confidence
        reliability_res: ReliabilityResult = self.reliability_scorer.evaluate_observation(
            raw_confidence=raw_ai_conf,
            image=image_np,
            track_history_length=trigger.persistence_frames,
        )
        operational_conf = reliability_res.operational_confidence

        # 5. Evidence Reference
        evidence = EventEvidence(
            image_path=image_path,
            video_path=video_path,
            crop_path=crop_path,
        )

        # 6. Generate Unique Incident ID
        generated_id = incident_id or f"INC-{uuid.uuid4().hex[:8].upper()}"

        notes = (
            f"Potential road incident detected. {trigger.description} "
            f"Requires human review. (Simulated GPS, OCR format validation only, no RTO registry check)"
        )
        if is_demo:
            notes = f"[DEMO ONLY] {notes}"

        return IncidentRecord(
            incident_id=generated_id,
            incident_type=trigger.trigger_type,
            status=IncidentStatus.NEW,
            severity=severity,
            bus_id=active_bus_id,
            camera_id=active_camera_id,
            timestamp=current_time,
            gps=gps,
            track_id=trigger.track_id,
            vehicle_class=vehicle_class,
            plate_text=clean_plate,
            plate_confidence=clean_plate_conf,
            anpr_status=verified_anpr_status,
            confidence=raw_ai_conf,
            operational_confidence=operational_conf,
            reliability=reliability_res.to_dict(),
            evidence=evidence,
            detection_metadata={
                "frame_index": trigger.frame_index,
                "persistence_frames": trigger.persistence_frames,
                "trajectory_deviation_deg": trigger.trajectory_deviation,
                "proximity_distance_px": trigger.proximity_distance_px,
            },
            trigger_info=trigger.to_dict(),
            notes=notes,
            is_demo=is_demo,
        )

    def build_demo_incident(
        self,
        incident_id: str = "INC-DEMO-0001",
        bus_id: str = "PMP-BUS-001",
        camera_id: str = "CAM-FRONT-01",
        track_id: int = 101,
        synthetic_plate: str = "SYNTHETIC-DEMO",
    ) -> IncidentRecord:
        """
        Creates an explicitly marked demonstration incident with synthetic plate and deterministic data.
        """
        trigger = IncidentTrigger(
            trigger_type=IncidentType.HIT_AND_RUN_SUSPECT,
            track_id=track_id,
            timestamp=time.time() - 300,
            frame_index=128,
            confidence=0.88,
            description="Sudden post-interaction trajectory deviation and rapid track disappearance.",
            trajectory_deviation=54.2,
            proximity_distance_px=34.5,
            persistence_frames=16,
            metadata={"is_demo": True},
        )
        return self.build_from_trigger(
            trigger=trigger,
            bus_id=bus_id,
            camera_id=camera_id,
            vehicle_class="sedan",
            plate_text=synthetic_plate,
            plate_confidence=0.84,
            anpr_status="SYNTHETIC_DEMO_FORMAT",
            image_path="evidence/demo_incident_frame_128.jpg",
            video_path="ai/traffic/bus_video_test.mp4",
            crop_path="evidence/demo_incident_vehicle_crop.jpg",
            is_demo=True,
            incident_id=incident_id,
        )
