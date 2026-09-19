"""
API Router for Predictive Urban Intelligence & Risk Forecasting (Feature #9).
"""
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from ai.predictive_intelligence.service import PredictiveIntelligenceService
from ai.predictive_intelligence.config import PREDICTIVE_DISCLOSURE

router = APIRouter(prefix="/predictive", tags=["Predictive Intelligence"])

_service: Optional[PredictiveIntelligenceService] = None


def get_service() -> PredictiveIntelligenceService:
    global _service
    if _service is None:
        _service = PredictiveIntelligenceService()
    return _service


class CreateActionRequest(BaseModel):
    operator: str = Field(default="Console Operator")
    custom_notes: Optional[str] = Field(default=None)


@router.get("/health")
def get_predictive_health():
    """Health check endpoint for predictive intelligence store."""
    svc = get_service()
    summary = svc.get_summary()
    return {
        "status": "HEALTHY",
        "service": "Predictive Urban Intelligence & Risk Forecasting",
        "active_forecasts": summary.active_forecasts,
        "database": svc.store.db_path,
        "disclaimer": PREDICTIVE_DISCLOSURE,
    }


@router.get("/summary")
def get_predictive_summary():
    """Returns aggregated forecast KPIs and distribution metrics."""
    svc = get_service()
    return svc.get_summary().to_dict()


@router.get("/forecasts")
def list_forecasts(
    target_type: Optional[str] = Query(None),
    risk_level: Optional[str] = Query(None),
    trend_direction: Optional[str] = Query(None),
    warning_level: Optional[str] = Query(None),
    bus_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """Retrieves a filtered, paginated list of predictive forecasts."""
    svc = get_service()
    items, total = svc.list_forecasts(
        target_type=target_type,
        risk_level=risk_level,
        trend_direction=trend_direction,
        warning_level=warning_level,
        bus_id=bus_id,
        search=search,
        limit=limit,
        offset=offset,
    )
    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [item.to_dict() for item in items],
        "disclaimer": PREDICTIVE_DISCLOSURE,
    }


@router.get("/warnings")
def list_early_warnings():
    """Returns active forecasts with WARNING or CRITICAL early warning status."""
    svc = get_service()
    items, total = svc.list_forecasts(limit=100)
    warnings = [item.to_dict() for item in items if item.early_warning in ["WARNING", "CRITICAL", "WATCH"]]
    return {
        "total": len(warnings),
        "items": warnings,
        "disclaimer": PREDICTIVE_DISCLOSURE,
    }


@router.get("/hotspots")
def list_persistent_hotspots():
    """Returns persistent and emerging hotspot forecast outlooks."""
    svc = get_service()
    items, total = svc.list_forecasts(target_type="PERSISTENT_HOTSPOT", limit=50)
    return {
        "total": total,
        "items": [item.to_dict() for item in items],
        "disclaimer": PREDICTIVE_DISCLOSURE,
    }


@router.get("/trends/{target_type}/{target_id}")
def get_target_trend(target_type: str, target_id: str):
    """Retrieves trend and timeseries projection for a specific target entity."""
    svc = get_service()
    fcst = svc.store.find_by_target(target_type=target_type, target_id=target_id)
    if not fcst:
        raise HTTPException(status_code=404, detail=f"No forecast found for target {target_id} of type {target_type}.")
    return fcst.to_dict()


@router.get("/forecasts/{forecast_id}")
def get_forecast_detail(forecast_id: str):
    """Retrieves detailed record and timeseries data for a single forecast."""
    svc = get_service()
    fcst = svc.get_forecast(forecast_id)
    if not fcst:
        raise HTTPException(status_code=404, detail=f"Forecast {forecast_id} not found.")
    return fcst.to_dict()


@router.get("/{forecast_id}/history")
def get_forecast_history(forecast_id: str):
    """Retrieves immutable audit and recomputation timeline for a forecast."""
    svc = get_service()
    history = svc.get_history(forecast_id)
    return [h.to_dict() for h in history]


@router.post("/recompute")
def recompute_forecasts():
    """Recomputes all active forecasts against latest testbed observations."""
    svc = get_service()
    return svc.recompute_forecasts()


@router.post("/{forecast_id}/create-action")
def create_action_from_forecast(forecast_id: str, payload: CreateActionRequest):
    """
    Creates a prototype authority action ticket derived from a forecast outlook.
    """
    svc = get_service()
    try:
        return svc.create_authority_action_from_forecast(
            forecast_id=forecast_id,
            operator=payload.operator,
            custom_notes=payload.custom_notes,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
