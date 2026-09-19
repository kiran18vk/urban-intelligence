"""
Persistent SQLite Storage for the Authority Alert & Action Center.
Maintains authority_actions and action_history tables across application restarts.
"""
import sqlite3
import json
import os
import time
from typing import Dict, List, Optional, Any, Tuple
from .models import AuthorityAction, ActionHistoryEntry, AuthorityActionSummary, ActionStatus, ActionPriority


DB_FILENAME = "authority_actions.db"


class AuthorityActionStore:
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            # Default to backend directory or current workspace root
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            self.db_path = os.path.join(base_dir, DB_FILENAME)
        else:
            self.db_path = db_path

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Authority Actions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS authority_actions (
                    action_id TEXT PRIMARY KEY,
                    target_id TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    severity TEXT NOT NULL,
                    priority TEXT NOT NULL,
                    status TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    assigned_team TEXT,
                    assigned_operator TEXT,
                    source_bus_ids TEXT,
                    correlation_id TEXT,
                    review_id TEXT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    simulated_gps INTEGER NOT NULL DEFAULT 1,
                    evidence_refs TEXT,
                    created_at REAL NOT NULL,
                    assigned_at REAL,
                    actioned_at REAL,
                    reobserve_at REAL,
                    closed_at REAL,
                    due_at REAL,
                    action_notes TEXT,
                    closure_notes TEXT,
                    created_by TEXT NOT NULL DEFAULT 'system',
                    updated_at REAL NOT NULL,
                    operational_confidence REAL NOT NULL DEFAULT 0.80,
                    reliability REAL NOT NULL DEFAULT 0.85,
                    priority_explanation TEXT,
                    recommended_response TEXT,
                    metadata_json TEXT
                )
            """)

            # Action history audit trail
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS action_history (
                    entry_id TEXT PRIMARY KEY,
                    action_id TEXT NOT NULL,
                    from_status TEXT NOT NULL,
                    to_status TEXT NOT NULL,
                    operator TEXT NOT NULL,
                    notes TEXT,
                    timestamp REAL NOT NULL,
                    FOREIGN KEY (action_id) REFERENCES authority_actions(action_id) ON DELETE CASCADE
                )
            """)

            # Indexes for quick queue and audit queries
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_target ON authority_actions (target_id, target_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_status ON authority_actions (status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_priority ON authority_actions (priority)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_type ON authority_actions (action_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_team ON authority_actions (assigned_team)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_corr ON authority_actions (correlation_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_rev ON authority_actions (review_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_actions_created ON authority_actions (created_at)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_history_action ON action_history (action_id, timestamp)")
            conn.commit()

    def save_action(self, action: AuthorityAction) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO authority_actions (
                    action_id, target_id, target_type, event_type, title, description,
                    severity, priority, status, action_type, assigned_team, assigned_operator,
                    source_bus_ids, correlation_id, review_id, latitude, longitude,
                    simulated_gps, evidence_refs, created_at, assigned_at, actioned_at,
                    reobserve_at, closed_at, due_at, action_notes, closure_notes,
                    created_by, updated_at, operational_confidence, reliability,
                    priority_explanation, recommended_response, metadata_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                action.action_id,
                action.target_id,
                action.target_type,
                action.event_type,
                action.title,
                action.description,
                action.severity,
                action.priority,
                action.status,
                action.action_type,
                action.assigned_team,
                action.assigned_operator,
                json.dumps(action.source_bus_ids),
                action.correlation_id,
                action.review_id,
                action.latitude,
                action.longitude,
                1 if action.simulated_gps else 0,
                json.dumps(action.evidence_refs),
                action.created_at,
                action.assigned_at,
                action.actioned_at,
                action.reobserve_at,
                action.closed_at,
                action.due_at,
                action.action_notes,
                action.closure_notes,
                action.created_by,
                action.updated_at,
                action.operational_confidence,
                action.reliability,
                action.priority_explanation,
                action.recommended_response,
                json.dumps(action.metadata or {}),
            ))
            conn.commit()

    def add_history_entry(self, entry: ActionHistoryEntry) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO action_history (
                    entry_id, action_id, from_status, to_status, operator, notes, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                entry.entry_id,
                entry.action_id,
                entry.from_status,
                entry.to_status,
                entry.operator,
                entry.notes,
                entry.timestamp,
            ))
            conn.commit()

    def get_action_by_id(self, action_id: str) -> Optional[AuthorityAction]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM authority_actions WHERE action_id = ?", (action_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_action(row)

    def get_action_by_target(self, target_id: str, target_type: Optional[str] = None) -> Optional[AuthorityAction]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if target_type:
                cursor.execute(
                    "SELECT * FROM authority_actions WHERE target_id = ? AND target_type = ? AND status != 'CANCELLED' LIMIT 1",
                    (target_id, target_type)
                )
            else:
                cursor.execute(
                    "SELECT * FROM authority_actions WHERE target_id = ? AND status != 'CANCELLED' LIMIT 1",
                    (target_id,)
                )
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_action(row)

    def get_history_for_action(self, action_id: str) -> List[ActionHistoryEntry]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM action_history WHERE action_id = ? ORDER BY timestamp ASC",
                (action_id,)
            )
            rows = cursor.fetchall()
            return [
                ActionHistoryEntry(
                    entry_id=r["entry_id"],
                    action_id=r["action_id"],
                    from_status=r["from_status"],
                    to_status=r["to_status"],
                    operator=r["operator"],
                    notes=r["notes"],
                    timestamp=r["timestamp"],
                )
                for r in rows
            ]

    def query_actions(
        self,
        status: Optional[str] = None,
        priority: Optional[str] = None,
        action_type: Optional[str] = None,
        target_type: Optional[str] = None,
        assigned_team: Optional[str] = None,
        bus_id: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> Tuple[List[AuthorityAction], int]:
        conditions = []
        params = []

        if status and status != "ALL":
            conditions.append("status = ?")
            params.append(status.upper())

        if priority and priority != "ALL":
            conditions.append("priority = ?")
            params.append(priority.upper())

        if action_type and action_type != "ALL":
            conditions.append("action_type = ?")
            params.append(action_type.upper())

        if target_type and target_type != "ALL":
            conditions.append("target_type = ?")
            params.append(target_type.upper())

        if assigned_team and assigned_team != "ALL":
            conditions.append("assigned_team = ?")
            params.append(assigned_team)

        if bus_id and bus_id.strip():
            conditions.append("source_bus_ids LIKE ?")
            params.append(f"%{bus_id.strip()}%")

        if search and search.strip():
            s = f"%{search.strip()}%"
            conditions.append("(action_id LIKE ? OR target_id LIKE ? OR title LIKE ? OR description LIKE ?)")
            params.extend([s, s, s, s])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        with self._get_connection() as conn:
            cursor = conn.cursor()
            # Count total
            cursor.execute(f"SELECT COUNT(*) as total FROM authority_actions {where_clause}", tuple(params))
            total = cursor.fetchone()["total"]

            # Ordering: open items first (NEW, ASSIGNED, ACTIONED, REOBSERVE), then by priority (CRITICAL > HIGH > MEDIUM > LOW), then created_at DESC
            order_by = """
                ORDER BY
                    CASE status
                        WHEN 'NEW' THEN 1
                        WHEN 'ASSIGNED' THEN 2
                        WHEN 'ACTIONED' THEN 3
                        WHEN 'REOBSERVE' THEN 4
                        WHEN 'CLOSED' THEN 5
                        WHEN 'CANCELLED' THEN 6
                        ELSE 7
                    END ASC,
                    CASE priority
                        WHEN 'CRITICAL' THEN 1
                        WHEN 'HIGH' THEN 2
                        WHEN 'MEDIUM' THEN 3
                        WHEN 'LOW' THEN 4
                        ELSE 5
                    END ASC,
                    created_at DESC
            """
            offset = max(0, (page - 1) * page_size)
            query = f"SELECT * FROM authority_actions {where_clause} {order_by} LIMIT ? OFFSET ?"
            cursor.execute(query, tuple(params + [page_size, offset]))
            rows = cursor.fetchall()
            items = [self._row_to_action(r) for r in rows]
            return items, total

    def get_summary(self) -> AuthorityActionSummary:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT status, priority, action_type, target_type, assigned_team FROM authority_actions")
            rows = cursor.fetchall()

            total = len(rows)
            open_count = 0
            critical_count = 0
            assigned_count = 0
            actioned_count = 0
            reobserve_count = 0
            closed_count = 0
            cancelled_count = 0

            by_type: Dict[str, int] = {}
            by_priority: Dict[str, int] = {}
            by_target_type: Dict[str, int] = {}
            by_assigned_team: Dict[str, int] = {}

            for r in rows:
                st = r["status"]
                pr = r["priority"]
                at = r["action_type"]
                tt = r["target_type"]
                tm = r["assigned_team"] or "Unassigned"

                if st in ["NEW", "ASSIGNED", "ACTIONED", "REOBSERVE"]:
                    open_count += 1

                if pr == "CRITICAL" and st != "CLOSED" and st != "CANCELLED":
                    critical_count += 1

                if st == "ASSIGNED":
                    assigned_count += 1
                elif st == "ACTIONED":
                    actioned_count += 1
                elif st == "REOBSERVE":
                    reobserve_count += 1
                elif st == "CLOSED":
                    closed_count += 1
                elif st == "CANCELLED":
                    cancelled_count += 1

                by_type[at] = by_type.get(at, 0) + 1
                by_priority[pr] = by_priority.get(pr, 0) + 1
                by_target_type[tt] = by_target_type.get(tt, 0) + 1
                by_assigned_team[tm] = by_assigned_team.get(tm, 0) + 1

            return AuthorityActionSummary(
                total=total,
                open_count=open_count,
                critical_count=critical_count,
                assigned_count=assigned_count,
                actioned_count=actioned_count,
                reobserve_count=reobserve_count,
                closed_count=closed_count,
                cancelled_count=cancelled_count,
                by_type=by_type,
                by_priority=by_priority,
                by_target_type=by_target_type,
                by_assigned_team=by_assigned_team,
                generated_at=time.time(),
            )

    def _row_to_action(self, row: sqlite3.Row) -> AuthorityAction:
        return AuthorityAction(
            action_id=row["action_id"],
            target_id=row["target_id"],
            target_type=row["target_type"],
            event_type=row["event_type"],
            title=row["title"],
            description=row["description"],
            severity=row["severity"],
            priority=row["priority"],
            status=row["status"],
            action_type=row["action_type"],
            assigned_team=row["assigned_team"],
            assigned_operator=row["assigned_operator"],
            source_bus_ids=json.loads(row["source_bus_ids"] or "[]"),
            correlation_id=row["correlation_id"],
            review_id=row["review_id"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            simulated_gps=bool(row["simulated_gps"]),
            evidence_refs=json.loads(row["evidence_refs"] or "[]"),
            created_at=row["created_at"],
            assigned_at=row["assigned_at"],
            actioned_at=row["actioned_at"],
            reobserve_at=row["reobserve_at"],
            closed_at=row["closed_at"],
            due_at=row["due_at"],
            action_notes=row["action_notes"],
            closure_notes=row["closure_notes"],
            created_by=row["created_by"],
            updated_at=row["updated_at"],
            operational_confidence=row["operational_confidence"],
            reliability=row["reliability"],
            priority_explanation=row["priority_explanation"],
            recommended_response=row["recommended_response"],
            metadata=json.loads(row["metadata_json"] or "{}"),
        )
