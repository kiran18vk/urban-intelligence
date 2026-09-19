"""
Re-Observation Service Layer (Feature #8).
"""
import uuid
import time
from typing import Dict, List, Optional, Any, Tuple

from ai.reobservation.models import (
    ReObservation,
    ReObservationHistoryEntry,
    ReObservationSummary,
    OutcomeStatus,
    VerificationStatus,
    EvidenceSufficiency,
    CorroborationLevel,
)
from ai.reobservation.store import ReObservationStore
from ai.reobservation.comparator import ObservationComparator
from ai.reobservation.outcome import OutcomeEngine
from ai.reobservation.verification import VerificationEngine
from ai.reobservation.explain import OutcomeExplainer
from ai.reobservation.escalation import EscalationHandler
from ai.authority_actions.action_store import AuthorityActionStore


class ReObservationService:
    """
    High-level service coordinating before/after comparison, outcome determination,
    verification scoring, escalation workflows, and persistence.
    """

    def __init__(self, store: Optional[ReObservationStore] = None):
        self.store = store or ReObservationStore()
        self.comparator = ObservationComparator(spatial_threshold_meters=150.0)
        self.action_store = AuthorityActionStore()
        self._seed_deterministic_data()

    def create_reobservation(self, data: Dict[str, Any]) -> ReObservation:
        """
        Creates, compares, scores, and persists a new re-observation record.
        """
        reobs_id = data.get("reobservation_id") or f"ROBS-{uuid.uuid4().hex[:8].upper()}"
        auth_action_id = data.get("authority_action_id", "ACT-DEFAULT")
        target_id = data.get("target_id", "TGT-DEFAULT")
        target_type = data.get("target_type", "ROAD_DEFECT")

        # 1. Resolve Before Observation
        before_obs = data.get("before_observation")
        if not before_obs:
            # Attempt to pull from linked AuthorityAction
            linked_action = self.action_store.get_action_by_id(auth_action_id)
            if linked_action:
                before_obs = {
                    "target_id": linked_action.target_id,
                    "target_type": linked_action.target_type,
                    "event_type": linked_action.event_type,
                    "severity": linked_action.severity,
                    "latitude": linked_action.latitude,
                    "longitude": linked_action.longitude,
                    "timestamp": linked_action.created_at,
                    "defect_count": 3 if "POTHOLE" in linked_action.event_type else None,
                    "reliability": linked_action.reliability,
                    "operational_confidence": linked_action.operational_confidence,
                    "source_bus_id": linked_action.source_bus_ids[0] if linked_action.source_bus_ids else "PMP-BUS-001",
                    "evidence_refs": linked_action.evidence_refs,
                }
            else:
                before_obs = {
                    "target_id": target_id,
                    "target_type": target_type,
                    "severity": data.get("before_severity", "HIGH"),
                    "latitude": float(data.get("before_latitude", data.get("latitude", 18.5204))),
                    "longitude": float(data.get("before_longitude", data.get("longitude", 73.8567))),
                    "timestamp": time.time() - (48.0 * 3600.0),
                    "defect_count": data.get("before_defect_count", 3),
                    "reliability": 0.85,
                    "operational_confidence": 0.80,
                    "source_bus_id": "PMP-BUS-001",
                    "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
                }

        # 2. Build After Observation
        source_bus_ids = data.get("source_bus_ids", [data.get("source_bus_id", "PMP-BUS-007")])
        if isinstance(source_bus_ids, str):
            source_bus_ids = [source_bus_ids]

        raw_after = data.get("after_observation") or {}
        after_obs = {
            "target_id": raw_after.get("target_id", target_id),
            "target_type": raw_after.get("target_type", target_type),
            "severity": raw_after.get("severity", data.get("severity", "LOW")),
            "latitude": float(raw_after.get("latitude", data.get("latitude", 18.5204))),
            "longitude": float(raw_after.get("longitude", data.get("longitude", 73.8567))),
            "timestamp": float(raw_after.get("timestamp", data.get("observation_timestamp", time.time()))),
            "defect_count": raw_after.get("defect_count", data.get("defect_count")),
            "reliability": float(raw_after.get("reliability", data.get("reliability", 0.88))),
            "operational_confidence": float(raw_after.get("operational_confidence", data.get("operational_confidence", 0.82))),
            "source_bus_id": raw_after.get("source_bus_id", source_bus_ids[0] if source_bus_ids else "PMP-BUS-007"),
            "source_bus_ids": raw_after.get("source_bus_ids", source_bus_ids),
            "observed_condition": raw_after.get("observed_condition", data.get("observed_condition", "Pothole filled with asphalt")),
            "evidence_refs": raw_after.get("evidence_refs", data.get("evidence_refs", [])),
        }

        # 3. Compare Before and After
        comparison = self.comparator.compare(before_obs, after_obs)

        # 4. Determine Outcome Status
        outcome = OutcomeEngine.determine_outcome(
            comparison=comparison,
            target_type=target_type,
            after_condition=after_obs.get("observed_condition", ""),
        )

        # 5. Calculate Verification Score & Corroboration Level
        independent_bus_count = len(set(after_obs["source_bus_ids"]))
        score, sufficiency, corroboration = VerificationEngine.calculate_score(
            comparison=comparison,
            after_reliability=after_obs.get("reliability", 0.85),
            after_operational_confidence=after_obs.get("operational_confidence", 0.80),
            independent_bus_count=independent_bus_count,
            has_evidence_ref=bool(after_obs.get("evidence_refs")),
        )

        # 6. Generate Auditable Explanation and Recommendations
        explanation = data.get("explanation") or OutcomeExplainer.generate_explanation(
            outcome=outcome,
            comparison=comparison,
            sufficiency=sufficiency,
            corroboration=corroboration,
            independent_bus_count=independent_bus_count,
            target_type=target_type,
        )
        recommendation = data.get("recommended_action") or OutcomeExplainer.generate_recommended_action(
            outcome=outcome,
            verification_score=score,
            target_type=target_type,
        )

        # Initial verification status
        initial_status = VerificationStatus.VERIFIED.value if outcome in (OutcomeStatus.IMPROVED.value, OutcomeStatus.UNCHANGED.value, OutcomeStatus.WORSENED.value) else VerificationStatus.REQUIRES_REVIEW.value

        reobs = ReObservation(
            reobservation_id=reobs_id,
            authority_action_id=auth_action_id,
            target_id=target_id,
            target_type=target_type,
            original_event_id=data.get("original_event_id"),
            original_correlation_id=data.get("original_correlation_id"),
            source_bus_id=after_obs["source_bus_id"],
            source_bus_ids=after_obs["source_bus_ids"],
            observation_timestamp=after_obs["timestamp"],
            latitude=after_obs["latitude"],
            longitude=after_obs["longitude"],
            simulated_gps=data.get("simulated_gps", True),
            evidence_refs=after_obs["evidence_refs"],
            raw_confidence=float(data.get("raw_confidence", 0.85)),
            operational_confidence=after_obs["operational_confidence"],
            reliability=after_obs["reliability"],
            observed_condition=after_obs["observed_condition"],
            defect_count=after_obs["defect_count"],
            severity=after_obs["severity"],
            outcome=outcome.value,
            verification_status=data.get("verification_status", initial_status),
            verification_score=score,
            evidence_sufficiency=sufficiency.value,
            spatial_distance_m=comparison["spatial_distance_m"],
            spatial_match=comparison["spatial_match"],
            temporal_delta_hours=comparison["temporal_delta_hours"],
            corroboration_level=corroboration.value,
            independent_bus_count=independent_bus_count,
            explanation=explanation,
            recommended_action=recommendation,
            before_observation=before_obs,
            after_observation=after_obs,
            verification_notes=data.get("verification_notes"),
            escalation_notes=data.get("escalation_notes"),
            created_at=time.time(),
            updated_at=time.time(),
        )

        self.store.save_reobservation(reobs)

        # Add initial audit history entry
        self.store.add_history_entry(
            ReObservationHistoryEntry(
                entry_id=f"HIST-{uuid.uuid4().hex[:8].upper()}",
                reobservation_id=reobs.reobservation_id,
                action_type="CREATED",
                operator=data.get("created_by", "transit-operator-01"),
                from_status="NONE",
                to_status=reobs.verification_status,
                notes=f"Re-observation created. Outcome: {reobs.outcome} (Score: {reobs.verification_score}/100)",
                timestamp=time.time(),
            )
        )

        return reobs

    def verify_outcome(
        self,
        reobservation_id: str,
        operator: str,
        notes: str,
    ) -> ReObservation:
        """Marks a re-observation outcome as human-verified."""
        reobs = self.store.get_reobservation_by_id(reobservation_id)
        if not reobs:
            raise KeyError(f"Re-observation '{reobservation_id}' not found.")

        old_status = reobs.verification_status
        reobs.verification_status = VerificationStatus.VERIFIED.value
        reobs.verification_notes = notes
        reobs.updated_at = time.time()
        self.store.save_reobservation(reobs)

        self.store.add_history_entry(
            ReObservationHistoryEntry(
                entry_id=f"HIST-{uuid.uuid4().hex[:8].upper()}",
                reobservation_id=reobs.reobservation_id,
                action_type="VERIFIED",
                operator=operator,
                from_status=old_status,
                to_status=reobs.verification_status,
                notes=notes,
                timestamp=time.time(),
            )
        )
        return reobs

    def escalate(
        self,
        reobservation_id: str,
        operator: str,
        escalation_notes: str,
    ) -> Dict[str, Any]:
        """Escalates an unchanged or worsened condition."""
        reobs = self.store.get_reobservation_by_id(reobservation_id)
        if not reobs:
            raise KeyError(f"Re-observation '{reobservation_id}' not found.")

        old_status = reobs.verification_status
        esc_result = EscalationHandler.process_escalation(reobs, operator, escalation_notes)
        self.store.save_reobservation(reobs)

        self.store.add_history_entry(
            ReObservationHistoryEntry(
                entry_id=f"HIST-{uuid.uuid4().hex[:8].upper()}",
                reobservation_id=reobs.reobservation_id,
                action_type="ESCALATED",
                operator=operator,
                from_status=old_status,
                to_status=reobs.verification_status,
                notes=escalation_notes,
                timestamp=time.time(),
            )
        )
        return esc_result

    def request_another_observation(
        self,
        reobservation_id: str,
        operator: str,
        notes: str,
    ) -> ReObservation:
        """Requests another transit pass-by observation."""
        reobs = self.store.get_reobservation_by_id(reobservation_id)
        if not reobs:
            raise KeyError(f"Re-observation '{reobservation_id}' not found.")

        old_status = reobs.verification_status
        reobs.verification_status = VerificationStatus.PENDING_REOBSERVATION.value
        reobs.verification_notes = f"Follow-up observation requested: {notes}"
        reobs.updated_at = time.time()
        self.store.save_reobservation(reobs)

        self.store.add_history_entry(
            ReObservationHistoryEntry(
                entry_id=f"HIST-{uuid.uuid4().hex[:8].upper()}",
                reobservation_id=reobs.reobservation_id,
                action_type="ANOTHER_REQUESTED",
                operator=operator,
                from_status=old_status,
                to_status=reobs.verification_status,
                notes=notes,
                timestamp=time.time(),
            )
        )
        return reobs

    def get_reobservation(self, reobservation_id: str) -> Optional[ReObservation]:
        return self.store.get_reobservation_by_id(reobservation_id)

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
        return self.store.query_reobservations(
            outcome=outcome,
            target_type=target_type,
            authority_action_id=authority_action_id,
            bus_id=bus_id,
            verification_status=verification_status,
            search=search,
            page=page,
            page_size=page_size,
        )

    def get_summary(self) -> ReObservationSummary:
        return self.store.get_summary()

    def get_history(self, reobservation_id: str) -> List[ReObservationHistoryEntry]:
        return self.store.get_history(reobservation_id)

    def compare_authority_action(self, authority_action_id: str) -> Dict[str, Any]:
        """Looks up existing re-observations or previews before/after comparison for an action."""
        reobs_list = self.store.get_by_action_id(authority_action_id)
        if reobs_list:
            return reobs_list[0].to_dict()

        linked_action = self.action_store.get_action_by_id(authority_action_id)
        if not linked_action:
            raise KeyError(f"Authority action '{authority_action_id}' not found.")

        return {
            "authority_action_id": linked_action.action_id,
            "target_id": linked_action.target_id,
            "target_type": linked_action.target_type,
            "status": "AWAITING_REOBSERVATION",
            "message": "Action is currently in field execution or ready for mobile pass re-observation.",
        }

    def _seed_deterministic_data(self):
        """Seeds the 6 deterministic testbed scenarios into SQLite storage."""
        existing_items, total = self.store.query_reobservations(page=1, page_size=1)
        if total > 0:
            return

        now = time.time()

        # 1. Road defect: Before = 4 defects, After = 1 defect -> IMPROVED
        self.create_reobservation({
            "reobservation_id": "ROBS-SEED-0001",
            "authority_action_id": "ACT-FDBF74E3",
            "target_id": "ROAD-01",
            "target_type": "ROAD_DEFECT",
            "original_event_id": "EVT-DEMO-0001",
            "source_bus_id": "PMP-BUS-007",
            "source_bus_ids": ["PMP-BUS-007", "PMP-BUS-001"],
            "before_observation": {
                "target_id": "ROAD-01",
                "severity": "CRITICAL",
                "defect_count": 4,
                "latitude": 18.5284,
                "longitude": 73.8423,
                "timestamp": now - 172800.0,
                "reliability": 0.88,
                "operational_confidence": 0.85,
                "source_bus_id": "PMP-BUS-001",
                "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
            },
            "after_observation": {
                "target_id": "ROAD-01",
                "severity": "LOW",
                "defect_count": 1,
                "latitude": 18.5285,
                "longitude": 73.8424,
                "timestamp": now - 14400.0,
                "reliability": 0.90,
                "operational_confidence": 0.86,
                "source_bus_id": "PMP-BUS-007",
                "source_bus_ids": ["PMP-BUS-007", "PMP-BUS-001"],
                "observed_condition": "Deep void filled with cold-mix asphalt; minor surface patch roughness remaining.",
                "evidence_refs": ["assets/road-defects/crack-real-01.jpg"],
            },
        })

        # 2. Road defect: Before = 3 defects, After = 3 defects -> UNCHANGED
        self.create_reobservation({
            "reobservation_id": "ROBS-SEED-0002",
            "authority_action_id": "ACT-84C72B9A",
            "target_id": "ROAD-02",
            "target_type": "ROAD_DEFECT",
            "original_event_id": "EVT-DEMO-0002",
            "source_bus_id": "PMP-BUS-012",
            "source_bus_ids": ["PMP-BUS-012"],
            "before_observation": {
                "target_id": "ROAD-02",
                "severity": "HIGH",
                "defect_count": 3,
                "latitude": 18.5312,
                "longitude": 73.8445,
                "timestamp": now - 259200.0,
                "reliability": 0.85,
                "operational_confidence": 0.80,
                "source_bus_id": "PMP-BUS-001",
                "evidence_refs": ["assets/road-defects/crack-real-01.jpg"],
            },
            "after_observation": {
                "target_id": "ROAD-02",
                "severity": "HIGH",
                "defect_count": 3,
                "latitude": 18.5314,
                "longitude": 73.8447,
                "timestamp": now - 28800.0,
                "reliability": 0.86,
                "operational_confidence": 0.81,
                "source_bus_id": "PMP-BUS-012",
                "source_bus_ids": ["PMP-BUS-012"],
                "observed_condition": "Longitudinal road cracks unchanged; water seepage still evident in asphalt seam.",
                "evidence_refs": ["assets/road-defects/crack-real-01.jpg"],
            },
        })

        # 3. Road defect: Before = 2 defects, After = 5 defects -> WORSENED
        self.create_reobservation({
            "reobservation_id": "ROBS-SEED-0003",
            "authority_action_id": "ACT-3D91A5E2",
            "target_id": "ROAD-03",
            "target_type": "ROAD_DEFECT",
            "original_event_id": "EVT-DEMO-0003",
            "source_bus_id": "PMP-BUS-003",
            "source_bus_ids": ["PMP-BUS-003", "PMP-BUS-007", "PMP-BUS-012"],
            "before_observation": {
                "target_id": "ROAD-03",
                "severity": "MEDIUM",
                "defect_count": 2,
                "latitude": 18.5601,
                "longitude": 73.8182,
                "timestamp": now - 345600.0,
                "reliability": 0.82,
                "operational_confidence": 0.78,
                "source_bus_id": "PMP-BUS-001",
                "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
            },
            "after_observation": {
                "target_id": "ROAD-03",
                "severity": "CRITICAL",
                "defect_count": 5,
                "latitude": 18.5603,
                "longitude": 73.8184,
                "timestamp": now - 7200.0,
                "reliability": 0.91,
                "operational_confidence": 0.88,
                "source_bus_id": "PMP-BUS-003",
                "source_bus_ids": ["PMP-BUS-003", "PMP-BUS-007", "PMP-BUS-012"],
                "observed_condition": "Structural edge crumbling has expanded into 5 cluster voids across both lanes.",
                "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
            },
        })

        # 4. Pedestrian hotspot: Risk remains high -> UNCHANGED
        self.create_reobservation({
            "reobservation_id": "ROBS-SEED-0004",
            "authority_action_id": "ACT-99F128C0",
            "target_id": "PEDESTRIAN-HOTSPOT-001",
            "target_type": "PEDESTRIAN_RISK",
            "original_event_id": "EVT-PED-001",
            "source_bus_id": "PMP-BUS-001",
            "source_bus_ids": ["PMP-BUS-001", "PMP-BUS-007"],
            "before_observation": {
                "target_id": "PEDESTRIAN-HOTSPOT-001",
                "severity": "HIGH",
                "latitude": 18.5284,
                "longitude": 73.8423,
                "timestamp": now - 432000.0,
                "reliability": 0.88,
                "operational_confidence": 0.85,
                "observed_condition": "Frequent mid-block crossing near bus stop without pedestrian sanctuary island.",
                "source_bus_id": "PMP-BUS-001",
            },
            "after_observation": {
                "target_id": "PEDESTRIAN-HOTSPOT-001",
                "severity": "HIGH",
                "latitude": 18.5286,
                "longitude": 73.8425,
                "timestamp": now - 3600.0,
                "reliability": 0.87,
                "operational_confidence": 0.84,
                "source_bus_id": "PMP-BUS-001",
                "source_bus_ids": ["PMP-BUS-001", "PMP-BUS-007"],
                "observed_condition": "Pedestrian density and vehicle conflicts continue during evening peak hours.",
            },
        })

        # 5. Traffic corridor: Congestion reduces -> IMPROVED
        self.create_reobservation({
            "reobservation_id": "ROBS-SEED-0005",
            "authority_action_id": "ACT-4B9C817D",
            "target_id": "ZONE-01",
            "target_type": "TRAFFIC",
            "original_event_id": "EVT-TRF-001",
            "source_bus_id": "PMP-BUS-007",
            "source_bus_ids": ["PMP-BUS-007", "PMP-BUS-012"],
            "before_observation": {
                "target_id": "ZONE-01",
                "severity": "HIGH",
                "latitude": 18.5018,
                "longitude": 73.8636,
                "timestamp": now - 86400.0,
                "reliability": 0.90,
                "operational_confidence": 0.88,
                "observed_condition": "Severe intersection queue spillback exceeding 350 meters.",
                "source_bus_id": "PMP-BUS-007",
            },
            "after_observation": {
                "target_id": "ZONE-01",
                "severity": "LOW",
                "latitude": 18.5020,
                "longitude": 73.8638,
                "timestamp": now - 1800.0,
                "reliability": 0.92,
                "operational_confidence": 0.89,
                "source_bus_id": "PMP-BUS-007",
                "source_bus_ids": ["PMP-BUS-007", "PMP-BUS-012"],
                "observed_condition": "Traffic signal timing adjusted; queue cleared with smooth continuous flow.",
            },
        })

        # 6. Insufficient observation: Poor reliability (<0.60) / blur -> INSUFFICIENT_DATA
        self.create_reobservation({
            "reobservation_id": "ROBS-SEED-0006",
            "authority_action_id": "ACT-55E81A22",
            "target_id": "ROAD-04",
            "target_type": "ROAD_DEFECT",
            "original_event_id": "EVT-DEMO-0004",
            "source_bus_id": "PMP-BUS-004",
            "source_bus_ids": ["PMP-BUS-004"],
            "before_observation": {
                "target_id": "ROAD-04",
                "severity": "HIGH",
                "defect_count": 2,
                "latitude": 18.6012,
                "longitude": 73.7934,
                "timestamp": now - 172800.0,
                "reliability": 0.85,
                "operational_confidence": 0.80,
                "source_bus_id": "PMP-BUS-001",
                "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
            },
            "after_observation": {
                "target_id": "ROAD-04",
                "severity": "HIGH",
                "defect_count": 2,
                "latitude": 18.6013,
                "longitude": 73.7935,
                "timestamp": now - 900.0,
                "reliability": 0.48,  # Below 0.60 threshold
                "operational_confidence": 0.45,
                "source_bus_id": "PMP-BUS-004",
                "source_bus_ids": ["PMP-BUS-004"],
                "observed_condition": "Heavy camera lens blur and vehicle vibration during night pass; road surface obscured.",
                "evidence_refs": [],
            },
        })
