"""
Domain models for Observation Reliability Intelligence (Phase 5, SIH 2026 PS 26124).
Provides transparent, explainable reliability assessment distinguishing:
1. AI Detection Confidence (raw model confidence)
2. Observation Quality (measured visual and temporal properties)
3. Operational Confidence (quality-adjusted confidence, guaranteed <= raw confidence)
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ObservationQuality:
    """
    Measured quality metrics of an observation.
    All score fields represent normalized values in [0.0, 1.0].
    Unmeasured properties are explicitly represented as None.
    """
    lighting_score: Optional[float] = None
    blur_score: Optional[float] = None
    visibility_score: Optional[float] = None
    temporal_stability_score: Optional[float] = None
    occlusion_score: Optional[float] = None  # None = not measured
    camera_angle_score: Optional[float] = None  # None = not measured
    overall_reliability: float = 1.0
    is_measured: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "lighting_score": round(self.lighting_score, 4) if self.lighting_score is not None else None,
            "blur_score": round(self.blur_score, 4) if self.blur_score is not None else None,
            "visibility_score": round(self.visibility_score, 4) if self.visibility_score is not None else None,
            "temporal_stability_score": round(self.temporal_stability_score, 4) if self.temporal_stability_score is not None else None,
            "occlusion_score": round(self.occlusion_score, 4) if self.occlusion_score is not None else None,
            "camera_angle_score": round(self.camera_angle_score, 4) if self.camera_angle_score is not None else None,
            "overall_reliability": round(self.overall_reliability, 4),
            "is_measured": self.is_measured,
        }


@dataclass
class ReliabilityResult:
    """
    Comprehensive reliability assessment output.
    """
    raw_confidence: float
    reliability_score: float
    operational_confidence: float
    factors: Dict[str, float] = field(default_factory=dict)
    unavailable_factors: List[str] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)
    is_measured: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "score": round(self.reliability_score, 4),
            "raw_confidence": round(self.raw_confidence, 4),
            "operational_confidence": round(self.operational_confidence, 4),
            "factors": {k: round(v, 4) for k, v in self.factors.items()},
            "unavailable_factors": list(self.unavailable_factors),
            "reasons": list(self.reasons),
            "is_measured": self.is_measured,
        }
