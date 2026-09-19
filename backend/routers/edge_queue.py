"""
FastAPI router for Offline Store-and-Forward Edge Event Queue.
Exposes:
  - GET  /api/edge/queue/status
  - GET  /api/edge/queue/events
  - POST /api/edge/queue/enqueue
  - POST /api/edge/queue/sync
  - POST /api/edge/queue/connectivity
  - POST /api/edge/queue/retry/{queue_id}
  - GET  /api/edge/queue/health
"""
import sys
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.offline_queue.models import (
    ConnectivityState,
    QueuedEvent,
    QueueStatus,
    QueueStatusSummary,
)
from ai.offline_queue.config import EdgeQueueConfig
from ai.offline_queue.queue_store import SQLiteQueueStore
from ai.offline_queue.connectivity import EdgeConnectivityManager
from ai.offline_queue.sync_manager import EdgeSyncManager

router = APIRouter(prefix="/edge/queue", tags=["edge-queue"])

# Global Edge Store & Connectivity instances
EDGE_CONFIG = EdgeQueueConfig(db_path=str(PROJECT_ROOT / "edge_queue.db"))
edge_queue_store = SQLiteQueueStore(EDGE_CONFIG)
edge_connectivity = EdgeConnectivityManager(initial_state=ConnectivityState.ONLINE)


def _central_event_dispatcher(event: QueuedEvent) -> bool:
    """Dispatches a synchronized event to the central platform event store."""
    try:
        try:
            from routers.events import LIVE_URBAN_EVENTS
        except ImportError:
            from backend.routers.events import LIVE_URBAN_EVENTS
        from ai.events.models import EventEvidence, GPSCoordinates, SeverityLevel, UrbanEvent

        # Check if already present to ensure idempotency
        if any(e.get("event_id") == event.event_id for e in LIVE_URBAN_EVENTS):
            return True

        severity_val = event.severity.upper() if event.severity else "HIGH"
        urban_evt = UrbanEvent(
            event_id=event.event_id,
            event_type=event.event_type,
            bus_id=event.bus_id,
            camera_id=event.camera_id,
            timestamp=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(event.timestamp)),
            gps=GPSCoordinates(event.latitude, event.longitude),
            confidence=event.confidence,
            operational_confidence=event.operational_confidence,
            severity=severity_val if severity_val in SeverityLevel.__members__ else SeverityLevel.HIGH.value,
            evidence=EventEvidence(image_path=event.evidence_reference if event.evidence_reference != "EVIDENCE_REFERENCE_UNAVAILABLE" else None),
            reliability=event.reliability,
            notes=f"Edge synchronized event from {event.bus_id}",
        )
        LIVE_URBAN_EVENTS.insert(0, urban_evt.to_dict())
        return True
    except Exception as e:
        print(f"[EDGE SYNC DISPATCH ERROR] {e}")
        return False


edge_sync_manager = EdgeSyncManager(
    store=edge_queue_store,
    connectivity_manager=edge_connectivity,
    dispatch_handler=_central_event_dispatcher,
)


def _seed_initial_edge_events():
    """Seeds a few initial edge queue demonstration events if empty."""
    counts = edge_queue_store.count_by_status()
    if sum(counts.values()) == 0:
        now = time.time()
        # 1. Recent synced event
        edge_queue_store.enqueue(QueuedEvent(
            queue_id="QEVT-SEED-01",
            event_id="EVT-SEED-01",
            event_type="ROAD_POTHOLE",
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=now - 3600,
            latitude=18.5204,
            longitude=73.8567,
            confidence=0.84,
            operational_confidence=0.79,
            severity="HIGH",
            evidence_reference="assets/road-defects/pothole-real-01.jpg",
            status=QueueStatus.SYNCED,
            synced_at=now - 3500,
        ))
        # 2. Another synced crack event
        edge_queue_store.enqueue(QueuedEvent(
            queue_id="QEVT-SEED-02",
            event_id="EVT-SEED-02",
            event_type="ROAD_CRACK",
            bus_id="PMP-BUS-003",
            camera_id="CAM-FRONT-01",
            timestamp=now - 1800,
            latitude=18.5312,
            longitude=73.8445,
            confidence=0.72,
            operational_confidence=0.65,
            severity="MEDIUM",
            evidence_reference="assets/road-defects/road-crack-real-01.jpg",
            status=QueueStatus.SYNCED,
            synced_at=now - 1700,
        ))


_seed_initial_edge_events()


# Pydantic Request Models
class EnqueueRequest(BaseModel):
    event_id: Optional[str] = None
    event_type: str = "ROAD_POTHOLE"
    bus_id: str = "PMP-BUS-001"
    camera_id: str = "CAM-FRONT-01"
    timestamp: Optional[float] = None
    latitude: float = 18.5204
    longitude: float = 73.8567
    confidence: float = Field(default=0.85, ge=0.0, le=1.0)
    operational_confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    reliability: Optional[Dict[str, Any]] = None
    severity: str = "HIGH"
    payload_reference: Optional[str] = None
    evidence_reference: Optional[str] = None


