"""
Data models for Phase 2C Traffic Tracking (SIH 2026 PS 26124).
All runtime data structures are defined here.
"""

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Deque, Dict, List, Optional, Tuple


@dataclass
class TrackedObject:
    """Persistent representation of a tracked vehicle / pedestrian across frames."""

    track_id: int
    class_name: str
    confidence: float
    bbox: List[float]           # [x1, y1, x2, y2] in the most-recent frame
    center_x: float
    center_y: float
    first_seen_frame: int
    last_seen_frame: int
    frames_seen: int = 0

    # Bounded center-point trajectory history: (cx, cy) per frame
    trajectory: Deque[Tuple[float, float]] = field(default_factory=deque)

    # Estimated speed — None when calibration is unavailable
    speed_kmh: Optional[float] = None
    # Pixel-level displacement per frame (raw, NOT physical speed)
    _pixel_displacements: Deque[float] = field(default_factory=deque)

    # Whether this track has already crossed the counting line
    counted: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "class_name": self.class_name,
            "confidence": round(self.confidence, 4),
            "bbox": [round(v, 2) for v in self.bbox],
            "center_x": round(self.center_x, 2),
            "center_y": round(self.center_y, 2),
            "first_seen_frame": self.first_seen_frame,
            "last_seen_frame": self.last_seen_frame,
            "frames_seen": self.frames_seen,
            "trajectory": [
                {"cx": round(cx, 2), "cy": round(cy, 2)}
                for cx, cy in list(self.trajectory)
            ],
            "speed_kmh": (
                round(self.speed_kmh, 2) if self.speed_kmh is not None else None
            ),
            "speed_estimated": self.speed_kmh is not None,
        }


@dataclass
class DirectionalCounts:
    incoming: int = 0   # Objects moving toward camera (top→bottom)
    outgoing: int = 0   # Objects moving away  (bottom→top)
    counted_track_ids: List[int] = field(default_factory=list)

    def to_dict(self) -> Dict[str, int]:
        return {"incoming": self.incoming, "outgoing": self.outgoing}


@dataclass
class DensityResult:
    level: str          # "LOW" | "MEDIUM" | "HIGH"
    value: int          # raw count of active tracks

    def to_dict(self) -> Dict[str, Any]:
        return {"level": self.level, "value": self.value}


@dataclass
class PipelineResult:
    """Aggregated result returned after processing a video or batch of frames."""

    status: str = "success"
    error_message: Optional[str] = None
    frames_processed: int = 0
    processing_fps: float = 0.0
    total_unique_vehicles: int = 0
    active_tracks: int = 0
    vehicles_by_class: Dict[str, int] = field(default_factory=dict)
    directional_counts: DirectionalCounts = field(default_factory=DirectionalCounts)
    density: DensityResult = field(default_factory=lambda: DensityResult("LOW", 0))
    tracks: List[TrackedObject] = field(default_factory=list)
    annotated_video_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "error_message": self.error_message,
            "frames_processed": self.frames_processed,
            "processing_fps": round(self.processing_fps, 2),
            "total_unique_vehicles": self.total_unique_vehicles,
            "active_tracks": self.active_tracks,
            "vehicles_by_class": self.vehicles_by_class,
            "directional_counts": self.directional_counts.to_dict(),
            "density": self.density.to_dict(),
            "tracks": [t.to_dict() for t in self.tracks],
            "annotated_video_path": self.annotated_video_path,
        }
