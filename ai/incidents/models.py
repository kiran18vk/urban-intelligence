"""
Incident Intelligence Data Models.

Defines structured representations for incident triggers, incident records,
status lifecycle, and conversion to UrbanEvent(HIT_AND_RUN).
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Any, List, Optional
import time

from ai.events.models import UrbanEvent, EventType, SeverityLevel, GPSCoordinates, EventEvidence


class IncidentType(str, Enum):
    """Types of potential road incidents."""
    POTENTIAL_COLLISION = "POTENTIAL_COLLISION"
    SUSPICIOUS_PROXIMITY = "SUSPICIOUS_PROXIMITY"
    SUDDEN_DEVIATION = "SUDDEN_DEVIATION"
    HIT_AND_RUN_SUSPECT = "HIT_AND_RUN_SUSPECT"


class IncidentStatus(str, Enum):
    """Workflow lifecycle status for incidents."""
    NEW = "NEW"
    REVIEW = "REVIEW"
    ACTIONED = "ACTIONED"
    CLOSED = "CLOSED"


@dataclass
class IncidentTrigger:
    """Represents a suspicious observation or spatio-temporal trigger."""
    trigger_type: IncidentType
    track_id: Optional[int] = None
    timestamp: float = field(default_factory=time.time)
    frame_index: int = 0
    confidence: float = 0.80
    description: str = "Potential incident trigger detected"
    trajectory_deviation: Optional[float] = None
    proximity_distance_px: Optional[float] = None
    persistence_frames: int = 1
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "trigger_type": self.trigger_type.value if isinstance(self.trigger_type, IncidentType) else str(self.trigger_type),
            "track_id": self.track_id,
            "timestamp": self.timestamp,
            "frame_index": self.frame_index,
            "confidence": round(self.confidence, 4),
            "description": self.description,
            "trajectory_deviation": round(self.trajectory_deviation, 2) if self.trajectory_deviation is not None else None,
            "proximity_distance_px": round(self.proximity_distance_px, 2) if self.proximity_distance_px is not None else None,
            "persistence_frames": self.persistence_frames,
            "metadata": self.metadata,
        }


@dataclass
class IncidentRecord:
    """
    Complete structured record for a potential road incident.
    Integrates track identification, ANPR reading, observation reliability,
    simulated GPS, and evidence paths.
    """
    incident_id: str
    incident_type: IncidentType
    status: IncidentStatus
    severity: SeverityLevel
    bus_id: str
    camera_id: str
    timestamp: float
    gps: GPSCoordinates
    track_id: Optional[int] = None
    vehicle_class: str = "vehicle"
    plate_text: Optional[str] = None
    plate_confidence: Optional[float] = None
    anpr_status: str = "NOT_READABLE"
    confidence: float = 0.80  # Raw AI detection confidence
    operational_confidence: float = 0.70  # Quality-adjusted confidence
    reliability: Optional[Dict[str, Any]] = None
    evidence: EventEvidence = field(default_factory=lambda: EventEvidence())
    detection_metadata: Dict[str, Any] = field(default_factory=dict)
    trigger_info: Optional[Dict[str, Any]] = None
    notes: str = ""
    is_demo: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "incident_id": self.incident_id,
            "incident_type": self.incident_type.value if isinstance(self.incident_type, IncidentType) else str(self.incident_type),
            "status": self.status.value if isinstance(self.status, IncidentStatus) else str(self.status),
            "severity": self.severity.value if isinstance(self.severity, SeverityLevel) else str(self.severity),
            "bus_id": self.bus_id,
            "camera_id": self.camera_id,
            "timestamp": self.timestamp,
            "gps": self.gps.to_dict(),
            "track_id": self.track_id,
            "vehicle_class": self.vehicle_class,
            "plate_text": self.plate_text,
            "plate_confidence": round(self.plate_confidence, 4) if self.plate_confidence is not None else None,
            "anpr_status": self.anpr_status,
            "confidence": round(self.confidence, 4),
            "operational_confidence": round(self.operational_confidence, 4),
            "reliability": self.reliability,
            "evidence": self.evidence.to_dict(),
            "detection_metadata": self.detection_metadata,
            "trigger_info": self.trigger_info,
            "notes": self.notes,
            "is_demo": self.is_demo,
        }

    def to_urban_event(self) -> UrbanEvent:
        """
        Converts IncidentRecord into a standardized UrbanEvent of type HIT_AND_RUN.
        """
        event_notes = (
            f"Potential Incident [{self.incident_type.value}]: {self.notes}"
            if not self.is_demo
            else f"[DEMO ONLY] Potential Incident: {self.notes}"
        )
        return UrbanEvent(
            event_id=self.incident_id,
            event_type=EventType.HIT_AND_RUN,
            severity=self.severity,
            confidence=self.confidence,
            operational_confidence=self.operational_confidence,
            reliability=self.reliability,
            bus_id=self.bus_id,
            camera_id=self.camera_id,
            timestamp=self.timestamp,
            gps=self.gps,
            evidence=self.evidence,
            detection={
                "incident_type": self.incident_type.value if isinstance(self.incident_type, IncidentType) else str(self.incident_type),
                "track_id": self.track_id,
                "vehicle_class": self.vehicle_class,
                "plate_text": self.plate_text,
                "plate_confidence": self.plate_confidence,
                "anpr_status": self.anpr_status,
                **self.detection_metadata,
            },
            notes=event_notes,
        )
