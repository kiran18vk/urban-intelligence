from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from data import DEFECTS

router = APIRouter(prefix="/defects", tags=["defects"])

@router.get("", response_model=List[Dict[str, Any]])
def list_defects():
    return DEFECTS

@router.get("/{defect_id}")
def get_defect(defect_id: str):
    for defect in DEFECTS:
        if defect["id"].lower() == defect_id.lower():
            return defect
    raise HTTPException(status_code=404, detail=f"Defect with ID '{defect_id}' not found")