class ConnectivityRequest(BaseModel):
    state: str = Field(..., description="ONLINE | OFFLINE | DEGRADED | AUTO")


@router.get("/status")
def get_queue_status():
    """Returns real-time edge connectivity, queue counts, capacity and simulation state."""
    conn = edge_connectivity.get_connectivity()
    summary = edge_queue_store.get_status_summary(
        connectivity=conn,
        last_sync=edge_sync_manager.last_sync_time,
        active_simulation=edge_connectivity.is_simulation_active(),
    )
    return summary.to_dict()


@router.get("/events")
def get_queue_events(
    status: Optional[str] = Query(None, description="Filter by status: PENDING, SYNCING, SYNCED, FAILED, EXPIRED"),
    limit: int = Query(100, ge=1, le=500),
):
    """Lists events currently recorded in the edge SQLite queue."""
    events = edge_queue_store.list_events(status=status, limit=limit)
    return [e.to_dict() for e in events]


@router.post("/enqueue")
def enqueue_edge_event(req: EnqueueRequest):
    """
    Enqueues an urban event into local edge storage.
    If network is currently ONLINE, automatically triggers synchronization to central backend.
    """
    now = time.time()
    event = QueuedEvent(
        event_id=req.event_id or f"EVT-{time.strftime('%Y%m%d')}-{int(now * 1000) % 1000000:06d}",
        event_type=req.event_type,
        bus_id=req.bus_id,
        camera_id=req.camera_id,
        timestamp=req.timestamp or now,
        latitude=req.latitude,
        longitude=req.longitude,
        confidence=req.confidence,
        operational_confidence=req.operational_confidence,
        reliability=req.reliability,
        severity=req.severity.upper(),
        payload_reference=req.payload_reference,
        evidence_reference=req.evidence_reference or "EVIDENCE_REFERENCE_UNAVAILABLE",
    )
    saved = edge_queue_store.enqueue(event)

    # If edge is online and not simulated offline, trigger sync
    if edge_connectivity.is_online():
        edge_sync_manager.sync_pending_events(batch_size=10)
        # Fetch updated state
        updated = edge_queue_store.get_by_queue_id(saved.queue_id)
        if updated:
            saved = updated

    return saved.to_dict()


@router.post("/sync")
def sync_edge_queue(batch_size: int = Query(50, ge=1, le=200)):
    """Triggers synchronization of pending events from edge queue to central backend."""
    result = edge_sync_manager.sync_pending_events(batch_size=batch_size)
    return result


@router.post("/connectivity")
def set_connectivity_state(req: ConnectivityRequest):
    """
    Sets simulated connectivity for prototype demonstration.
    Pass state='AUTO' to clear simulation override.
    """
    st = req.state.upper()
    if st == "AUTO":
        edge_connectivity.set_simulation_state(None)
    elif st in ConnectivityState.__members__:
        edge_connectivity.set_simulation_state(ConnectivityState(st))
        # If toggled back to ONLINE, trigger auto sync
        if st == "ONLINE":
            edge_sync_manager.sync_pending_events()
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid state: {req.state}. Allowed: ONLINE, OFFLINE, DEGRADED, AUTO",
        )

    return {
        "status": "ok",
        "current_connectivity": edge_connectivity.get_connectivity().value,
        "is_simulation_active": edge_connectivity.is_simulation_active(),
        "disclaimer": "Prototype edge connectivity simulation.",
    }


@router.post("/retry/{queue_id}")
def retry_failed_event(queue_id: str):
    """Manually resets a failed event to PENDING and triggers sync if online."""
    success = edge_queue_store.retry_event(queue_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Queue event '{queue_id}' not found.")

    if edge_connectivity.is_online():
        edge_sync_manager.sync_pending_events()

    updated = edge_queue_store.get_by_queue_id(queue_id)
    return updated.to_dict() if updated else {"status": "PENDING"}


@router.get("/health")
def get_edge_health():
    """Returns the operational health and storage status of the edge queue."""
    counts = edge_queue_store.count_by_status()
    return {
        "status": "healthy",
        "db_path": str(EDGE_CONFIG.db_path),
        "db_exists": Path(EDGE_CONFIG.db_path).exists(),
        "connectivity": edge_connectivity.get_connectivity().value,
        "active_simulation": edge_connectivity.is_simulation_active(),
        "queue_counts": counts,
        "max_capacity": EDGE_CONFIG.max_queue_size,
        "disclaimer": "Prototype edge connectivity and store-and-forward simulation.",
    }
