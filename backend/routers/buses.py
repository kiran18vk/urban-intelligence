from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from data import BUSES

router = APIRouter(prefix="/buses", tags=["buses"])

@router.get("", response_model=List[Dict[str, Any]])
def list_buses():
    return BUSES

@router.get("/{bus_id}")
def get_bus(bus_id: str):
    for bus in BUSES:
        if bus["id"].lower() == bus_id.lower():
            return bus
    raise HTTPException(status_code=404, detail=f"Bus with ID '{bus_id}' not found")
