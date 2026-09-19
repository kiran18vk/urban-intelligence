"""
Data models for Predictive Urban Intelligence & Risk Forecasting (Feature #9).
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any
import time


class ForecastTarget(str, Enum):
    ROAD_DETERIORATION = "ROAD_DETERIORATION"
    TRAFFIC_CONGESTION = "TRAFFIC_CONGESTION"
    PEDESTRIAN_RISK = "PEDESTRIAN_RISK"
    PERSISTENT_HOTSPOT = "PERSISTENT_HOTSPOT"
    MAINTENANCE_PRIORITY = "MAINTENANCE_PRIORITY"


class TrendDirection(str, Enum):
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    DETERIORATING = "DETERIORATING"
    VOLATILE = "VOLATILE"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class WarningLevel(str, Enum):
    INFO = "INFO"
    WATCH = "WATCH"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class EvidenceSufficiency(str, Enum):
    GOOD = "GOOD"
    LIMITED = "LIMITED"
    INSUFFICIENT = "INSUFFICIENT"


class HotspotStatus(str, Enum):
    EMERGING = "EMERGING"
    PERSISTENT = "PERSISTENT"
    ESCALATING = "ESCALATING"
    IMPROVING = "IMPROVING"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


@dataclass
class ForecastHistoryEntry:
    entry_id: str
    forecast_id: str
    action_type: str  # e.g. "CREATED", "RECOMPUTED", "ACTION_GENERATED", "WARNING_RAISED"
    operator: str
    from_value: Optional[str] = None
    to_value: Optional[str] = None
    notes: Optional[str] = None
    timestamp: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "entry_id": self.entry_id,
            "forecast_id": self.forecast_id,
            "action_type": self.action_type,
            "operator": self.operator,
            "from_value": self.from_value,
            "to_value": self.to_value,
            "notes": self.notes,
            "timestamp": self.timestamp,
        }


@dataclass
class PredictiveForecast:
    forecast_id: str
    target_id: str
    target_type: str  # ForecastTarget enum value
    location_name: str
    latitude: float = 18.5204
    longitude: float = 73.8567
    simulated_gps: bool = True
    
    # Observation context
    observation_window_days: float = 14.0
    historical_observation_count: int = 1
    independent_bus_count: int = 1
    source_bus_ids: List[str] = field(default_factory=lambda: ["PMP-BUS-001"])
    source_event_ids: List[str] = field(default_factory=list)
    
    # Trend Analysis
    trend_direction: str = TrendDirection.STABLE.value
    trend_strength: float = 0.50  # 0.0 to 1.0
    
    # Values & Horizon
    current_value: float = 5.0
    baseline_value: float = 5.0
    forecast_value: float = 5.0
    unit: str = "Index Score"
    current_display_label: str = "5.0"
    forecast_display_label: str = "5.0"
    forecast_horizon: str = "7 days"
    
    # Risk & Evidence Quality
    risk_level: str = RiskLevel.MEDIUM.value
    confidence: float = 75.0  # 0-100 evidence sufficiency / confidence
    reliability: float = 0.85
    evidence_sufficiency: str = EvidenceSufficiency.GOOD.value
    
    # Early Warning & Recommendations
    early_warning: str = WarningLevel.INFO.value
    warning_message: Optional[str] = None
    explanation: str = "Trend baseline established from testbed observations."
    recommended_action: str = "INSPECT"
    recommended_action_details: str = "Perform regular scheduled monitoring."
    
    # Timeseries chart data points
    timeseries_points: List[Dict[str, Any]] = field(default_factory=list)
    
    # Metadata & timestamps
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "forecast_id": self.forecast_id,
            "target_id": self.target_id,
            "target_type": self.target_type,
            "location_name": self.location_name,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "simulated_gps": self.simulated_gps,
            "observation_window_days": self.observation_window_days,
            "historical_observation_count": self.historical_observation_count,
            "independent_bus_count": self.independent_bus_count,
            "source_bus_ids": self.source_bus_ids,
            "source_event_ids": self.source_event_ids,
            "trend_direction": self.trend_direction,
            "trend_strength": self.trend_strength,
            "current_value": self.current_value,
            "baseline_value": self.baseline_value,
            "forecast_value": self.forecast_value,
            "unit": self.unit,
            "current_display_label": self.current_display_label,
            "forecast_display_label": self.forecast_display_label,
            "forecast_horizon": self.forecast_horizon,
            "risk_level": self.risk_level,
            "confidence": self.confidence,
            "reliability": self.reliability,
            "evidence_sufficiency": self.evidence_sufficiency,
            "early_warning": self.early_warning,
            "warning_message": self.warning_message,
            "explanation": self.explanation,
            "recommended_action": self.recommended_action,
            "recommended_action_details": self.recommended_action_details,
            "timeseries_points": self.timeseries_points,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }


@dataclass
class ForecastSummary:
    active_forecasts: int
    warnings: int
    deteriorating_areas: int
    persistent_hotspots: int
    forecast_actions: int
    insufficient_data: int
    average_confidence: float
    target_distribution: Dict[str, int] = field(default_factory=dict)
    trend_distribution: Dict[str, int] = field(default_factory=dict)
    warning_distribution: Dict[str, int] = field(default_factory=dict)
    disclaimer: str = (
        "Prototype forecasting: outlooks are derived from available testbed observations "
        "and are not guaranteed future events. Forecast confidence reflects evidence quality, "
        "not probability of occurrence."
    )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "active_forecasts": self.active_forecasts,
            "warnings": self.warnings,
            "deteriorating_areas": self.deteriorating_areas,
            "persistent_hotspots": self.persistent_hotspots,
            "forecast_actions": self.forecast_actions,
            "insufficient_data": self.insufficient_data,
            "average_confidence": self.average_confidence,
            "target_distribution": self.target_distribution,
            "trend_distribution": self.trend_distribution,
            "warning_distribution": self.warning_distribution,
            "disclaimer": self.disclaimer,
        }
