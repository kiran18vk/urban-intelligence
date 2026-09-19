"""
Configuration for Road Defect Detection (Phase 3A, SIH 2026 PS 26124).

DISCLAIMER:
BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
This module integrates an external benchmark checkpoint for evaluation.
It does not claim production accuracy or official RDD2022-India training.
"""

import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

# Benchmark checkpoint default location (outside git repository)
DEFAULT_BENCHMARK_MODEL_PATH = Path(r"C:\Users\KIRAN\Desktop\road_damage_benchmark\yolov9s_best.pt")

# Supported classes detected by the benchmark checkpoint
SUPPORTED_ROAD_DEFECT_CLASSES: List[str] = [
    "alligator",
    "block",
    "crack",
    "edge",
    "longitudinal",
    "pothole",
    "transverse",
]

# Distinct BGR bounding box colors for annotation
DEFECT_CLASS_COLORS_BGR: Dict[str, Tuple[int, int, int]] = {
    "pothole": (0, 0, 255),         # Bright Red for high severity potholes
    "alligator": (0, 140, 255),      # Orange
    "longitudinal": (0, 215, 255),   # Yellow-Orange
    "transverse": (255, 191, 0),     # Deep Sky Blue
    "crack": (255, 0, 255),          # Magenta
    "block": (180, 105, 255),        # Pink
    "edge": (50, 205, 50),           # Lime Green
}
DEFAULT_DEFECT_COLOR_BGR: Tuple[int, int, int] = (0, 255, 255)

BENCHMARK_DISCLAIMER_TEXT: str = "BENCHMARK MODEL — NOT FINAL PROJECT MODEL"


@dataclass
class RoadDamageConfig:
    """Runtime configuration for RoadDamageDetector and RoadDamagePipeline."""
    model_path: Union[str, Path] = field(
        default_factory=lambda: Path(
            os.getenv("ROAD_DAMAGE_MODEL_PATH", str(DEFAULT_BENCHMARK_MODEL_PATH))
        )
    )
    confidence_threshold: float = 0.25
    iou_threshold: float = 0.45
    max_detections: int = 300
    device: str = "cpu"
    target_classes: List[str] = field(
        default_factory=lambda: list(SUPPORTED_ROAD_DEFECT_CLASSES)
    )
    disclaimer: str = BENCHMARK_DISCLAIMER_TEXT

    def __post_init__(self):
        if isinstance(self.model_path, str):
            self.model_path = Path(self.model_path)
