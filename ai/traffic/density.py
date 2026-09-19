"""
Traffic density classification (Phase 2C, SIH 2026 PS 26124).
Thresholds are read from config.py — not hard-coded here.
"""

from ai.traffic.config import TrafficConfig
from ai.traffic.models import DensityResult


class DensityCalculator:
    """
    Classifies current traffic as LOW / MEDIUM / HIGH based on the
    number of active tracks in the current frame.
    """

    def __init__(self, config: TrafficConfig):
        self.config = config

    def calculate(self, active_track_count: int) -> DensityResult:
        """
        Args:
            active_track_count: Number of tracks visible in the current frame.

        Returns:
            DensityResult with level string and raw count.
        """
        if active_track_count <= self.config.density_low_max:
            level = "LOW"
        elif active_track_count <= self.config.density_medium_max:
            level = "MEDIUM"
        else:
            level = "HIGH"

        return DensityResult(level=level, value=active_track_count)
