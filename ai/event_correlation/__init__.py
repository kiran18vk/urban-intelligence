"""
Generic Multi-Bus Event Correlation Module (SIH 2026 PS 26124).
Provides spatial-temporal clustering and independent-bus corroboration for UrbanEvents.
"""
from ai.event_correlation.models import (
    CorrelatedEvent,
    CorrelationSummary,
    CorrelationLevel,
    CorrelationStatus,
    CorrelationFreshness,
)
from ai.event_correlation.config import (
    EventCorrelationConfig,
    DEFAULT_CORRELATION_CONFIG,
)
from ai.event_correlation.correlator import (
    EventCorrelator,
    get_default_testbed_events,
)
from ai.event_correlation.cluster_engine import (
    EventClusterEngine,
    haversine_distance,
)
from ai.event_correlation.confidence import (
    calculate_correlation_strength,
    determine_correlation_level,
    calculate_canonical_location,
    aggregate_confidences,
    aggregate_severity,
    determine_freshness,
    determine_status,
)
from ai.event_correlation.explain import (
    generate_correlation_explanation,
)

__all__ = [
    "CorrelatedEvent",
    "CorrelationSummary",
    "CorrelationLevel",
    "CorrelationStatus",
    "CorrelationFreshness",
    "EventCorrelationConfig",
    "DEFAULT_CORRELATION_CONFIG",
    "EventCorrelator",
    "get_default_testbed_events",
    "EventClusterEngine",
    "haversine_distance",
    "calculate_correlation_strength",
    "determine_correlation_level",
    "calculate_canonical_location",
    "aggregate_confidences",
    "aggregate_severity",
    "determine_freshness",
    "determine_status",
    "generate_correlation_explanation",
]
