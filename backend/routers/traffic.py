from fastapi import APIRouter
from typing import List, Dict, Any
from data import CONGESTION_ZONES

router = APIRouter(prefix="/traffic", tags=["traffic"])

@router.get("/congestion", response_model=List[Dict[str, Any]])
def get_traffic_congestion():
    return CONGESTION_ZONES
