"""
Computer Vision AI Module for Urban Intelligence Platform (SIH 2026 PS 26124).
Local inference foundation supporting vehicle and pedestrian detection using lightweight YOLO.
"""

from .config import DetectorConfig
from .detector import YOLODetector, DetectionResult

__all__ = ["DetectorConfig", "YOLODetector", "DetectionResult"]
