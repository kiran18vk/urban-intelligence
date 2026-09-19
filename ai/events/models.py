"""
Domain models for Urban Event Intelligence (Phase 3B, SIH 2026 PS 26124).
Standardizes raw AI detections into actionable urban events.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid
import datetime


class EventType(str, Enum):
    """Supported Urban Event Types."""
    ROAD_POTHOLE = "ROAD_POTHOLE"
    ROAD_CRACK = "ROAD_CRACK"
    TRAFFIC_CONGESTION = "TRAFFIC_CONGESTION"
    VEHICLE_DETECTED = "VEHICLE_DETECTED"
    PEDESTRIAN_RISK = "PEDESTRIAN_RISK"
    ANPR_DETECTION = "ANPR_DETECTION"
    HIT_AND_RUN = "HIT_AND_RUN"  # Schema/type definition only


class SeverityLevel(str, Enum):
    """Event Severity Classification."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class EventStatus(str, Enum):
    """Event lifecycle state."""
    NEW = "NEW"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


@dataclass
class GPSCoordinates:
    """Geographic coordinates with simulation source metadata."""
    latitude: float
    longitude: float
    is_simulated: bool = True
    provider_source: str = "deterministic_simulation"  # "deterministic_simulation" | "hardware_gps"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "is_simulated": self.is_simulated,
            "provider_source": self.provider_source,
        }


@dataclass
class EventEvidence:
    """References to external evidence media (avoids embedding raw binaries in JSON)."""
    image_path: Optional[str] = None
    video_path: Optional[str] = None
    crop_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "image_path": self.image_path,
            "video_path": self.video_path,
            "crop_path": self.crop_path,
        }


@dataclass
class UrbanEvent:
    """
    Standardized Urban Event Record representing an AI perception outcome.
    Preserves:
    - confidence: Raw AI detection confidence
    - operational_confidence: Reliability-adjusted operational confidence
    - reliability: Observation quality breakdown and explanation
    """
    event_id: str = field(default_factory=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    event_type: str = EventType.ROAD_POTHOLE.value
    bus_id: str = "PMP-BUS-001"
    camera_id: str = "CAM-FRONT-01"
    timestamp: str = field(
        default_factory=lambda: datetime.datetime.now(datetime.timezone.utc).isoformat()
    )
    gps: GPSCoordinates = field(default_factory=lambda: GPSCoordinates(18.520430, 73.856744))
    confidence: float = 0.0
    operational_confidence: Optional[float] = None
    severity: str = SeverityLevel.LOW.value
    status: str = EventStatus.NEW.value
    evidence: EventEvidence = field(default_factory=EventEvidence)
    detection: Dict[str, Any] = field(default_factory=dict)
    reliability: Optional[Dict[str, Any]] = None
    frame_index: Optional[int] = None
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        op_conf = self.operational_confidence if self.operational_confidence is not None else self.confidence
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "bus_id": self.bus_id,
            "camera_id": self.camera_id,
            "timestamp": self.timestamp,
            "gps": self.gps.to_dict(),
            "confidence": round(self.confidence, 4),
            "operational_confidence": round(op_conf, 4),
            "severity": self.severity,
            "status": self.status,
            "evidence": self.evidence.to_dict(),
            "detection": self.detection,
            "reliability": self.reliability,
            "frame_index": self.frame_index,
            "notes": self.notes,
        }

