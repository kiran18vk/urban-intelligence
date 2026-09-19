"""
FastAPI router for Phase 2B ANPR (Automatic Number Plate Recognition) endpoints.
Exposes:
  - GET  /api/ai/anpr/status
  - POST /api/ai/anpr/analyze
"""

import sys
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.anpr.config import ANPRConfig
from ai.anpr.pipeline import ANPRPipeline

router = APIRouter(prefix="/ai/anpr", tags=["ai-anpr"])


@router.get("/status")
def anpr_status():
    """Health and status check for Phase 2B ANPR subsystem."""
    return {
        "status": "available",
        "module": "Phase 2B — ANPR/OCR",
        "ocr_engine": "EasyOCR",
        "supported_standards": [
            "Indian Standard State/UT Series (e.g., MH12AB1234, DL1CAB5678, KA01MJ9999, AP28BW1122)",
            "Bharat (BH) Series (e.g., 22BH1234AA)",
        ],
        "default_confidence_threshold": 0.40,
        "target_classes": ["car", "bus", "truck", "motorcycle"],
        "plate_localization_method": "Lower-ROI contour & aspect ratio filtering (modular fallback)",
    }


@router.post("/analyze")
async def analyze_anpr_video(
    video: UploadFile = File(..., description="Video file to inspect for vehicle license plates"),
    max_frames: Optional[int] = Query(
        None,
        description="Limit the number of frames processed (useful for quick verification)",
        ge=1,
        le=10000,
    ),
    confidence: float = Query(
        0.40,
        description="OCR confidence threshold for verified status",
        ge=0.05,
        le=0.99,
    ),
):
    """
    Executes vehicle tracking and license plate OCR across video frames.
    Associates detected and normalized plate numbers with tracked vehicle IDs.
    """
    content_type = video.content_type or ""
    if not any(t in content_type for t in ("video", "octet-stream")):
        raise HTTPException(
            status_code=415,
            detail=f"Expected a video file, received content-type: {content_type}",
        )

    suffix = Path(video.filename or "upload.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        contents = await video.read()
        tmp.write(contents)
        tmp_path = Path(tmp.name)

    try:
        config = ANPRConfig(ocr_confidence_threshold=confidence)
        pipeline = ANPRPipeline(anpr_config=config)
        result = pipeline.run_video(tmp_path, max_frames=max_frames)
    finally:
        tmp_path.unlink(missing_ok=True)

    return result.to_dict()
