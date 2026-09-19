"""
FastAPI router for Road Defect Detection AI subsystem (Phase 3A, SIH 2026 PS 26124).
DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
Exposes:
  - GET  /api/ai/road-damage/status
  - POST /api/ai/road-damage/analyze
"""

import sys
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.road_damage.config import (
    BENCHMARK_DISCLAIMER_TEXT,
    SUPPORTED_ROAD_DEFECT_CLASSES,
    RoadDamageConfig,
)
from ai.road_damage.pipeline import RoadDamagePipeline

router = APIRouter(prefix="/ai/road-damage", tags=["ai-road-damage"])


@router.get("/status")
def road_damage_status():
    """Health, configuration, and disclaimer status for the road defect AI subsystem."""
    config = RoadDamageConfig()
    model_exists = Path(config.model_path).exists()

    return {
        "status": "available" if model_exists else "model_not_found",
        "module": "Phase 3A — Road Defect Detection",
        "disclaimer": BENCHMARK_DISCLAIMER_TEXT,
        "model_architecture": "YOLOv9 Small (Benchmark Model)",
        "model_path": str(config.model_path),
        "model_loaded": model_exists,
        "supported_classes": SUPPORTED_ROAD_DEFECT_CLASSES,
        "default_confidence_threshold": config.confidence_threshold,
        "default_iou_threshold": config.iou_threshold,
        "device": config.device,
        "note": "Production deployment will feature native YOLO11 trained on official RDD2022 India data.",
    }


@router.post("/analyze")
async def analyze_road_damage(
    file: UploadFile = File(..., description="Image or video file of road surface to analyze"),
    max_frames: Optional[int] = Query(
        None,
        description="Limit the number of frames if a video is uploaded (e.g. 60 for quick preview)",
        ge=1,
        le=10000,
    ),
    confidence: float = Query(
        0.25,
        description="Confidence threshold for defect detection (0.05 to 0.95)",
        ge=0.05,
        le=0.95,
    ),
    sample_every_n: int = Query(
        1,
        description="Sample every N frames for video processing",
        ge=1,
        le=30,
    ),
):
    """
    Executes road surface damage detection on an uploaded image or video.
    Returns structured detections per frame, total counts, and per-class aggregation.
    """
    content_type = file.content_type or ""
    filename = file.filename or "upload.mp4"
    suffix = Path(filename).suffix.lower()

    is_image = any(img_t in content_type for img_t in ("image", "jpeg", "png", "webp")) or suffix in (".jpg", ".jpeg", ".png", ".webp")
    is_video = any(vid_t in content_type for vid_t in ("video", "octet-stream")) or suffix in (".mp4", ".avi", ".mov", ".mkv")

    if not is_image and not is_video:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported media format. Expected image or video, got content-type: {content_type} ({filename})",
        )

    # Save to temp file
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        contents = await file.read()
        tmp.write(contents)
        tmp_path = Path(tmp.name)

    try:
        config = RoadDamageConfig(confidence_threshold=confidence)
        if not Path(config.model_path).exists():
            raise HTTPException(
                status_code=503,
                detail=f"Benchmark model not found at {config.model_path}. Verify ROAD_DAMAGE_MODEL_PATH.",
            )

        pipeline = RoadDamagePipeline(config)

        if is_image:
            result = pipeline.run_image(tmp_path)
        else:
            result = pipeline.run_video(
                video_path=tmp_path,
                max_frames=max_frames,
                sample_every_n=sample_every_n,
            )
    finally:
        tmp_path.unlink(missing_ok=True)

    return result.to_dict()
