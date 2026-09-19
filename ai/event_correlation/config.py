"""
Configuration parameters for Generic Multi-Bus Event Correlation.
Configurable spatial radius, event-specific temporal windows, and thresholds.
"""
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class EventCorrelationConfig:
    """Configurable parameters for spatial-temporal correlation."""
    # Spatial proximity threshold (meters)
    spatial_radius_meters: float = 150.0

    # Event-specific temporal windows (hours)
    temporal_windows_hours: Dict[str, float] = field(
        default_factory=lambda: {
            "ROAD_POTHOLE": 168.0,      # 7 days for persistent road defect
            "ROAD_CRACK": 168.0,        # 7 days for persistent road crack
            "TRAFFIC_CONGESTION": 2.0,  # 2 hours for transient traffic surge
            "PEDESTRIAN_RISK": 6.0,     # 6 hours for pedestrian crowding/risk
            "HIT_AND_RUN": 0.5,         # 30 minutes for incident context
            "ANPR_DETECTION": 0.5,      # 30 minutes for OCR observation
            "VEHICLE_DETECTED": 0.5,    # 30 minutes for vehicle track
            "DEFAULT": 24.0,            # 24 hours fallback
        }
    )

    # Bus count thresholds for correlation levels
    single_bus_min: int = 1
    corroboration_min_buses: int = 2
    consensus_min_buses: int = 3

    # Normalized correlation strength mappings
    strength_single: float = 0.33
    strength_corroboration: float = 0.66
    strength_consensus: float = 1.00

    # Freshness thresholds (hours since last observation)
    fresh_hours: float = 24.0
    aging_hours: float = 72.0

    # Minimum observations required to form a cluster
    min_observations: int = 1

    def get_temporal_window_hours(self, event_type: str) -> float:
        """Retrieves the temporal window in hours for the given event type."""
        return self.temporal_windows_hours.get(
            event_type,
            self.temporal_windows_hours.get("DEFAULT", 24.0)
        )


DEFAULT_CORRELATION_CONFIG = EventCorrelationConfig()
