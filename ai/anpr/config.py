"""
Configuration settings for Phase 2B ANPR/OCR (SIH 2026 PS 26124).
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Tuple

# OCR Confidence threshold for plate confirmation
DEFAULT_OCR_CONFIDENCE_THRESHOLD: float = 0.40

# Target vehicle classes eligible for license plate inspection
ANPR_VEHICLE_CLASSES: List[str] = [
    "car", "bus", "truck", "motorcycle"
]

# Aspect ratio bounds for candidate license plates (width / height)
# Indian plates are typically standard rectangular (e.g. 500x120mm ~ 4.16) or square (340x200mm ~ 1.7)
PLATE_ASPECT_RATIO_RANGE: Tuple[float, float] = (1.5, 6.0)

# Fractional vertical region of vehicle bbox where plates are located (lower portion)
PLATE_ROI_TOP_FRACTION: float = 0.50     # Search in bottom 50% of vehicle bounding box
PLATE_ROI_BOTTOM_FRACTION: float = 1.00

# Minimum crop dimensions (in pixels) to attempt OCR
MIN_PLATE_WIDTH: int = 40
MIN_PLATE_HEIGHT: int = 15


@dataclass
class ANPRConfig:
    ocr_confidence_threshold: float = DEFAULT_OCR_CONFIDENCE_THRESHOLD
    target_vehicle_classes: List[str] = field(default_factory=lambda: list(ANPR_VEHICLE_CLASSES))
    aspect_ratio_range: Tuple[float, float] = PLATE_ASPECT_RATIO_RANGE
    roi_top_fraction: float = PLATE_ROI_TOP_FRACTION
    roi_bottom_fraction: float = PLATE_ROI_BOTTOM_FRACTION
    min_plate_width: int = MIN_PLATE_WIDTH
    min_plate_height: int = MIN_PLATE_HEIGHT
    use_gpu: bool = False
    ocr_languages: List[str] = field(default_factory=lambda: ["en"])
