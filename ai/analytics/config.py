"""
Configuration for Analytics Engine (Phase 7, SIH 2026 PS 26124).
"""
from dataclasses import dataclass, field
from typing import Dict, Any, List


@dataclass
class CorridorConfig:
    """Configured transit parameters for a bus route corridor."""
    corridor_id: str
    name: str
    baseline_time_min: float
    waypoints: List[str]


DEFAULT_CORRIDORS: List[CorridorConfig] = [
    CorridorConfig("CORR-01", "Swargate - Alka Talkies Corridor", 15.0, ["Swargate", "Alka Talkies"]),
    CorridorConfig("CORR-02", "FC Road - Shivajinagar Corridor", 20.0, ["FC Road", "Shivajinagar"]),
    CorridorConfig("CORR-03", "Shivajinagar - Khadki Corridor", 18.0, ["Shivajinagar", "Khadki"]),
    CorridorConfig("CORR-04", "Kasarwadi - Pimpri Corridor", 25.0, ["Kasarwadi", "Pimpri"]),
    CorridorConfig("CORR-05", "Baner - Hinjewadi Corridor", 30.0, ["Baner", "Hinjewadi"]),
]


@dataclass
class AnalyticsConfig:
    """Analytics calculation thresholds and heuristics."""
    
    # Congestion Multipliers for Delay Estimation
    # Formula: estimated_delay_min = baseline_time_min * (congestion_factor - 1.0)
    congestion_factors: Dict[str, float] = field(
        default_factory=lambda: {
            "LOW": 1.05,
            "MEDIUM": 1.30,
            "HIGH": 1.70,
            "CRITICAL": 2.10,
        }
    )
    
    # Vehicle count density thresholds
    density_threshold_low: int = 8
    density_threshold_medium: int = 20
    
    # Reliability thresholds
    low_reliability_threshold: float = 0.70
    
    # Disclaimer
    disclaimer: str = (
        "Demonstration and deterministic aggregation analytics. Route delays are estimated using "
        "configured congestion multipliers on baseline transit times and do not represent physical GPS telemetry."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "congestion_factors": self.congestion_factors,
            "density_threshold_low": self.density_threshold_low,
            "density_threshold_medium": self.density_threshold_medium,
            "low_reliability_threshold": self.low_reliability_threshold,
            "disclaimer": self.disclaimer,
        }
