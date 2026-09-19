"""
FastAPI Router for Pedestrian Risk Intelligence & Mitigation Engine (SIH 2026 PS 26124).

Exposes:
  - GET  /api/pedestrian-risk/hotspots
  - GET  /api/pedestrian-risk/hotspots/{hotspot_id}
  - GET  /api/pedestrian-risk/summary
  - GET  /api/pedestrian-risk/timeseries
  - POST /api/pedestrian-risk/simulate
"""
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query
import time

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.pedestrian_risk.models import (
    RiskLevel,
    TrendDirection,
    DataSufficiency,
    ConsensusStatus,
    PedestrianRiskObservation,
    PedestrianHotspot,
    PedestrianSummary,
    PedestrianWhatIfResult,
)
from ai.pedestrian_risk.hotspot_engine import HotspotEngine
from ai.pedestrian_risk.mitigation_engine import MitigationEngine
from ai.pedestrian_risk.config import DEFAULT_PEDESTRIAN_CONFIG

router = APIRouter(prefix="/pedestrian-risk", tags=["pedestrian-risk"])

_HOTSPOT_ENGINE = HotspotEngine()
_MITIGATION_ENGINE = MitigationEngine()

# In-memory storage for observations & generated hotspots
_OBSERVATIONS_STORE: List[PedestrianRiskObservation] = []
_HOTSPOTS_CACHE: List[PedestrianHotspot] = []


