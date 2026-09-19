"""
Persistent SQLite Store for Predictive Urban Intelligence (Feature #9).
Stores forecast records, timeseries data, and forecast lifecycle history.
"""
import json
import os
import sqlite3
import time
from typing import Dict, List, Optional, Tuple, Any

from ai.predictive_intelligence.models import (
    PredictiveForecast,
    ForecastHistoryEntry,
    ForecastSummary,
    ForecastTarget,
    TrendDirection,
    WarningLevel,
    RiskLevel,
)


class PredictiveIntelligenceStore:
    """
    SQLite persistence layer for predictive forecasts and history logs.
    """

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            self.db_path = os.path.join(base_dir, "predictive_intelligence.db")
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
                CREATE TABLE IF NOT EXISTS forecasts (
                    forecast_id TEXT PRIMARY KEY,
                    target_id TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    location_name TEXT NOT NULL,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    simulated_gps INTEGER NOT NULL,
                    observation_window_days REAL NOT NULL,
                    historical_observation_count INTEGER NOT NULL,
                    independent_bus_count INTEGER NOT NULL,
                    source_bus_ids TEXT NOT NULL,
                    source_event_ids TEXT NOT NULL,
                    trend_direction TEXT NOT NULL,
                    trend_strength REAL NOT NULL,
                    current_value REAL NOT NULL,
                    baseline_value REAL NOT NULL,
                    forecast_value REAL NOT NULL,
                    unit TEXT NOT NULL,
                    current_display_label TEXT NOT NULL,
                    forecast_display_label TEXT NOT NULL,
                    forecast_horizon TEXT NOT NULL,
                    risk_level TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    reliability REAL NOT NULL,
                    evidence_sufficiency TEXT NOT NULL,
                    early_warning TEXT NOT NULL,
                    warning_message TEXT,
                    explanation TEXT NOT NULL,
                    recommended_action TEXT NOT NULL,
                    recommended_action_details TEXT NOT NULL,
                    timeseries_points TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    updated_at REAL NOT NULL
                )
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS forecast_history (
                    entry_id TEXT PRIMARY KEY,
                    forecast_id TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    operator TEXT NOT NULL,
                    from_value TEXT,
                    to_value TEXT,
                    notes TEXT,
                    timestamp REAL NOT NULL,
                    FOREIGN KEY (forecast_id) REFERENCES forecasts (forecast_id)
                )
            """)

            # Indexes
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fcst_target_type ON forecasts (target_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fcst_risk_level ON forecasts (risk_level)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fcst_trend_direction ON forecasts (trend_direction)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fcst_early_warning ON forecasts (early_warning)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fcst_target_id ON forecasts (target_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_fcst_hist_id ON forecast_history (forecast_id)")

            conn.commit()

    def save_forecast(self, fcst: PredictiveForecast) -> PredictiveForecast:
        """Inserts or replaces a forecast record."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO forecasts (
                    forecast_id, target_id, target_type, location_name, latitude, longitude,
                    simulated_gps, observation_window_days, historical_observation_count,
                    independent_bus_count, source_bus_ids, source_event_ids, trend_direction,
                    trend_strength, current_value, baseline_value, forecast_value, unit,
                    current_display_label, forecast_display_label, forecast_horizon,
                    risk_level, confidence, reliability, evidence_sufficiency, early_warning,
                    warning_message, explanation, recommended_action,
                    recommended_action_details, timeseries_points, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                fcst.forecast_id,
                fcst.target_id,
                fcst.target_type,
                fcst.location_name,
                fcst.latitude,
                fcst.longitude,
                1 if fcst.simulated_gps else 0,
                fcst.observation_window_days,
                fcst.historical_observation_count,
                fcst.independent_bus_count,
                json.dumps(fcst.source_bus_ids),
                json.dumps(fcst.source_event_ids),
                fcst.trend_direction,
                fcst.trend_strength,
                fcst.current_value,
                fcst.baseline_value,
                fcst.forecast_value,
                fcst.unit,
                fcst.current_display_label,
                fcst.forecast_display_label,
                fcst.forecast_horizon,
                fcst.risk_level,
                fcst.confidence,
                fcst.reliability,
                fcst.evidence_sufficiency,
                fcst.early_warning,
                fcst.warning_message,
                fcst.explanation,
                fcst.recommended_action,
                fcst.recommended_action_details,
                json.dumps(fcst.timeseries_points),
                fcst.created_at,
                fcst.updated_at,
            ))
            conn.commit()
        return fcst

    def get_forecast(self, forecast_id: str) -> Optional[PredictiveForecast]:
        """Retrieves a single forecast by ID."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM forecasts WHERE forecast_id = ?", (forecast_id,))
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_forecast(row)

    def find_by_target(self, target_type: str, target_id: str) -> Optional[PredictiveForecast]:
        """Finds a forecast by target_type and target_id."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM forecasts WHERE target_type = ? AND target_id = ?",
                (target_type, target_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_forecast(row)

    def list_forecasts(
        self,
        target_type: Optional[str] = None,
        risk_level: Optional[str] = None,
        trend_direction: Optional[str] = None,
        warning_level: Optional[str] = None,
        bus_id: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PredictiveForecast], int]:
        """
        Retrieves a filtered, paginated list of forecasts with total count.
        """
        conditions = []
        params = []

        if target_type and target_type != "ALL":
            conditions.append("target_type = ?")
            params.append(target_type)

        if risk_level and risk_level != "ALL":
            conditions.append("risk_level = ?")
            params.append(risk_level)

        if trend_direction and trend_direction != "ALL":
            conditions.append("trend_direction = ?")
            params.append(trend_direction)

        if warning_level and warning_level != "ALL":
            conditions.append("early_warning = ?")
            params.append(warning_level)

        if bus_id and bus_id.strip():
            conditions.append("source_bus_ids LIKE ?")
            params.append(f"%{bus_id.strip()}%")

        if search and search.strip():
            pattern = f"%{search.strip()}%"
            conditions.append("(forecast_id LIKE ? OR target_id LIKE ? OR location_name LIKE ? OR explanation LIKE ?)")
            params.extend([pattern, pattern, pattern, pattern])

        where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

        with self._get_connection() as conn:
            cursor = conn.cursor()

            count_query = f"SELECT COUNT(*) FROM forecasts {where_clause}"
            cursor.execute(count_query, params)
            total = cursor.fetchone()[0]

            query = f"""
                SELECT * FROM forecasts {where_clause}
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [limit, offset])
            rows = cursor.fetchall()
            items = [self._row_to_forecast(r) for r in rows]

        return items, total

    def add_history_entry(self, entry: ForecastHistoryEntry) -> ForecastHistoryEntry:
        """Appends an audit history entry."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO forecast_history (
                    entry_id, forecast_id, action_type, operator, from_value, to_value, notes, timestamp
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                entry.entry_id,
                entry.forecast_id,
                entry.action_type,
                entry.operator,
                entry.from_value,
                entry.to_value,
                entry.notes,
                entry.timestamp,
            ))
            conn.commit()
        return entry

    def get_history(self, forecast_id: str) -> List[ForecastHistoryEntry]:
        """Retrieves history timeline for a forecast."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM forecast_history WHERE forecast_id = ? ORDER BY timestamp ASC",
                (forecast_id,)
            )
            rows = cursor.fetchall()
            return [
                ForecastHistoryEntry(
                    entry_id=r["entry_id"],
                    forecast_id=r["forecast_id"],
                    action_type=r["action_type"],
                    operator=r["operator"],
                    from_value=r["from_value"],
                    to_value=r["to_value"],
                    notes=r["notes"],
                    timestamp=r["timestamp"],
                )
                for r in rows
            ]

    def get_summary(self) -> ForecastSummary:
        """Aggregates KPI metrics across all forecasts."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM forecasts")
            rows = cursor.fetchall()

        active_count = len(rows)
        if active_count == 0:
            return ForecastSummary(
                active_forecasts=0,
                warnings=0,
                deteriorating_areas=0,
                persistent_hotspots=0,
                forecast_actions=0,
                insufficient_data=0,
                average_confidence=0.0,
                target_distribution={},
                trend_distribution={},
                warning_distribution={},
            )

        warnings_count = sum(1 for r in rows if r["early_warning"] in ["WARNING", "CRITICAL"])
        deteriorating_count = sum(1 for r in rows if r["trend_direction"] == "DETERIORATING")
        hotspots_count = sum(1 for r in rows if r["target_type"] == "PERSISTENT_HOTSPOT" or r["risk_level"] in ["HIGH", "CRITICAL"])
        actions_count = sum(1 for r in rows if r["early_warning"] in ["WARNING", "CRITICAL", "WATCH"])
        insufficient_count = sum(1 for r in rows if r["trend_direction"] == "INSUFFICIENT_DATA" or r["evidence_sufficiency"] == "INSUFFICIENT")
        avg_conf = sum(r["confidence"] for r in rows) / active_count

        target_dist: Dict[str, int] = {}
        trend_dist: Dict[str, int] = {}
        warn_dist: Dict[str, int] = {}

        for r in rows:
            target_dist[r["target_type"]] = target_dist.get(r["target_type"], 0) + 1
            trend_dist[r["trend_direction"]] = trend_dist.get(r["trend_direction"], 0) + 1
            warn_dist[r["early_warning"]] = warn_dist.get(r["early_warning"], 0) + 1

        return ForecastSummary(
            active_forecasts=active_count,
            warnings=warnings_count,
            deteriorating_areas=deteriorating_count,
            persistent_hotspots=hotspots_count,
            forecast_actions=actions_count,
            insufficient_data=insufficient_count,
            average_confidence=round(avg_conf, 1),
            target_distribution=target_dist,
            trend_distribution=trend_dist,
            warning_distribution=warn_dist,
        )

    def _row_to_forecast(self, row: sqlite3.Row) -> PredictiveForecast:
        return PredictiveForecast(
            forecast_id=row["forecast_id"],
            target_id=row["target_id"],
            target_type=row["target_type"],
            location_name=row["location_name"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            simulated_gps=bool(row["simulated_gps"]),
            observation_window_days=row["observation_window_days"],
            historical_observation_count=row["historical_observation_count"],
            independent_bus_count=row["independent_bus_count"],
            source_bus_ids=json.loads(row["source_bus_ids"]),
            source_event_ids=json.loads(row["source_event_ids"]),
            trend_direction=row["trend_direction"],
            trend_strength=row["trend_strength"],
            current_value=row["current_value"],
            baseline_value=row["baseline_value"],
            forecast_value=row["forecast_value"],
            unit=row["unit"],
            current_display_label=row["current_display_label"],
            forecast_display_label=row["forecast_display_label"],
            forecast_horizon=row["forecast_horizon"],
            risk_level=row["risk_level"],
            confidence=row["confidence"],
            reliability=row["reliability"],
            evidence_sufficiency=row["evidence_sufficiency"],
            early_warning=row["early_warning"],
            warning_message=row["warning_message"],
            explanation=row["explanation"],
            recommended_action=row["recommended_action"],
            recommended_action_details=row["recommended_action_details"],
            timeseries_points=json.loads(row["timeseries_points"]),
            created_at=row["created_at"],
            updated_at=row["updated_at"],
        )
