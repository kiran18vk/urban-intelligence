"""
Road Defect and Damage Detection Module (Phase 3A, SIH 2026 PS 26124).
DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
"""

from ai.road_damage.config import RoadDamageConfig
from ai.road_damage.detector import RoadDamageDetector
from ai.road_damage.models import (
    RoadDamageFrameResult,
    RoadDamagePipelineResult,
    RoadDefectDetection,
)
from ai.road_damage.pipeline import RoadDamagePipeline

__all__ = [
    "RoadDamageConfig",
    "RoadDamageDetector",
    "RoadDamagePipeline",
    "RoadDefectDetection",
    "RoadDamageFrameResult",
    "RoadDamagePipelineResult",
]
