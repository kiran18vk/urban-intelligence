"""
Persistent SQLite Store for Re-Observations (Feature #8).
"""
import json
import os
import sqlite3
import time
from typing import Dict, List, Optional, Tuple, Any

from ai.reobservation.models import ReObservation, ReObservationHistoryEntry, ReObservationSummary


class ReObservationStore:
    """
    SQLite persistence layer for re-observation records and immutable outcome verification audit history.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.db_path = os.path.join(base_dir, "reobservation.db")
        else:
            self.db_path = db_path

        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes database schema and indexes."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reobservations (
                    reobservation_id TEXT PRIMARY KEY,
                    authority_action_id TEXT NOT NULL,
                    target_id TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    original_event_id TEXT,
                    original_correlation_id TEXT,
                    source_bus_id TEXT NOT NULL,
                    source_bus_ids TEXT NOT NULL,
                    observation_timestamp REAL NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    simulated_gps INTEGER NOT NULL,
                    evidence_refs TEXT NOT NULL,
                    raw_confidence REAL NOT NULL,
                    operational_confidence REAL NOT NULL,
                    reliability REAL NOT NULL,
                    observed_condition TEXT NOT NULL,
                    defect_count INTEGER,
                    severity TEXT NOT NULL,
                    outcome TEXT NOT NULL,
                    verification_status TEXT NOT NULL,
                    verification_score REAL NOT NULL,
                    evidence_sufficiency TEXT NOT NULL,
                    spatial_distance_m REAL NOT NULL,
                    spatial_match INTEGER NOT NULL,
                    temporal_delta_hours REAL NOT NULL,
                    corroboration_level TEXT NOT NULL,
                    independent_bus_count INTEGER NOT NULL,
                    explanation TEXT,
                    recommended_action TEXT,
                    before_observation TEXT NOT NULL,
                    after_observation TEXT NOT NULL,
                    verification_notes TEXT,
                    escalation_notes TEXT,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS reobservation_history (
                    entry_id TEXT PRIMARY KEY,
                    reobservation_id TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    operator TEXT NOT NULL,
                    from_status TEXT NOT NULL,
                    to_status TEXT NOT NULL,
                    notes TEXT,
                    timestamp REAL NOT NULL,
                    FOREIGN KEY (reobservation_id) REFERENCES reobservations (reobservation_id)
                )
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reobs_action_id ON reobservations (authority_action_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reobs_target_id ON reobservations (target_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reobs_outcome ON reobservations (outcome)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reobs_status ON reobservations (verification_status)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_reobs_history ON reobservation_history (reobservation_id)")
            conn.commit()

    def _row_to_reobservation(self, row: sqlite3.Row) -> ReObservation:
        return ReObservation(
            reobservation_id=row["reobservation_id"],
            authority_action_id=row["authority_action_id"],
            target_id=row["target_id"],
            target_type=row["target_type"],
            original_event_id=row["original_event_id"],
            original_correlation_id=row["original_correlation_id"],
            source_bus_id=row["source_bus_id"],
            source_bus_ids=json.loads(row["source_bus_ids"]),
            observation_timestamp=row["observation_timestamp"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            simulated_gps=bool(row["simulated_gps"]),
            evidence_refs=json.loads(row["evidence_refs"]),
            raw_confidence=row["raw_confidence"],
            operational_confidence=row["operational_confidence"],
            reliability=row["reliability"],
            observed_condition=row["observed_condition"],
            defect_count=row["defect_count"],
            severity=row["severity"],
            outcome=row["outcome"],
            verification_status=row["verification_status"],
            verification_score=row["verification_score"],
            evidence_sufficiency=row["evidence_sufficiency"],
            spatial_distance_m=row["spatial_distance_m"],
            spatial_match=bool(row["spatial_match"]),
            temporal_delta_hours=row["temporal_delta_hours"],
            corroboration_level=row["corroboration_level"],
            independent_bus_count=row["independent_bus_count"],
            explanation=row["explanation"],
            recommended_action=row["recommended_action"],
            before_observation=json.loads(row["before_observation"]),
            after_observation=json.loads(row["after_observation"]),
            verification_notes=row["verification_notes"],
            escalation_notes=row["escalation_notes"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )

    def save_reobservation(self, reobs: ReObservation) -> None:
        """Inserts or updates a re-observation record."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO reobservations (
                    reobservation_id, authority_action_id, target_id, target_type,
                    original_event_id, original_correlation_id, source_bus_id, source_bus_ids,
                    observation_timestamp, latitude, longitude, simulated_gps, evidence_refs,
                    raw_confidence, operational_confidence, reliability, observed_condition,
                    defect_count, severity, outcome, verification_status, verification_score,
                    evidence_sufficiency, spatial_distance_m, spatial_match, temporal_delta_hours,
                    corroboration_level, independent_bus_count, explanation, recommended_action,
                    before_observation, after_observation, verification_notes, escalation_notes,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(reobservation_id) DO UPDATE SET
                    outcome = excluded.outcome,
                    verification_status = excluded.verification_status,
                    verification_score = excluded.verification_score,
                    evidence_sufficiency = excluded.evidence_sufficiency,
                    spatial_distance_m = excluded.spatial_distance_m,
                    spatial_match = excluded.spatial_match,
                    temporal_delta_hours = excluded.temporal_delta_hours,
                    corroboration_level = excluded.corroboration_level,
                    independent_bus_count = excluded.independent_bus_count,
                    explanation = excluded.explanation,
                    recommended_action = excluded.recommended_action,
                    before_observation = excluded.before_observation,
                    after_observation = excluded.after_observation,
                    verification_notes = excluded.verification_notes,
                    escalation_notes = excluded.escalation_notes,
                    updated_at = excluded.updated_at
            """, (
                reobs.reobservation_id,
                reobs.authority_action_id,
                reobs.target_id,
                reobs.target_type,
                reobs.original_event_id,
                reobs.original_correlation_id,
                reobs.source_bus_id,
                json.dumps(reobs.source_bus_ids),
                reobs.observation_timestamp,
                reobs.latitude,
                reobs.longitude,
                1 if reobs.simulated_gps else 0,
                json.dumps(reobs.evidence_refs),
                reobs.raw_confidence,
                reobs.operational_confidence,
                reobs.reliability,
                reobs.observed_condition,
                reobs.defect_count,
                reobs.severity,
                reobs.outcome,
                reobs.verification_status,
                reobs.verification_score,
                reobs.evidence_sufficiency,
                reobs.spatial_distance_m,
                1 if reobs.spatial_match else 0,
                reobs.temporal_delta_hours,
                reobs.corroboration_level,
                reobs.independent_bus_count,
                reobs.explanation,
                reobs.recommended_action,
                json.dumps(reobs.before_observation),
                json.dumps(reobs.after_observation),
                reobs.verification_notes,
                reobs.escalation_notes,
                reobs.created_at,
                reobs.updated_at,
            ))
            conn.commit()

    def add_history_entry(self, entry: ReObservationHistoryEntry) -> None:
        """Records an immutable audit history event."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO reobservation_history (
                    entry_id, reobservation_id, action_type, operator,
                    from_status, to_status, notes, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                entry.entry_id,
                entry.reobservation_id,
                entry.action_type,
                entry.operator,
                entry.from_status,
                entry.to_status,
                entry.notes,
                entry.timestamp,
            ))
            conn.commit()

    def get_reobservation_by_id(self, reobservation_id: str) -> Optional[ReObservation]:
        """Retrieves a single re-observation by ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM reobservations WHERE reobservation_id = ?", (reobservation_id,))
            row = cursor.fetchone()
            if row:
                return self._row_to_reobservation(row)
            return None

    def get_by_action_id(self, authority_action_id: str) -> List[ReObservation]:
        """Retrieves re-observations linked to an authority action ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM reobservations WHERE authority_action_id = ? ORDER BY created_at DESC",
                (authority_action_id,)
            )
            return [self._row_to_reobservation(r) for r in cursor.fetchall()]

    def get_history(self, reobservation_id: str) -> List[ReObservationHistoryEntry]:
        """Retrieves immutable audit history for a re-observation record."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM reobservation_history WHERE reobservation_id = ? ORDER BY timestamp ASC",
                (reobservation_id,)
            )
            return [
                ReObservationHistoryEntry(
                    entry_id=row["entry_id"],
                    reobservation_id=row["reobservation_id"],
                    action_type=row["action_type"],
                    operator=row["operator"],
                    from_status=row["from_status"],
                    to_status=row["to_status"],
                    notes=row["notes"],
                    timestamp=row["timestamp"],
                )
                for row in cursor.fetchall()
            ]

    def query_reobservations(
        self,
        outcome: Optional[str] = None,
        target_type: Optional[str] = None,
        authority_action_id: Optional[str] = None,
        bus_id: Optional[str] = None,
        verification_status: Optional[str] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> Tuple[List[ReObservation], int]:
        """Filtered, paginated lookup."""
        query = "SELECT * FROM reobservations WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM reobservations WHERE 1=1"
        params: List[Any] = []

        if outcome and outcome.upper() != "ALL":
            query += " AND outcome = ?"
            count_query += " AND outcome = ?"
            params.append(outcome.upper())

        if target_type and target_type.upper() != "ALL":
            query += " AND target_type = ?"
            count_query += " AND target_type = ?"
            params.append(target_type.upper())

        if authority_action_id and authority_action_id.strip():
            query += " AND authority_action_id = ?"
            count_query += " AND authority_action_id = ?"
            params.append(authority_action_id.strip())

        if bus_id and bus_id.strip():
            query += " AND (source_bus_id LIKE ? OR source_bus_ids LIKE ?)"
            count_query += " AND (source_bus_id LIKE ? OR source_bus_ids LIKE ?)"
            b_pattern = f"%{bus_id.strip()}%"
            params.extend([b_pattern, b_pattern])

        if verification_status and verification_status.upper() != "ALL":
            query += " AND verification_status = ?"
            count_query += " AND verification_status = ?"
            params.append(verification_status.upper())

        if search and search.strip():
            query += " AND (reobservation_id LIKE ? OR target_id LIKE ? OR observed_condition LIKE ? OR explanation LIKE ?)"
            count_query += " AND (reobservation_id LIKE ? OR target_id LIKE ? OR observed_condition LIKE ? OR explanation LIKE ?)"
            pattern = f"%{search.strip()}%"
            params.extend([pattern, pattern, pattern, pattern])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
            offset = max(0, (page - 1) * page_size)
            cursor.execute(query, params + [page_size, offset])
            rows = cursor.fetchall()
            items = [self._row_to_reobservation(r) for r in rows]

            return items, total

    def get_summary(self) -> ReObservationSummary:
        """Aggregates high-level KPIs for outcome verification."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM reobservations")
            total = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM reobservations WHERE verification_status = 'PENDING_REOBSERVATION'")
            pending = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM reobservations WHERE outcome = 'IMPROVED' AND verification_status = 'VERIFIED'")
            improved = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM reobservations WHERE outcome = 'UNCHANGED'")
            unchanged = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM reobservations WHERE outcome = 'WORSENED'")
            worsened = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM reobservations WHERE outcome = 'INSUFFICIENT_DATA'")
            insufficient = cursor.fetchone()[0]

            cursor.execute("SELECT COUNT(*) FROM reobservations WHERE verification_status = 'ESCALATED'")
            escalated = cursor.fetchone()[0]

            cursor.execute("SELECT AVG(verification_score) FROM reobservations")
            avg_score_row = cursor.fetchone()[0]
            avg_score = round(float(avg_score_row), 1) if avg_score_row is not None else 0.0

            # Target type breakdown
            cursor.execute("SELECT target_type, COUNT(*) FROM reobservations GROUP BY target_type")
            by_target = {row[0]: row[1] for row in cursor.fetchall()}

            # Outcome breakdown
            cursor.execute("SELECT outcome, COUNT(*) FROM reobservations GROUP BY outcome")
            by_type = {row[0]: row[1] for row in cursor.fetchall()}

            return ReObservationSummary(
                total_reobservations=total,
                pending_reobservation=pending,
                verified_improved=improved,
                unchanged=unchanged,
                worsened=worsened,
                insufficient_data=insufficient,
                escalated=escalated,
                avg_verification_score=avg_score,
                outcomes_by_target=by_target,
                outcomes_by_type=by_type,
            )
