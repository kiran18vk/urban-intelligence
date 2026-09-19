"""
FastAPI router for Urban Digital Twin Layer (SIH 2026 PS 26124).

Exposes:
  - GET  /api/digital-twin/state
  - GET  /api/digital-twin/summary
  - GET  /api/digital-twin/roads
  - GET  /api/digital-twin/traffic
  - GET  /api/digital-twin/fleet
  - GET  /api/digital-twin/assets
  - GET  /api/digital-twin/observations
  - GET  /api/digital-twin/entity/{entity_id}
  - POST /api/digital-twin/simulate
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.digital_twin.state_engine import DigitalTwinStateEngine
from ai.digital_twin.simulator import DigitalTwinSimulator
from ai.analytics.aggregators import aggregate_fleet_metrics
from backend.data import BUSES
from backend.routers.events import LIVE_URBAN_EVENTS

router = APIRouter(prefix="/digital-twin", tags=["digital-twin"])

# Singleton digital twin state engine
_TWIN_ENGINE = DigitalTwinStateEngine(data_source="demo_simulation")
_SIMULATOR = DigitalTwinSimulator(_TWIN_ENGINE)
_LAST_INGESTED_COUNT = 0


def _sync_with_urban_events():
    """Synchronizes state engine with any newly generated UrbanEvents in in-memory store."""
    global _LAST_INGESTED_COUNT
    if len(LIVE_URBAN_EVENTS) > _LAST_INGESTED_COUNT:
        new_events = LIVE_URBAN_EVENTS[_LAST_INGESTED_COUNT:]
        _TWIN_ENGINE.ingest_events_batch(new_events)
        _LAST_INGESTED_COUNT = len(LIVE_URBAN_EVENTS)


# Initial sync
_sync_with_urban_events()


class SimulateRequest(BaseModel):
    scenario_type: str = Field(..., description="Scenario type: ROAD_DEFECT, CONGESTION_SURGE, ROAD_CLOSURE")
    target_id: str = Field(..., description="Target entity ID (e.g. ROAD-01, ZONE-02)")
    parameters: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Scenario parameters")


@router.get("/state")
@router.get("/summary")
def get_digital_twin_summary():
    """Returns the top-level Urban Digital Twin snapshot with testbed entities and timeline."""
    _sync_with_urban_events()
    active_buses = len([b for b in BUSES if b.get("status") == "active"])
    summary = _TWIN_ENGINE.get_summary(active_buses_count=active_buses)
    return summary.to_dict()


@router.get("/roads")
def get_digital_twin_roads():
    """Returns digital twin representations of Pune testbed road segments."""
    _sync_with_urban_events()
    return _TWIN_ENGINE.get_roads()


@router.get("/traffic")
def get_digital_twin_traffic():
    """Returns digital twin traffic zones, observed densities, and estimated delays."""
    _sync_with_urban_events()
    return _TWIN_ENGINE.get_traffic_zones()


@router.get("/fleet")
def get_digital_twin_fleet():
    """Returns digital twin fleet operational metrics (reusing analytics source)."""
    fleet_metrics = aggregate_fleet_metrics(BUSES, LIVE_URBAN_EVENTS)
    return {
        "generated_at": _TWIN_ENGINE.get_summary().generated_at,
        "data_source": "demo_simulation",
        "fleet": fleet_metrics.to_dict(),
        "buses_count": len(BUSES),
        "disclaimer": "Fleet twin status mapped from active bus telemetry and route schedules.",
    }


@router.get("/assets")
def get_digital_twin_assets():
    """Returns detected physical infrastructure assets (signals, dividers, crossings, signs)."""
    _sync_with_urban_events()
    return _TWIN_ENGINE.get_assets()


@router.get("/observations")
def get_digital_twin_observations(
    entity_id: Optional[str] = Query(None, description="Filter observations by entity ID")
):
    """Returns perception observations associated with digital twin entities."""
    _sync_with_urban_events()
    return _TWIN_ENGINE.get_observations(entity_id=entity_id)


@router.get("/entity/{entity_id}")
def get_digital_twin_entity(entity_id: str):
    """Returns detailed state for a specific road, traffic zone, or asset."""
    _sync_with_urban_events()
    entity = _TWIN_ENGINE.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail=f"Digital Twin entity '{entity_id}' not found.")
    return entity


@router.post("/simulate")
def run_what_if_simulation(req: SimulateRequest):
    """Runs a deterministic What-If scenario projection."""
    _sync_with_urban_events()
    try:
        result = _SIMULATOR.simulate_scenario(
            scenario_type=req.scenario_type,
            target_id=req.target_id,
            parameters=req.parameters,
        )
        return result.to_dict()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")
