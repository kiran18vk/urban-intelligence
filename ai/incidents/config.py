"""
Incident Intelligence Configuration.

Defines thresholds, heuristics, and defaults for the prototype
incident detection and workflow engine.
"""
from dataclasses import dataclass
from typing import Dict, Any


@dataclass
class IncidentConfig:
    """Configuration parameters for incident detection & evaluation."""
    
    # Trajectory & Spatio-Temporal Heuristic Thresholds
    min_track_persistence_frames: int = 3
    trajectory_deviation_threshold_deg: float = 40.0
    proximity_threshold_px: float = 60.0
    max_frames_after_trigger: int = 30
    
    # Severity rules
    default_collision_severity: str = "CRITICAL"
    default_proximity_severity: str = "HIGH"
    default_deviation_severity: str = "MEDIUM"
    
    # ANPR Validation Constraints
    require_verified_plate_format: bool = True
    min_plate_ocr_confidence: float = 0.50
    
    # Defaults
    default_bus_id: str = "PMP-BUS-001"
    default_camera_id: str = "CAM-FRONT-01"
    
    # Disclaimer Text
    disclaimer: str = (
        "Prototype incident intelligence workflow. Potential incident triggers require human review. "
        "Does not constitute official legal proof, confirmed liability, or government vehicle registry verification."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "min_track_persistence_frames": self.min_track_persistence_frames,
            "trajectory_deviation_threshold_deg": self.trajectory_deviation_threshold_deg,
            "proximity_threshold_px": self.proximity_threshold_px,
            "max_frames_after_trigger": self.max_frames_after_trigger,
            "default_collision_severity": self.default_collision_severity,
            "default_proximity_severity": self.default_proximity_severity,
            "default_deviation_severity": self.default_deviation_severity,
            "require_verified_plate_format": self.require_verified_plate_format,
            "min_plate_ocr_confidence": self.min_plate_ocr_confidence,
            "default_bus_id": self.default_bus_id,
            "default_camera_id": self.default_camera_id,
            "disclaimer": self.disclaimer,
        }
