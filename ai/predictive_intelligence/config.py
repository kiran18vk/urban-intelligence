"""
Configuration constants and parameters for Predictive Urban Intelligence (Feature #9).
"""

# Spatial and temporal constraints
DEFAULT_OBSERVATION_WINDOW_DAYS = 14.0
MIN_OBSERVATIONS_FOR_SUFFICIENT_DATA = 3
MIN_BUSES_FOR_MULTI_BUS = 2
MIN_RELIABILITY_THRESHOLD = 0.60
HIGH_RELIABILITY_THRESHOLD = 0.80

# Trend thresholds
TREND_STABLE_THRESHOLD_PCT = 0.05  # ±5% change considered stable
TREND_VOLATILE_VARIANCE_THRESHOLD = 0.25

# Horizon defaults
HORIZON_ROAD_DAYS = "7 days"
HORIZON_TRAFFIC = "Next Peak Window"
HORIZON_PEDESTRIAN = "Next 7 days"
HORIZON_HOTSPOT = "14 days"
HORIZON_MAINTENANCE = "Next Maintenance Cycle (14 days)"

# Disclosures
PREDICTIVE_DISCLOSURE = (
    "Prototype forecasting: outlooks are derived from available testbed observations "
    "and are not guaranteed future events. Forecast confidence reflects evidence quality, "
    "not probability of occurrence."
)
