"""
FastAPI router for AI traffic analysis endpoints (Phase 2C, SIH 2026 PS 26124).
POST /api/ai/traffic/analyze — accepts a video file and returns tracking analytics.
GET  /api/ai/traffic/status — health check for AI subsystem.
"""

import sys
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.traffic.config import TrafficConfig
from ai.traffic.pipeline import TrafficPipeline

router = APIRouter(prefix="/ai/traffic", tags=["ai-traffic"])


@router.get("/status")
def ai_traffic_status():
    """Health check confirming the AI tracking subsystem is available."""
    return {
        "status": "available",
        "module": "Phase 2C — Multi-Object Vehicle Tracking",
        "tracker": "ByteTrack (via Ultralytics)",
        "model": "YOLOv8n",
        "supported_classes": ["car", "motorcycle", "bicycle", "bus", "truck", "person"],
        "speed_estimation": "uncalibrated (returns null unless pixels_per_meter configured)",
    }


@router.post("/analyze")
async def analyze_traffic_video(
    video: UploadFile = File(..., description="Video file to analyze (MP4, AVI, MOV)"),
    max_frames: Optional[int] = Query(
        None,
        description="Limit frames processed (useful for quick tests)",
        ge=1,
        le=10000,
    ),
    line_y_fraction: float = Query(
        0.5,
        description="Virtual counting line position as fraction of frame height (0.0–1.0)",
        ge=0.0,
        le=1.0,
    ),
    confidence: float = Query(0.25, ge=0.05, le=0.95),
):
    """
    Run multi-object vehicle tracking on an uploaded video.
    Returns structured tracking analytics including persistent track IDs,
    directional counts, density level, and per-class vehicle counts.
    """
    # Validate MIME type loosely
    content_type = video.content_type or ""
    if not any(t in content_type for t in ("video", "octet-stream")):
        raise HTTPException(
            status_code=415,
            detail=f"Expected a video file, got content-type: {content_type}",
        )

    # Write upload to a temp file
    suffix = Path(video.filename or "upload.mp4").suffix or ".mp4"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        contents = await video.read()
        tmp.write(contents)
        tmp_path = Path(tmp.name)

    try:
        config = TrafficConfig(
            confidence_threshold=confidence,
            line_y_fraction=line_y_fraction,
        )
        pipeline = TrafficPipeline(config)
        result = pipeline.run_video(tmp_path, max_frames=max_frames)
    finally:
        tmp_path.unlink(missing_ok=True)

    return result.to_dict()
