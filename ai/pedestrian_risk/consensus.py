"""
Independent Multi-Bus Consensus Module for Pedestrian Risk Hotspots.

Evaluates independent bus corroboration and consensus levels without inflating risk scores.
10 observations from 1 bus = SINGLE_BUS_OBSERVATION.
Observations across 3 independent buses within the temporal window = MULTI_BUS_CONSENSUS.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Set
import time

from ai.pedestrian_risk.models import (
    PedestrianRiskObservation,
    ConsensusStatus,
)
from ai.pedestrian_risk.config import PedestrianRiskConfig, DEFAULT_PEDESTRIAN_CONFIG


@dataclass
class ConsensusResult:
    status: ConsensusStatus
    unique_bus_count: int
    confirming_bus_ids: List[str]
    total_observations: int
    consensus_strength: float # 0.0 to 1.0 normalized
    consensus_freshness: str # FRESH, RECENT, STALE
    first_observation: float
    latest_observation: float
    corroboration_label: str # "HIGH", "MODERATE", "LOW", "INSUFFICIENT"


class ConsensusEngine:
    """Independent multi-bus corroboration & consensus evaluator."""

    def __init__(self, config: Optional[PedestrianRiskConfig] = None):
        self.config = config or DEFAULT_PEDESTRIAN_CONFIG

    def calculate_consensus_strength(self, bus_count: int) -> float:
        """Normalized corroboration strength calculation."""
        if bus_count >= self.config.consensus_consensus_min_buses:
            return 1.00
        elif bus_count >= self.config.consensus_corroboration_min_buses:
            return 0.66
        elif bus_count == 1:
            return 0.33
        return 0.0

    def evaluate_observations(
        self,
        observations: List[PedestrianRiskObservation],
        reference_time: Optional[float] = None,
        ref_time: Optional[float] = None,
    ) -> ConsensusResult:
        """
        Evaluates independent multi-bus corroboration across a set of observations.
        
        Applies:
        1. Temporal window filtering (default 168 hours / 7 days).
        2. Unique bus ID deduplication.
        3. Strict consensus classification (1 bus = SINGLE_BUS_OBSERVATION, 2 = MULTI_BUS_CORROBORATION, 3+ = MULTI_BUS_CONSENSUS).
        """
        if reference_time is None and ref_time is not None:
            reference_time = ref_time
        if not observations:
            return ConsensusResult(
                status=ConsensusStatus.INSUFFICIENT,
                unique_bus_count=0,
                confirming_bus_ids=[],
                total_observations=0,
                consensus_strength=0.0,
                consensus_freshness="STALE",
                first_observation=0.0,
                latest_observation=0.0,
                corroboration_label="INSUFFICIENT",
            )

        # Determine reference time for temporal window check
        # If reference_time is provided, use it; otherwise use max observation timestamp or current time
        max_obs_time = max(o.timestamp for o in observations)
        ref_time = reference_time if reference_time is not None else max_obs_time
        window_seconds = self.config.consensus_time_window_hours * 3600

        # Filter observations that fall within the consensus time window relative to ref_time
        valid_obs: List[PedestrianRiskObservation] = []
        for o in observations:
            # Observation is valid if within [ref_time - window_seconds, ref_time + 3600]
            if (ref_time - window_seconds) <= o.timestamp <= (ref_time + 3600):
                valid_obs.append(o)

        if not valid_obs:
            # All observations are older than the consensus window
            return ConsensusResult(
                status=ConsensusStatus.INSUFFICIENT,
                unique_bus_count=0,
                confirming_bus_ids=[],
                total_observations=0,
                consensus_strength=0.0,
                consensus_freshness="STALE",
                first_observation=min(o.timestamp for o in observations),
                latest_observation=max_obs_time,
                corroboration_label="INSUFFICIENT",
            )

        # Deduplicate independent bus IDs
        unique_buses: Set[str] = set(o.bus_id for o in valid_obs if o.bus_id)
        confirming_bus_ids = sorted(list(unique_buses))
        unique_bus_count = len(confirming_bus_ids)
        total_obs = len(valid_obs)

        # Classify consensus status
        if unique_bus_count >= self.config.consensus_consensus_min_buses:
            status = ConsensusStatus.MULTI_BUS_CONSENSUS
            consensus_strength = 1.00
            corroboration_label = "HIGH"
        elif unique_bus_count >= self.config.consensus_corroboration_min_buses:
            status = ConsensusStatus.MULTI_BUS_CORROBORATION
            consensus_strength = 0.66
            corroboration_label = "MODERATE"
        elif unique_bus_count == 1:
            status = ConsensusStatus.SINGLE_BUS_OBSERVATION
            consensus_strength = 0.33
            corroboration_label = "LOW"
        else:
            status = ConsensusStatus.INSUFFICIENT
            consensus_strength = 0.0
            corroboration_label = "INSUFFICIENT"

        # Evaluate freshness
        first_time = min(o.timestamp for o in valid_obs)
        latest_time = max(o.timestamp for o in valid_obs)
        age_seconds = abs(ref_time - latest_time) if latest_time > 0 else 0

        if age_seconds <= 86400: # 24 hours
            freshness = "FRESH"
        elif age_seconds <= 7 * 86400: # 7 days
            freshness = "RECENT"
        else:
            freshness = "STALE"

        return ConsensusResult(
            status=status,
            unique_bus_count=unique_bus_count,
            confirming_bus_ids=confirming_bus_ids,
            total_observations=total_obs,
            consensus_strength=consensus_strength,
            consensus_freshness=freshness,
            first_observation=first_time,
            latest_observation=latest_time,
            corroboration_label=corroboration_label,
        )
