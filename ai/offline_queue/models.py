"""
Domain models for Offline Store-and-Forward Edge Event Queue (SIH 2026 PS 26124).
Provides resilient local persistence models when network connectivity is disrupted.
"""
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional
import time
import uuid


class ConnectivityState(str, Enum):
    """Network reachability states between Edge Bus Camera and Central Platform."""
    ONLINE = "ONLINE"
    OFFLINE = "OFFLINE"
    SYNCING = "SYNCING"
    DEGRADED = "DEGRADED"


class QueueStatus(str, Enum):
    """Lifecycle status of a locally queued event."""
    PENDING = "PENDING"
    SYNCING = "SYNCING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


@dataclass
class QueuedEvent:
    """
    Lightweight metadata container for an urban event stored at edge.
    Stores metadata and evidence references only (no raw continuous video binaries).
    """
    queue_id: str = field(default_factory=lambda: f"QEVT-{uuid.uuid4().hex[:8].upper()}")
    event_id: str = field(default_factory=lambda: f"EVT-{uuid.uuid4().hex[:8].upper()}")
    event_type: str = "ROAD_POTHOLE"
    bus_id: str = "PMP-BUS-001"
    camera_id: str = "CAM-FRONT-01"
    timestamp: float = field(default_factory=time.time)
    latitude: float = 18.5204
    longitude: float = 73.8567
    confidence: float = 0.85
    operational_confidence: Optional[float] = 0.80
    reliability: Optional[Dict[str, Any]] = None
    severity: str = "HIGH"  # CRITICAL, HIGH, MEDIUM, LOW
    payload_reference: Optional[str] = None
    evidence_reference: Optional[str] = "EVIDENCE_REFERENCE_UNAVAILABLE"
    created_at: float = field(default_factory=time.time)
    retry_count: int = 0
    status: QueueStatus = QueueStatus.PENDING
    last_attempt_at: Optional[float] = None
    synced_at: Optional[float] = None
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "queue_id": self.queue_id,
            "event_id": self.event_id,
            "event_type": self.event_type,
            "bus_id": self.bus_id,
            "camera_id": self.camera_id,
            "timestamp": self.timestamp,
            "latitude": round(self.latitude, 6),
            "longitude": round(self.longitude, 6),
            "confidence": round(self.confidence, 4),
            "operational_confidence": round(self.operational_confidence, 4) if self.operational_confidence is not None else None,
            "reliability": self.reliability,
            "severity": self.severity,
            "payload_reference": self.payload_reference,
            "evidence_reference": self.evidence_reference or "EVIDENCE_REFERENCE_UNAVAILABLE",
            "created_at": self.created_at,
            "retry_count": self.retry_count,
            "status": self.status.value if isinstance(self.status, QueueStatus) else str(self.status),
            "last_attempt_at": self.last_attempt_at,
            "synced_at": self.synced_at,
            "error_message": self.error_message,
        }


@dataclass
class QueueStatusSummary:
    """Consolidated summary of the edge store-and-forward queue."""
    connectivity: ConnectivityState
    pending: int
    syncing: int
    failed: int
    synced: int
    total_queued: int
    oldest_pending: Optional[float]
    last_sync: Optional[float]
    queue_capacity: int
    active_simulation: bool
    disclaimer: str = "Prototype edge connectivity and store-and-forward simulation."

    def to_dict(self) -> Dict[str, Any]:
        return {
            "connectivity": self.connectivity.value if isinstance(self.connectivity, ConnectivityState) else str(self.connectivity),
            "pending": self.pending,
            "syncing": self.syncing,
            "failed": self.failed,
            "synced": self.synced,
            "total_queued": self.total_queued,
            "oldest_pending": self.oldest_pending,
            "last_sync": self.last_sync,
            "queue_capacity": self.queue_capacity,
            "active_simulation": self.active_simulation,
            "disclaimer": self.disclaimer,
        }
