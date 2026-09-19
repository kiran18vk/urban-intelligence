"""
Domain models for Phase 2B ANPR/OCR (SIH 2026 PS 26124).

NOTE ON 'VERIFIED' STATUS:
The status 'verified' indicates that an OCR reading both satisfies the Indian
registration syntax rules (standard State/UT or Bharat Series) and exceeds the
OCR confidence threshold. It represents an OCR confidence outcome and is NOT
external ground-truth verification against official databases (e.g., VAHAN).
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class PlateResult:
    """Represents a localized license plate candidate and OCR extraction result."""
    raw_text: str = ""
    normalized_text: str = ""
    confidence: float = 0.0  # OCR character recognition confidence score [0.0 - 1.0]
    is_format_valid: bool = False  # Syntactic format check (separate from confidence)
    format_type: str = "invalid"  # "standard" | "bharat_series" | "invalid"
    status: str = "not_detected"  # "verified" | "low_confidence" | "not_detected"
    plate_bbox: Optional[List[float]] = None  # [x1, y1, x2, y2] relative to full frame
    frame_index: Optional[int] = None
    timestamp_sec: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw_text": self.raw_text,
            "normalized_text": self.normalized_text,
            "confidence": round(self.confidence, 4),
            "is_format_valid": self.is_format_valid,
            "format_type": self.format_type,
            "status": self.status,
            "plate_bbox": [round(v, 2) for v in self.plate_bbox] if self.plate_bbox else None,
            "frame_index": self.frame_index,
            "timestamp_sec": round(self.timestamp_sec, 2) if self.timestamp_sec is not None else None,
        }


@dataclass
class VehiclePlateRecord:
    """
    Associates a tracked vehicle ID with its aggregated best license plate reading
    and observation history across frames.
    """
    track_id: int
    vehicle_class: str
    plate: PlateResult = field(default_factory=PlateResult)
    candidates: List[PlateResult] = field(default_factory=list)
    first_seen_frame: int = 0
    last_seen_frame: int = 0
    frames_seen: int = 0

    def add_reading(self, reading: PlateResult) -> None:
        """
        Track-level aggregation:
        Adds a new frame-level candidate reading and updates the best plate.
        Hierarchy:
          1. Format-valid reading with highest OCR confidence.
          2. If no format-valid reading, candidate with highest OCR confidence.
        """
        self.candidates.append(reading)

        if not self.plate or self.plate.status == "not_detected":
            self.plate = reading
            return

        current_is_valid = reading.is_format_valid and reading.status == "verified"
        best_is_valid = self.plate.is_format_valid and self.plate.status == "verified"

        if current_is_valid and not best_is_valid:
            # Upgrade to first format-valid reading
            self.plate = reading
        elif current_is_valid and best_is_valid:
            # Both are format valid -> pick higher OCR confidence
            if reading.confidence > self.plate.confidence:
                self.plate = reading
        elif not current_is_valid and not best_is_valid:
            # Neither is format valid -> pick higher OCR confidence
            if reading.confidence > self.plate.confidence:
                self.plate = reading

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "vehicle_class": self.vehicle_class,
            "first_seen_frame": self.first_seen_frame,
            "last_seen_frame": self.last_seen_frame,
            "frames_seen": self.frames_seen,
            "plate": self.plate.to_dict(),
            "candidate_count": len(self.candidates),
        }


@dataclass
class ANPRPipelineResult:
    """Aggregated output from running ANPR on a video or frame sequence."""
    status: str = "success"
    error_message: Optional[str] = None
    frames_processed: int = 0
    processing_fps: float = 0.0
    total_vehicles_tracked: int = 0
    plates_detected: int = 0
    plates_format_valid: int = 0
    plates_verified: int = 0
    records: List[VehiclePlateRecord] = field(default_factory=list)
    annotated_video_path: Optional[str] = None
    validation_note: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "error_message": self.error_message,
            "frames_processed": self.frames_processed,
            "processing_fps": round(self.processing_fps, 2),
            "total_vehicles_tracked": self.total_vehicles_tracked,
            "plates_detected": self.plates_detected,
            "plates_format_valid": self.plates_format_valid,
            "plates_verified": self.plates_verified,
            "records": [r.to_dict() for r in self.records],
            "annotated_video_path": self.annotated_video_path,
            "validation_note": self.validation_note,
        }
