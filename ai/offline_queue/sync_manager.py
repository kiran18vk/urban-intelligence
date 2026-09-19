"""
Edge-to-Central Synchronization Manager.
Coordinates store-and-forward batch transmission when connectivity is restored.
"""
import time
from typing import Any, Callable, Dict, List, Optional

from ai.offline_queue.connectivity import EdgeConnectivityManager
from ai.offline_queue.models import ConnectivityState, QueuedEvent
from ai.offline_queue.queue_store import SQLiteQueueStore


class EdgeSyncManager:
    """Orchestrates synchronizing locally queued events to the central backend."""

    def __init__(
        self,
        store: SQLiteQueueStore,
        connectivity_manager: EdgeConnectivityManager,
        dispatch_handler: Optional[Callable[[QueuedEvent], bool]] = None,
    ):
        self.store = store
        self.connectivity = connectivity_manager
        self.dispatch_handler = dispatch_handler
        self.last_sync_time: Optional[float] = None

    def set_dispatch_handler(self, handler: Callable[[QueuedEvent], bool]):
        self.dispatch_handler = handler

    def sync_pending_events(self, batch_size: int = 50) -> Dict[str, Any]:
        """
        Processes pending events in priority order if connectivity is ONLINE or DEGRADED.
        Returns detailed sync execution metrics.
        """
        conn_state = self.connectivity.get_connectivity()
        if conn_state == ConnectivityState.OFFLINE:
            return {
                "status": "OFFLINE",
                "synced_count": 0,
                "failed_count": 0,
                "remaining_pending": self.store.count_by_status().get("PENDING", 0),
                "message": "Sync skipped: Network is currently offline. Events remain safely in edge queue.",
            }

        # Set syncing state
        self.connectivity.set_syncing(True)
        synced_count = 0
        failed_count = 0
        errors: List[str] = []

        try:
            pending_events = self.store.get_pending(limit=batch_size)

            for event in pending_events:
                self.store.mark_syncing(event.queue_id)
                success = True
                err_msg = ""

                if self.dispatch_handler:
                    try:
                        success = self.dispatch_handler(event)
                    except Exception as e:
                        success = False
                        err_msg = str(e)
                else:
                    # Default mock dispatch (treats dispatch as successful)
                    success = True

                if success:
                    self.store.mark_synced(event.queue_id, synced_at=time.time())
                    synced_count += 1
                else:
                    err_text = err_msg or "Backend transmission rejected"
                    self.store.mark_failed(event.queue_id, error_message=err_text)
                    failed_count += 1
                    errors.append(f"{event.event_id}: {err_text}")

            self.last_sync_time = time.time()

        finally:
            self.connectivity.set_syncing(False)

        counts = self.store.count_by_status()
        return {
            "status": "SYNCED" if failed_count == 0 else "PARTIALLY_SYNCED",
            "synced_count": synced_count,
            "failed_count": failed_count,
            "remaining_pending": counts.get("PENDING", 0),
            "errors": errors,
            "last_sync": self.last_sync_time,
        }
