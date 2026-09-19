from fastapi import APIRouter
from data import get_overview_stats

router = APIRouter(prefix="/stats", tags=["stats"])

@router.get("/overview")
def get_stats_overview():
    return get_overview_stats()
