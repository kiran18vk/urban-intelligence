"""
Phase 2B ANPR (Automatic Number Plate Recognition) package.
"""

from .config import ANPRConfig
from .models import PlateResult, VehiclePlateRecord, ANPRPipelineResult
from .plate_detector import LicensePlateDetector
from .ocr import PlateOCR
from .validator import normalize_plate_text, validate_indian_registration, evaluate_plate_status
from .pipeline import ANPRPipeline

__all__ = [
    "ANPRConfig",
    "PlateResult",
    "VehiclePlateRecord",
    "ANPRPipelineResult",
    "LicensePlateDetector",
    "PlateOCR",
    "normalize_plate_text",
    "validate_indian_registration",
    "evaluate_plate_status",
    "ANPRPipeline",
]
