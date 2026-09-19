from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from data import DEFECTS, DEFECT_STATUSES

router = APIRouter(prefix="/defects", tags=["defects"])

class DefectStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None
    actor: Optional[str] = "Municipal Dispatch Unit"

@router.get("", response_model=List[Dict[str, Any]])
def list_defects():
    return DEFECTS

@router.get("/{defect_id}")
def get_defect(defect_id: str):
    for defect in DEFECTS:
        if defect["id"].lower() == defect_id.lower():
            return defect
    raise HTTPException(status_code=404, detail=f"Defect with ID '{defect_id}' not found")

@router.patch("/{defect_id}/status")
def update_defect_status(defect_id: str, payload: DefectStatusUpdate):
    for defect in DEFECTS:
        if defect["id"].lower() == defect_id.lower():
            new_status = payload.status.lower()
            defect["status"] = new_status
            if "lifecycleHistory" not in defect:
                defect["lifecycleHistory"] = []
            defect["lifecycleHistory"].append({
                "status": payload.status,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "note": payload.note or f"Status updated to {payload.status}",
                "actor": payload.actor,
            })
            return defect
    raise HTTPException(status_code=404, detail=f"Defect with ID '{defect_id}' not found")
