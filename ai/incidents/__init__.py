"""
Incident Intelligence Package.

Provides rule-based incident detection, ANPR track association,
observation reliability integration, and conversion to UrbanEvent(HIT_AND_RUN).
"""
from ai.incidents.models import (
    IncidentType,
    IncidentStatus,
    IncidentTrigger,
    IncidentRecord,
)
from ai.incidents.config import IncidentConfig
from ai.incidents.incident_detector import IncidentDetector
from ai.incidents.incident_builder import IncidentBuilder

__all__ = [
    "IncidentType",
    "IncidentStatus",
    "IncidentTrigger",
    "IncidentRecord",
    "IncidentConfig",
    "IncidentDetector",
    "IncidentBuilder",
]