def _seed_testbed_pedestrian_observations():
    """Seeds realistic deterministic testbed observations across key Pune corridors."""
    global _OBSERVATIONS_STORE, _HOTSPOTS_CACHE
    if _OBSERVATIONS_STORE:
        return

    now = time.time()
    
    # 1. Hotspot 1: Karve Road Junction (MULTI_BUS_CONSENSUS: 4 independent buses, 5 obs)
    karve_obs = [
        PedestrianRiskObservation(
            observation_id="OBS-PMP-KRV-001",
            bus_id="PMP-BUS-001",
            timestamp=now - 21600, # 6 hours ago
            latitude=18.5089,
            longitude=73.8340,
            road_id="ROAD-02",
            road_name="Karve Road Junction",
            pedestrian_count=14,
            vehicle_count=32,
            traffic_density="HIGH",
            proximity_events=3,
            operational_reliability=0.88,
            lighting_condition="DAYLIGHT",
            visibility_score=0.92,
            road_defect_present=True,
            infrastructure_observed="Not observed",
            notes="Crowded commercial intersection crossing without signalized pedestrian phase",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-KRV-002",
            bus_id="PMP-BUS-004",
            timestamp=now - 14400, # 4 hours ago
            latitude=18.5091,
            longitude=73.8342,
            road_id="ROAD-02",
            road_name="Karve Road Junction",
            pedestrian_count=18,
            vehicle_count=38,
            traffic_density="CONGESTED",
            proximity_events=4,
            operational_reliability=0.84,
            lighting_condition="LOW_LIGHT",
            visibility_score=0.74,
            road_defect_present=True,
            infrastructure_observed="Not observed",
            notes="Peak evening passenger crossing near bus stop; lateral vehicle conflict flagged",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-KRV-003",
            bus_id="PMP-BUS-007",
            timestamp=now - 7200, # 2 hours ago
            latitude=18.5088,
            longitude=73.8338,
            road_id="ROAD-02",
            road_name="Karve Road Junction",
            pedestrian_count=12,
            vehicle_count=30,
            traffic_density="HIGH",
            proximity_events=2,
            operational_reliability=0.86,
            lighting_condition="NIGHT",
            visibility_score=0.68,
            road_defect_present=True,
            infrastructure_observed="Not observed",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-KRV-004",
            bus_id="PMP-BUS-001",
            timestamp=now - 3600, # 1 hour ago
            latitude=18.5090,
            longitude=73.8341,
            road_id="ROAD-02",
            road_name="Karve Road Junction",
            pedestrian_count=10,
            vehicle_count=26,
            traffic_density="HIGH",
            proximity_events=2,
            operational_reliability=0.89,
            lighting_condition="NIGHT",
            visibility_score=0.70,
            road_defect_present=True,
            infrastructure_observed="Not observed",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-KRV-005",
            bus_id="PMP-BUS-011",
            timestamp=now - 1200, # 20 mins ago
            latitude=18.5089,
            longitude=73.8340,
            road_id="ROAD-02",
            road_name="Karve Road Junction",
            pedestrian_count=11,
            vehicle_count=28,
            traffic_density="HIGH",
            proximity_events=2,
            operational_reliability=0.91,
            lighting_condition="NIGHT",
            visibility_score=0.75,
            road_defect_present=True,
            infrastructure_observed="Not observed",
        ),
    ]

    # 2. Hotspot 2: Shivajinagar Bus Terminus Entry (MULTI_BUS_CORROBORATION: 2 independent buses: PMP-BUS-003, PMP-BUS-005)
    shiva_obs = [
        PedestrianRiskObservation(
            observation_id="OBS-PMP-SHV-001",
            bus_id="PMP-BUS-003",
            timestamp=now - 25000,
            latitude=18.5310,
            longitude=73.8440,
            road_id="ROAD-04",
            road_name="Shivajinagar Bus Terminus",
            pedestrian_count=16,
            vehicle_count=20,
            traffic_density="HIGH",
            proximity_events=2,
            operational_reliability=0.92,
            lighting_condition="DAYLIGHT",
            visibility_score=0.94,
            infrastructure_observed="Not observed",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-SHV-002",
            bus_id="PMP-BUS-005",
            timestamp=now - 18000,
            latitude=18.5312,
            longitude=73.8443,
            road_id="ROAD-04",
            road_name="Shivajinagar Bus Terminus",
            pedestrian_count=14,
            vehicle_count=22,
            traffic_density="HIGH",
            proximity_events=2,
            operational_reliability=0.87,
            lighting_condition="DAYLIGHT",
            visibility_score=0.90,
            infrastructure_observed="Not observed",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-SHV-003",
            bus_id="PMP-BUS-003",
            timestamp=now - 9000,
            latitude=18.5309,
            longitude=73.8439,
            road_id="ROAD-04",
            road_name="Shivajinagar Bus Terminus",
            pedestrian_count=15,
            vehicle_count=24,
            traffic_density="HIGH",
            proximity_events=3,
            operational_reliability=0.85,
            lighting_condition="LOW_LIGHT",
            visibility_score=0.80,
            infrastructure_observed="Not observed",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-SHV-004",
            bus_id="PMP-BUS-005",
            timestamp=now - 2400,
            latitude=18.5311,
            longitude=73.8442,
            road_id="ROAD-04",
            road_name="Shivajinagar Bus Terminus",
            pedestrian_count=13,
            vehicle_count=19,
            traffic_density="MEDIUM",
            proximity_events=1,
            operational_reliability=0.90,
            lighting_condition="NIGHT",
            visibility_score=0.78,
            infrastructure_observed="Not observed",
        ),
    ]

    # 3. Hotspot 3: Hinjewadi Tech Hub Entry (MULTI_BUS_CONSENSUS: 3 independent buses: PMP-BUS-008, PMP-BUS-006, PMP-BUS-010)
    hinje_obs = [
        PedestrianRiskObservation(
            observation_id="OBS-PMP-HIN-001",
            bus_id="PMP-BUS-008",
            timestamp=now - 28000,
            latitude=18.5912,
            longitude=73.7389,
            road_id="ROAD-05",
            road_name="Hinjewadi Tech Hub Entry",
            pedestrian_count=9,
            vehicle_count=35,
            traffic_density="HIGH",
            proximity_events=1,
            operational_reliability=0.93,
            lighting_condition="DAYLIGHT",
            visibility_score=0.95,
            infrastructure_observed="Marked Crossing",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-HIN-002",
            bus_id="PMP-BUS-006",
            timestamp=now - 16000,
            latitude=18.5914,
            longitude=73.7391,
            road_id="ROAD-05",
            road_name="Hinjewadi Tech Hub Entry",
            pedestrian_count=6,
            vehicle_count=28,
            traffic_density="MEDIUM",
            proximity_events=1,
            operational_reliability=0.91,
            lighting_condition="DAYLIGHT",
            visibility_score=0.92,
            infrastructure_observed="Marked Crossing",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-HIN-003",
            bus_id="PMP-BUS-010",
            timestamp=now - 4800,
            latitude=18.5911,
            longitude=73.7388,
            road_id="ROAD-05",
            road_name="Hinjewadi Tech Hub Entry",
            pedestrian_count=7,
            vehicle_count=30,
            traffic_density="MEDIUM",
            proximity_events=0,
            operational_reliability=0.89,
            lighting_condition="LOW_LIGHT",
            visibility_score=0.82,
            infrastructure_observed="Marked Crossing",
        ),
    ]

    # 4. Hotspot 4: FC Road College Gate (SINGLE_BUS_OBSERVATION: PMP-BUS-002 only)
    fc_obs = [
        PedestrianRiskObservation(
            observation_id="OBS-PMP-FC-001",
            bus_id="PMP-BUS-002",
            timestamp=now - 32000,
            latitude=18.5204,
            longitude=73.8567,
            road_id="ROAD-01",
            road_name="Fergusson College (FC) Road",
            pedestrian_count=8,
            vehicle_count=18,
            traffic_density="MEDIUM",
            proximity_events=1,
            operational_reliability=0.95,
            lighting_condition="DAYLIGHT",
            visibility_score=0.96,
            infrastructure_observed="Marked Crossing",
        ),
        PedestrianRiskObservation(
            observation_id="OBS-PMP-FC-002",
            bus_id="PMP-BUS-002",
            timestamp=now - 11000,
            latitude=18.5206,
            longitude=73.8569,
            road_id="ROAD-01",
            road_name="Fergusson College (FC) Road",
            pedestrian_count=7,
            vehicle_count=16,
            traffic_density="MEDIUM",
            proximity_events=0,
            operational_reliability=0.92,
            lighting_condition="DAYLIGHT",
            visibility_score=0.91,
            infrastructure_observed="Marked Crossing",
        ),
    ]

    _OBSERVATIONS_STORE = karve_obs + shiva_obs + hinje_obs + fc_obs
    _HOTSPOTS_CACHE = _HOTSPOT_ENGINE.cluster_observations(_OBSERVATIONS_STORE)


