"""
Configuration for Local AI Inference Engine (SIH 2026 PS 26124).
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Union

# Directories
AI_DIR = Path(__file__).resolve().parent
MODELS_DIR = AI_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Default lightweight model (YOLOv8 Nano)
DEFAULT_MODEL_NAME = "yolov8n.pt"
DEFAULT_MODEL_PATH = MODELS_DIR / DEFAULT_MODEL_NAME

# Standard COCO vehicle & pedestrian classes detectable by the pretrained model.
# NOTE: Pretrained standard COCO weights detect common vehicles and pedestrians.
# Specialized road defects (potholes, waterlogging, damaged signage) require custom trained weights.
SUPPORTED_CLASSES = [
    "car",
    "motorcycle",
    "bus",
    "truck",
    "bicycle",
    "person",
]

@dataclass
class DetectorConfig:
    """Configuration parameters for the YOLODetector."""
    model_path: Union[str, Path] = DEFAULT_MODEL_PATH
    confidence_threshold: float = 0.25
    img_size: int = 640
    device: str = "cpu"  # "cpu" or "cuda" / "cuda:0"
    target_classes: List[str] = field(default_factory=lambda: list(SUPPORTED_CLASSES))

    def __post_init__(self):
        # Ensure path is a Path object or standard string
        if isinstance(self.model_path, str):
            self.model_path = Path(self.model_path)
