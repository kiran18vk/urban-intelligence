"""
SQLite Local Persistent Store for Edge Event Queue.
Guarantees durability across application restarts, idempotency by event_id,
and priority-based storage management during network disruption.
"""
import json
import sqlite3
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

from ai.offline_queue.config import EdgeQueueConfig, DEFAULT_EDGE_CONFIG
from ai.offline_queue.models import (
    ConnectivityState,
    QueuedEvent,
    QueueStatus,
    QueueStatusSummary,
)

# Priority ranking for SQL sorting: CRITICAL (1), HIGH (2), MEDIUM (3), LOW (4)
SEVERITY_PRIORITY_MAP = {
    "CRITICAL": 1,
    "HIGH": 2,
    "MEDIUM": 3,
    "LOW": 4,
}


class SQLiteQueueStore:
    """Durably manages queued urban events in a local SQLite database."""

    def __init__(self, config: Optional[EdgeQueueConfig] = None):
        self.config = config or DEFAULT_EDGE_CONFIG
        self.db_path = Path(self.config.db_path)
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes tables and performance indexes if not present."""
        with self._get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS edge_event_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    queue_id TEXT UNIQUE NOT NULL,
                    event_id TEXT UNIQUE NOT NULL,
                    event_type TEXT NOT NULL,
                    bus_id TEXT NOT NULL,
                    camera_id TEXT NOT NULL,
                    timestamp REAL NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    confidence REAL NOT NULL,
                    operational_confidence REAL,
                    reliability_json TEXT,
                    severity TEXT NOT NULL,
                    severity_rank INTEGER NOT NULL,
                    payload_reference TEXT,
                    evidence_reference TEXT,
                    created_at REAL NOT NULL,
                    retry_count INTEGER DEFAULT 0,
                    status TEXT DEFAULT 'PENDING',
                    last_attempt_at REAL,
                    synced_at REAL,
                    error_message TEXT
                )
            """)
            conn.execute("CREATE INDEX IF NOT EXISTS idx_edge_status ON edge_event_queue(status)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_edge_event_id ON edge_event_queue(event_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_edge_priority ON edge_event_queue(status, severity_rank, created_at)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_edge_created ON edge_event_queue(created_at)")
            conn.commit()

    def _row_to_event(self, row: sqlite3.Row) -> QueuedEvent:
        rel_dict = None
        if row["reliability_json"]:
            try:
                rel_dict = json.loads(row["reliability_json"])
            except Exception:
                rel_dict = None

        return QueuedEvent(
            queue_id=row["queue_id"],
            event_id=row["event_id"],
            event_type=row["event_type"],
            bus_id=row["bus_id"],
            camera_id=row["camera_id"],
            timestamp=row["timestamp"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            confidence=row["confidence"],
            operational_confidence=row["operational_confidence"],
            reliability=rel_dict,
            severity=row["severity"],
            payload_reference=row["payload_reference"],
            evidence_reference=row["evidence_reference"] or "EVIDENCE_REFERENCE_UNAVAILABLE",
            created_at=row["created_at"],
            retry_count=row["retry_count"],
            status=QueueStatus(row["status"]) if row["status"] in QueueStatus.__members__ else QueueStatus.PENDING,
            last_attempt_at=row["last_attempt_at"],
            synced_at=row["synced_at"],
            error_message=row["error_message"],
        )

    def enqueue(self, event: QueuedEvent) -> QueuedEvent:
        """
        Enqueues an urban event into local storage.
        Enforces idempotency by event_id and handles capacity management.
        """
        severity_upper = (event.severity or "HIGH").upper()
        severity_rank = SEVERITY_PRIORITY_MAP.get(severity_upper, 3)

        with self._get_connection() as conn:
            # 1. Idempotency check: if event_id already exists, return existing
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM edge_event_queue WHERE event_id = ?", (event.event_id,))
            existing = cursor.fetchone()
            if existing:
                return self._row_to_event(existing)

            # 2. Capacity management: check total non-synced items
            cursor.execute("SELECT COUNT(*) FROM edge_event_queue WHERE status IN ('PENDING', 'SYNCING')")
            active_count = cursor.fetchone()[0]

            if active_count >= self.config.max_queue_size:
                # If new event is critical or high, evict lowest priority oldest non-critical events
                if severity_rank <= 2:
                    cursor.execute("""
                        SELECT id FROM edge_event_queue 
                        WHERE status = 'PENDING' AND severity_rank > 2 
                        ORDER BY severity_rank DESC, created_at ASC 
                        LIMIT 1
                    """)
                    to_evict = cursor.fetchone()
                    if to_evict:
                        conn.execute("DELETE FROM edge_event_queue WHERE id = ?", (to_evict["id"],))
                    else:
                        # If queue is filled with high/critical, evict oldest pending
                        cursor.execute("""
                            SELECT id FROM edge_event_queue 
                            WHERE status = 'PENDING' 
                            ORDER BY severity_rank DESC, created_at ASC 
                            LIMIT 1
                        """)
                        to_evict_old = cursor.fetchone()
                        if to_evict_old:
                            conn.execute("DELETE FROM edge_event_queue WHERE id = ?", (to_evict_old["id"],))
                else:
                    # Low/medium event under queue pressure: mark expired or reject
                    event.status = QueueStatus.EXPIRED
                    event.error_message = "Queue capacity exceeded; event expired under priority pressure"

            rel_json = json.dumps(event.reliability) if event.reliability else None
            status_val = event.status.value if isinstance(event.status, QueueStatus) else str(event.status)
            ev_ref = event.evidence_reference or "EVIDENCE_REFERENCE_UNAVAILABLE"

            conn.execute("""
                INSERT INTO edge_event_queue (
                    queue_id, event_id, event_type, bus_id, camera_id, timestamp,
                    latitude, longitude, confidence, operational_confidence,
                    reliability_json, severity, severity_rank, payload_reference,
                    evidence_reference, created_at, retry_count, status,
                    last_attempt_at, synced_at, error_message
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.queue_id, event.event_id, event.event_type, event.bus_id, event.camera_id,
                event.timestamp, event.latitude, event.longitude, event.confidence,
                event.operational_confidence, rel_json, severity_upper, severity_rank,
                event.payload_reference, ev_ref, event.created_at,
                event.retry_count, status_val, event.last_attempt_at,
                event.synced_at, event.error_message
            ))
            conn.commit()

        return event

    def get_pending(self, limit: int = 50) -> List[QueuedEvent]:
        """Returns pending events ordered by priority (CRITICAL first) and timestamp."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM edge_event_queue 
                WHERE status = 'PENDING' 
                ORDER BY severity_rank ASC, timestamp ASC 
                LIMIT ?
            """, (limit,))
            rows = cursor.fetchall()
            return [self._row_to_event(r) for r in rows]

    def get_by_event_id(self, event_id: str) -> Optional[QueuedEvent]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM edge_event_queue WHERE event_id = ?", (event_id,))
            row = cursor.fetchone()
            return self._row_to_event(row) if row else None

    def get_by_queue_id(self, queue_id: str) -> Optional[QueuedEvent]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM edge_event_queue WHERE queue_id = ?", (queue_id,))
            row = cursor.fetchone()
            return self._row_to_event(row) if row else None

    def mark_syncing(self, queue_id: str):
        now = time.time()
        with self._get_connection() as conn:
            conn.execute("""
                UPDATE edge_event_queue 
                SET status = 'SYNCING', last_attempt_at = ? 
                WHERE queue_id = ?
            """, (now, queue_id))
            conn.commit()

    def mark_synced(self, queue_id: str, synced_at: Optional[float] = None):
        sync_time = synced_at or time.time()
        with self._get_connection() as conn:
            conn.execute("""
                UPDATE edge_event_queue 
                SET status = 'SYNCED', synced_at = ?, error_message = NULL 
                WHERE queue_id = ?
            """, (sync_time, queue_id))
            conn.commit()

    def mark_failed(self, queue_id: str, error_message: str, max_retries: Optional[int] = None):
        max_r = max_retries if max_retries is not None else self.config.max_retries
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT retry_count FROM edge_event_queue WHERE queue_id = ?", (queue_id,))
            row = cursor.fetchone()
            if row:
                current_retries = row["retry_count"] + 1
                new_status = QueueStatus.FAILED.value if current_retries >= max_r else QueueStatus.PENDING.value
                conn.execute("""
                    UPDATE edge_event_queue 
                    SET retry_count = ?, status = ?, error_message = ?, last_attempt_at = ? 
                    WHERE queue_id = ?
                """, (current_retries, new_status, error_message, time.time(), queue_id))
                conn.commit()

    def retry_event(self, queue_id: str) -> bool:
        """Manually or programmatically resets a FAILED event back to PENDING."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM edge_event_queue WHERE queue_id = ?", (queue_id,))
            row = cursor.fetchone()
            if row:
                conn.execute("""
                    UPDATE edge_event_queue 
                    SET status = 'PENDING', error_message = 'Manual retry scheduled' 
                    WHERE queue_id = ?
                """, (queue_id,))
                conn.commit()
                return True
            return False

    def expire_stale_events(self, expiration_hours: Optional[float] = None) -> int:
        hours = expiration_hours if expiration_hours is not None else self.config.event_expiration_hours
        cutoff_time = time.time() - (hours * 3600)
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE edge_event_queue 
                SET status = 'EXPIRED', error_message = 'Event expired based on TTL policy' 
                WHERE status = 'PENDING' AND created_at < ?
            """, (cutoff_time,))
            conn.commit()
            return cursor.rowcount

    def count_by_status(self) -> Dict[str, int]:
        counts = {"PENDING": 0, "SYNCING": 0, "SYNCED": 0, "FAILED": 0, "EXPIRED": 0}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status, COUNT(*) as cnt FROM edge_event_queue GROUP BY status")
            for row in cursor.fetchall():
                st = row["status"]
                if st in counts:
                    counts[st] = row["cnt"]
        return counts

    def get_status_summary(
        self,
        connectivity: ConnectivityState,
        last_sync: Optional[float] = None,
        active_simulation: bool = False,
    ) -> QueueStatusSummary:
        counts = self.count_by_status()
        oldest_pending = None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT MIN(created_at) FROM edge_event_queue WHERE status = 'PENDING'")
            oldest_row = cursor.fetchone()
            if oldest_row and oldest_row[0]:
                oldest_pending = oldest_row[0]

        total_q = sum(counts.values())

        return QueueStatusSummary(
            connectivity=connectivity,
            pending=counts["PENDING"],
            syncing=counts["SYNCING"],
            failed=counts["FAILED"],
            synced=counts["SYNCED"],
            total_queued=total_q,
            oldest_pending=oldest_pending,
            last_sync=last_sync,
            queue_capacity=self.config.max_queue_size,
            active_simulation=active_simulation,
        )

    def list_events(self, status: Optional[str] = None, limit: int = 100) -> List[QueuedEvent]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if status and status.upper() in QueueStatus.__members__:
                cursor.execute("""
                    SELECT * FROM edge_event_queue 
                    WHERE status = ? 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (status.upper(), limit))
            else:
                cursor.execute("""
                    SELECT * FROM edge_event_queue 
                    ORDER BY created_at DESC 
                    LIMIT ?
                """, (limit,))
            rows = cursor.fetchall()
            return [self._row_to_event(r) for r in rows]

    def clear_synced(self) -> int:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM edge_event_queue WHERE status = 'SYNCED'")
            conn.commit()
            return cursor.rowcount