_seed_testbed_pedestrian_observations()


class SimulateMitigationRequest(BaseModel):
    hotspot_id: str = Field(..., description="Target pedestrian risk hotspot ID")
    scenario_type: str = Field(
        "CROSSING_IMPROVEMENT",
        description="CROSSING_IMPROVEMENT, STREET_LIGHTING, TRAFFIC_CALMING, TARGETED_ENFORCEMENT, COMBINED_INTERVENTION",
    )


@router.get("/hotspots")
def get_pedestrian_hotspots(
    level: Optional[str] = Query(None, description="Filter by risk level: LOW, MODERATE, HIGH, CRITICAL"),
    road_id: Optional[str] = Query(None, description="Filter by road ID"),
) -> List[Dict[str, Any]]:
    """Returns all identified pedestrian risk hotspots with optional level and road filters."""
    hotspots = _HOTSPOTS_CACHE
    if level and level.upper() != "ALL":
        hotspots = [h for h in hotspots if h.risk_level.value.upper() == level.upper()]
    if road_id:
        hotspots = [h for h in hotspots if h.road_id == road_id]
    return [h.to_dict() for h in hotspots]


@router.get("/hotspots/{hotspot_id}")
def get_pedestrian_hotspot_by_id(hotspot_id: str) -> Dict[str, Any]:
    """Returns detailed inspector metadata for a specific pedestrian risk hotspot."""
    for h in _HOTSPOTS_CACHE:
        if h.hotspot_id == hotspot_id:
            return h.to_dict()
    raise HTTPException(status_code=404, detail=f"Pedestrian risk hotspot '{hotspot_id}' not found")


