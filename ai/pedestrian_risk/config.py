"""
Configuration parameters for Pedestrian Risk Intelligence & Mitigation Engine.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Tuple


@dataclass
class PedestrianRiskWeights:
    """Configurable weights for the 0-100 explainable composite risk model."""
    pedestrian_activity: float = 0.25      # 25%
    vehicle_density: float = 0.20          # 20%
    proximity_events: float = 0.25         # 25%
    recurrence_density: float = 0.15       # 15%
    visibility_lighting: float = 0.10      # 10%
    infrastructure_defect: float = 0.05    # 5%

    def validate(self) -> bool:
        total = (
            self.pedestrian_activity
            + self.vehicle_density
            + self.proximity_events
            + self.recurrence_density
            + self.visibility_lighting
            + self.infrastructure_defect
        )
        return abs(total - 1.0) < 1e-4


@dataclass
class PedestrianRiskConfig:
    # Model Weights
    weights: PedestrianRiskWeights = field(default_factory=PedestrianRiskWeights)

    # Classification Thresholds
    threshold_low_max: int = 24
    threshold_moderate_max: int = 49
    threshold_high_max: int = 74
    # >= 75 is CRITICAL

    # Spatial Hotspot Clustering Radius (~150 meters)
    cluster_distance_meters: float = 150.0
    # Approximate degree offset at Pune latitude (~18.5 deg N)
    cluster_degree_tolerance: float = 0.0014

    # Independent Multi-Bus Consensus Corroboration Window (7 days default)
    consensus_time_window_hours: int = 168
    consensus_corroboration_min_buses: int = 2
    consensus_consensus_min_buses: int = 3

    # Data Sufficiency Minimums
    good_min_observations: int = 5
    good_min_unique_buses: int = 2
    limited_min_observations: int = 2

    # Standard 4 Time-of-Day Windows (Hour Ranges, 24-hr format)
    time_windows: Tuple[Tuple[str, int, int], ...] = (
        ("06:00–09:00", 6, 9),
        ("09:00–16:00", 9, 16),
        ("16:00–19:00", 16, 19),
        ("19:00–22:00", 19, 22),
    )

    # Mitigation What-If Modelled Score Reduction Points
    whatif_reductions: Dict[str, int] = None

    def __post_init__(self):
        if self.whatif_reductions is None:
            self.whatif_reductions = {
                "CROSSING_IMPROVEMENT": 18,
                "STREET_LIGHTING": 12,
                "TRAFFIC_CALMING": 15,
                "TARGETED_ENFORCEMENT": 10,
                "COMBINED_INTERVENTION": 28,
            }


DEFAULT_PEDESTRIAN_CONFIG = PedestrianRiskConfig()
