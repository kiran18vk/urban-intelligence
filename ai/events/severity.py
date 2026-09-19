"""
Configurable Severity Rules Engine (Phase 3B, SIH 2026 PS 26124).

Rules:
  1. Road Defect Severity:
     - Based strictly on defect category + AI detection confidence.
     - Does NOT use pixel bounding box size (physical size will be added after camera calibration).
     - 'pothole': conf >= 0.70 -> HIGH, conf < 0.70 -> MEDIUM.
     - 'alligator': fatigue cracking -> MEDIUM.
     - 'longitudinal' / 'transverse' / 'crack' / 'block' / 'edge': LOW (or MEDIUM if conf >= 0.85).
  2. ANPR Severity:
     - Informational / LOW by default.
     - 'verified' means syntactic format regex + OCR threshold passed; not official registry verification.
  3. Traffic Severity:
     - HIGH density -> HIGH
     - MEDIUM density -> MEDIUM
     - LOW density -> LOW
"""

from typing import Any, Dict, Optional
from ai.events.models import EventType, SeverityLevel


class SeverityCalculator:
    """
    Evaluates perception outputs against configurable rules to determine event severity.
    """

    @staticmethod
    def calculate_road_defect_severity(
        class_name: str,
        confidence: float,
        detection_metadata: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Determines severity for road defects based on category and confidence.
        """
        cname = class_name.lower().strip()

        if cname == "pothole":
            if confidence >= 0.70:
                return SeverityLevel.HIGH.value
            return SeverityLevel.MEDIUM.value

        if cname == "alligator":
            if confidence >= 0.75:
                return SeverityLevel.MEDIUM.value
            return SeverityLevel.LOW.value

        if cname in ("longitudinal", "transverse", "crack", "block", "edge"):
            if confidence >= 0.85:
                return SeverityLevel.MEDIUM.value
            return SeverityLevel.LOW.value

        return SeverityLevel.LOW.value

    @staticmethod
    def calculate_traffic_severity(density_level: str) -> str:
        """
        Maps traffic density level (LOW, MEDIUM, HIGH) to event severity.
        """
        level = density_level.upper().strip()
        if level == "HIGH":
            return SeverityLevel.HIGH.value
        if level == "MEDIUM":
            return SeverityLevel.MEDIUM.value
        return SeverityLevel.LOW.value

    @staticmethod
    def calculate_anpr_severity(plate_status: str, confidence: float) -> str:
        """
        Determines severity for license plate events.
        Default is informational (LOW).
        """
        # Kept as LOW/informational by default
        return SeverityLevel.LOW.value

    @staticmethod
    def calculate_pedestrian_severity(confidence: float) -> str:
        """
        Determines severity for pedestrian detection/risk events.
        """
        if confidence >= 0.80:
            return SeverityLevel.MEDIUM.value
        return SeverityLevel.LOW.value
