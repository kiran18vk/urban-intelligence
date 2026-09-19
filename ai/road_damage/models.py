"""
Domain models for Road Defect Detection (Phase 3A, SIH 2026 PS 26124).
DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class RoadDefectDetection:
    """Represents an individual road damage detection in an image or video frame."""
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    frame_index: Optional[int] = None
    timestamp_sec: Optional[float] = None
    source_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "class_name": self.class_name,
            "confidence": round(self.confidence, 4),
            "bbox": [round(v, 2) for v in self.bbox],
            "frame_index": self.frame_index,
            "timestamp_sec": round(self.timestamp_sec, 2) if self.timestamp_sec is not None else None,
            "source_id": self.source_id,
        }


@dataclass
class RoadDamageFrameResult:
    """Container for all road defects detected in a single frame."""
    frame_index: int
    timestamp_sec: float
    detections: List[RoadDefectDetection] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "frame_index": self.frame_index,
            "timestamp_sec": round(self.timestamp_sec, 2),
            "detection_count": len(self.detections),
            "detections": [d.to_dict() for d in self.detections],
        }


@dataclass
class RoadDamagePipelineResult:
    """Aggregated output from running road damage detection on an image or video."""
    status: str = "success"
    error_message: Optional[str] = None
    frames_processed: int = 0
    processing_fps: float = 0.0
    total_detections: int = 0
    defects_by_class: Dict[str, int] = field(default_factory=dict)
    frame_results: List[RoadDamageFrameResult] = field(default_factory=list)
    annotated_output_path: Optional[str] = None
    model_path: Optional[str] = None
    benchmark_disclaimer: str = "BENCHMARK MODEL — NOT FINAL PROJECT MODEL"
    aggregation_note: str = (
        "Total detections represent frame-level box observations across video/image input, "
        "not deduplicated physical road defects (spatial consensus/deduplication is handled in later phases)."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "status": self.status,
            "error_message": self.error_message,
            "benchmark_disclaimer": self.benchmark_disclaimer,
            "aggregation_note": self.aggregation_note,
            "frames_processed": self.frames_processed,
            "processing_fps": round(self.processing_fps, 2),
            "total_detections": self.total_detections,
            "defects_by_class": self.defects_by_class,
            "model_path": self.model_path,
            "annotated_output_path": self.annotated_output_path,
            "frame_results": [f.to_dict() for f in self.frame_results],
        }