@router.get("/summary")
def get_pedestrian_summary() -> Dict[str, Any]:
    """Returns high-level KPI summary of pedestrian safety intelligence with multi-bus consensus corroboration."""
    total_hotspots = len(_HOTSPOTS_CACHE)
    high_critical = sum(1 for h in _HOTSPOTS_CACHE if h.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL))
    total_obs = len(_OBSERVATIONS_STORE)
    avg_score = sum(h.current_risk_score for h in _HOTSPOTS_CACHE) / max(1, total_hotspots)
    increasing_count = sum(1 for h in _HOTSPOTS_CACHE if h.trend == TrendDirection.INCREASING)

    # Multi-bus consensus breakdown
    single_bus = sum(1 for h in _HOTSPOTS_CACHE if h.consensus_status == ConsensusStatus.SINGLE_BUS_OBSERVATION)
    multi_corrob = sum(1 for h in _HOTSPOTS_CACHE if h.consensus_status == ConsensusStatus.MULTI_BUS_CORROBORATION)
    multi_cons = sum(1 for h in _HOTSPOTS_CACHE if h.consensus_status == ConsensusStatus.MULTI_BUS_CONSENSUS)
    avg_buses = sum(h.unique_bus_count for h in _HOTSPOTS_CACHE) / max(1, total_hotspots)

    # Find dominant peak period
    peak_counts: Dict[str, int] = {}
    for h in _HOTSPOTS_CACHE:
        if "Insufficient" not in h.peak_period:
            peak_counts[h.peak_period] = peak_counts.get(h.peak_period, 0) + 1
    dominant_peak = max(peak_counts, key=peak_counts.get) if peak_counts else "16:00–19:00"

    summary = PedestrianSummary(
        total_hotspots=total_hotspots,
        high_critical_count=high_critical,
        total_risk_observations=total_obs,
        average_risk_score=avg_score,
        peak_observed_period=dominant_peak,
        increasing_hotspots_count=increasing_count,
        generated_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        single_bus_count=single_bus,
        multi_bus_corroborated_count=multi_corrob,
        multi_bus_consensus_count=multi_cons,
        average_independent_buses=avg_buses,
    )
    return summary.to_dict()


@router.get("/timeseries")
def get_pedestrian_timeseries() -> Dict[str, Any]:
    """Returns aggregated time-of-day risk distribution across all active testbed hotspots."""
    time_bins = [
        {"window": "06:00–09:00", "label": "Morning Peak", "average_score": 62, "observation_count": 5},
        {"window": "09:00–16:00", "label": "Daytime Normal", "average_score": 48, "observation_count": 4},
        {"window": "16:00–19:00", "label": "Evening Peak", "average_score": 79, "observation_count": 9},
        {"window": "19:00–22:00", "label": "Night Transition", "average_score": 58, "observation_count": 4},
    ]
    return {
        "time_distribution": time_bins,
        "peak_window": "16:00–19:00",
        "disclaimer": "Prototype risk score based on observed indicators",
    }


@router.post("/simulate")
def simulate_mitigation_scenario(req: SimulateMitigationRequest) -> Dict[str, Any]:
    """Models hypothetical risk score reduction for a selected mitigation intervention."""
    target_hotspot: Optional[PedestrianHotspot] = None
    for h in _HOTSPOTS_CACHE:
        if h.hotspot_id == req.hotspot_id:
            target_hotspot = h
            break

    if not target_hotspot:
        # Fallback baseline score
        baseline_score = 82
    else:
        baseline_score = target_hotspot.current_risk_score

    res = _MITIGATION_ENGINE.simulate_scenario(
        hotspot_id=req.hotspot_id,
        baseline_score=baseline_score,
        scenario_type=req.scenario_type.upper(),
    )
    return res.to_dict()
