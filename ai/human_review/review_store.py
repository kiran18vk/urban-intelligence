"""
SQLite-backed persistent store for Human Reviews and Model Feedback Records.
Ensures review records survive application restarts with robust indexing.
"""
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import datetime

from ai.human_review.models import ReviewRecord, FeedbackRecord, ReviewStatus
from ai.human_review.config import HumanReviewConfig, DEFAULT_HUMAN_REVIEW_CONFIG


class HumanReviewStore:
    """Persistent SQLite database manager for human review items and feedback datasets."""

    def __init__(self, db_path: Optional[str] = None):
        self.db_path = Path(db_path or DEFAULT_HUMAN_REVIEW_CONFIG.db_path).resolve()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        """Initializes tables and indexes if not already existing."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
            CREATE TABLE IF NOT EXISTS human_reviews (
                review_id TEXT PRIMARY KEY,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                event_id TEXT,
                correlation_id TEXT,
                reviewer_id TEXT,
                decision TEXT,
                original_event_type TEXT NOT NULL,
                corrected_event_type TEXT,
                original_confidence REAL NOT NULL,
                original_operational_confidence REAL,
                original_reliability REAL,
                severity TEXT NOT NULL,
                reason TEXT,
                notes TEXT,
                reviewed_at TEXT,
                created_at TEXT NOT NULL,
                status TEXT NOT NULL,
                evidence_reference TEXT,
                source_bus_id TEXT NOT NULL,
                is_simulated INTEGER NOT NULL,
                priority_score INTEGER NOT NULL
            );
            """)

            cur.execute("""
            CREATE TABLE IF NOT EXISTS feedback_records (
                feedback_id TEXT PRIMARY KEY,
                review_id TEXT NOT NULL,
                target_type TEXT NOT NULL,
                target_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                original_confidence REAL NOT NULL,
                operational_confidence REAL,
                reliability REAL,
                decision TEXT NOT NULL,
                reason TEXT,
                corrected_event_type TEXT,
                reviewer_id TEXT NOT NULL,
                reviewed_at TEXT NOT NULL,
                evidence_reference TEXT,
                notes TEXT,
                FOREIGN KEY (review_id) REFERENCES human_reviews (review_id)
            );
            """)

            # Indexes for fast lookup and filtering
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_target ON human_reviews (target_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_event ON human_reviews (event_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_corr ON human_reviews (correlation_id);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_decision ON human_reviews (decision);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_status ON human_reviews (status);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_reviews_reviewed_at ON human_reviews (reviewed_at);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_feedback_decision ON feedback_records (decision);")
            cur.execute("CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback_records (event_type);")
            conn.commit()

    def insert_review(self, record: ReviewRecord) -> bool:
        """Inserts a new review record. Returns True if inserted, False if review_id already exists."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute("""
                INSERT INTO human_reviews (
                    review_id, target_type, target_id, event_id, correlation_id,
                    reviewer_id, decision, original_event_type, corrected_event_type,
                    original_confidence, original_operational_confidence, original_reliability,
                    severity, reason, notes, reviewed_at, created_at, status,
                    evidence_reference, source_bus_id, is_simulated, priority_score
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    record.review_id,
                    record.target_type,
                    record.target_id,
                    record.event_id,
                    record.correlation_id,
                    record.reviewer_id,
                    record.decision,
                    record.original_event_type,
                    record.corrected_event_type,
                    record.original_confidence,
                    record.original_operational_confidence,
                    record.original_reliability,
                    record.severity,
                    record.reason,
                    record.notes,
                    record.reviewed_at,
                    record.created_at,
                    record.status,
                    record.evidence_reference,
                    record.source_bus_id,
                    1 if record.is_simulated else 0,
                    record.priority_score,
                ))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                return False

    def get_review_by_id(self, review_id: str) -> Optional[ReviewRecord]:
        """Fetches a single review record by review_id."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM human_reviews WHERE review_id = ?", (review_id,))
            row = cur.fetchone()
            if not row:
                return None
            return self._row_to_review(row)

    def get_review_by_target(self, target_id: str) -> Optional[ReviewRecord]:
        """Fetches a review record by target_id or event_id."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT * FROM human_reviews WHERE target_id = ? OR event_id = ? LIMIT 1", (target_id, target_id))
            row = cur.fetchone()
            if not row:
                return None
            return self._row_to_review(row)

    def update_review(self, record: ReviewRecord) -> bool:
        """Updates an existing review record."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("""
            UPDATE human_reviews SET
                reviewer_id = ?,
                decision = ?,
                corrected_event_type = ?,
                reason = ?,
                notes = ?,
                reviewed_at = ?,
                status = ?,
                priority_score = ?
            WHERE review_id = ?
            """, (
                record.reviewer_id,
                record.decision,
                record.corrected_event_type,
                record.reason,
                record.notes,
                record.reviewed_at,
                record.status,
                record.priority_score,
                record.review_id,
            ))
            conn.commit()
            return cur.rowcount > 0

    def query_reviews(
        self,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        target_type: Optional[str] = None,
        decision: Optional[str] = None,
        event_type: Optional[str] = None,
        bus_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ReviewRecord], int]:
        """Queries review records with dynamic filtering and pagination."""
        query = "SELECT * FROM human_reviews WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM human_reviews WHERE 1=1"
        params: List[Any] = []

        if status and status.upper() != "ALL":
            query += " AND status = ?"
            count_query += " AND status = ?"
            params.append(status.upper())

        if severity and severity.upper() != "ALL":
            query += " AND severity = ?"
            count_query += " AND severity = ?"
            params.append(severity.upper())

        if target_type and target_type.upper() != "ALL":
            query += " AND target_type = ?"
            count_query += " AND target_type = ?"
            params.append(target_type.upper())

        if decision and decision.upper() != "ALL":
            query += " AND decision = ?"
            count_query += " AND decision = ?"
            params.append(decision.upper())

        if event_type and event_type.upper() != "ALL":
            query += " AND original_event_type = ?"
            count_query += " AND original_event_type = ?"
            params.append(event_type.upper())

        if bus_id and bus_id.strip():
            query += " AND source_bus_id LIKE ?"
            count_query += " AND source_bus_id LIKE ?"
            params.append(f"%{bus_id.strip()}%")

        if correlation_id and correlation_id.strip():
            query += " AND correlation_id = ?"
            count_query += " AND correlation_id = ?"
            params.append(correlation_id.strip())

        # Sort by priority score DESC, then created_at DESC
        query += " ORDER BY priority_score DESC, created_at DESC LIMIT ? OFFSET ?"
        fetch_params = list(params) + [limit, offset]

        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(count_query, params)
            total = cur.fetchone()[0]

            cur.execute(query, fetch_params)
            rows = cur.fetchall()
            records = [self._row_to_review(r) for r in rows]
            return records, total

    def insert_feedback(self, feedback: FeedbackRecord) -> bool:
        """Inserts a structured model evaluation feedback record."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            try:
                cur.execute("""
                INSERT INTO feedback_records (
                    feedback_id, review_id, target_type, target_id, event_type,
                    original_confidence, operational_confidence, reliability,
                    decision, reason, corrected_event_type, reviewer_id,
                    reviewed_at, evidence_reference, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    feedback.feedback_id,
                    feedback.review_id,
                    feedback.target_type,
                    feedback.target_id,
                    feedback.event_type,
                    feedback.original_confidence,
                    feedback.operational_confidence,
                    feedback.reliability,
                    feedback.decision,
                    feedback.reason,
                    feedback.corrected_event_type,
                    feedback.reviewer_id,
                    feedback.reviewed_at,
                    feedback.evidence_reference,
                    feedback.notes,
                ))
                conn.commit()
                return True
            except sqlite3.IntegrityError:
                return False

    def query_feedback(
        self,
        decision: Optional[str] = None,
        event_type: Optional[str] = None,
        target_type: Optional[str] = None,
        reviewer_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[FeedbackRecord], int]:
        """Queries structured feedback records for model evaluation / export."""
        query = "SELECT * FROM feedback_records WHERE 1=1"
        count_query = "SELECT COUNT(*) FROM feedback_records WHERE 1=1"
        params: List[Any] = []

        if decision and decision.upper() != "ALL":
            query += " AND decision = ?"
            count_query += " AND decision = ?"
            params.append(decision.upper())

        if event_type and event_type.upper() != "ALL":
            query += " AND event_type = ?"
            count_query += " AND event_type = ?"
            params.append(event_type.upper())

        if target_type and target_type.upper() != "ALL":
            query += " AND target_type = ?"
            count_query += " AND target_type = ?"
            params.append(target_type.upper())

        if reviewer_id and reviewer_id.strip():
            query += " AND reviewer_id = ?"
            count_query += " AND reviewer_id = ?"
            params.append(reviewer_id.strip())

        query += " ORDER BY reviewed_at DESC LIMIT ? OFFSET ?"
        fetch_params = list(params) + [limit, offset]

        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute(count_query, params)
            total = cur.fetchone()[0]

            cur.execute(query, fetch_params)
            rows = cur.fetchall()
            records = [
                FeedbackRecord(
                    feedback_id=r["feedback_id"],
                    review_id=r["review_id"],
                    target_type=r["target_type"],
                    target_id=r["target_id"],
                    event_type=r["event_type"],
                    original_confidence=r["original_confidence"],
                    operational_confidence=r["operational_confidence"],
                    reliability=r["reliability"],
                    decision=r["decision"],
                    reason=r["reason"],
                    corrected_event_type=r["corrected_event_type"],
                    reviewer_id=r["reviewer_id"],
                    reviewed_at=r["reviewed_at"],
                    evidence_reference=r["evidence_reference"],
                    notes=r["notes"],
                )
                for r in rows
            ]
            return records, total

    def count_by_status(self) -> Dict[str, int]:
        """Returns distribution of review records by status."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT status, COUNT(*) FROM human_reviews GROUP BY status")
            rows = cur.fetchall()
            return {r[0]: r[1] for r in rows}

    def count_by_decision(self) -> Dict[str, int]:
        """Returns distribution of reviews by decision."""
        with self._get_connection() as conn:
            cur = conn.cursor()
            cur.execute("SELECT decision, COUNT(*) FROM human_reviews WHERE decision IS NOT NULL GROUP BY decision")
            rows = cur.fetchall()
            return {r[0]: r[1] for r in rows}

    def _row_to_review(self, row: sqlite3.Row) -> ReviewRecord:
        return ReviewRecord(
            review_id=row["review_id"],
            target_type=row["target_type"],
            target_id=row["target_id"],
            event_id=row["event_id"],
            correlation_id=row["correlation_id"],
            reviewer_id=row["reviewer_id"],
            decision=row["decision"],
            original_event_type=row["original_event_type"],
            corrected_event_type=row["corrected_event_type"],
            original_confidence=row["original_confidence"],
            original_operational_confidence=row["original_operational_confidence"],
            original_reliability=row["original_reliability"],
            severity=row["severity"],
            reason=row["reason"],
            notes=row["notes"],
            reviewed_at=row["reviewed_at"],
            created_at=row["created_at"],
            status=row["status"],
            evidence_reference=row["evidence_reference"],
            source_bus_id=row["source_bus_id"],
            is_simulated=bool(row["is_simulated"]),
            priority_score=row["priority_score"],
        )
