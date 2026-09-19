"""
FastAPI router for Observation Reliability Intelligence (Phase 5, SIH 2026 PS 26124).
Provides health check and metadata for observation reliability scoring subsystem.
"""

import sys
from pathlib import Path
from fastapi import APIRouter

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.reliability.config import ReliabilityConfig

router = APIRouter(prefix="/ai/reliability", tags=["ai-reliability"])


@router.get("/status")
def get_reliability_status():
    """
    Returns observation reliability subsystem availability, weights, and supported metrics.
    """
    cfg = ReliabilityConfig()
    return {
        "status": "available",
        "module": "Phase 5 — Observation Reliability Intelligence",
        "version": "1.0.0",
        "supported_factors": ["lighting", "blur", "visibility", "temporal_stability"],
        "unmeasured_factors": ["occlusion", "camera_angle"],
        "weights": {
            "lighting": cfg.weight_lighting,
            "blur": cfg.weight_blur,
            "visibility": cfg.weight_visibility,
            "temporal_stability": cfg.weight_temporal_stability,
        },
        "thresholds": {
            "low_reliability_threshold": cfg.low_reliability_threshold,
            "blur_laplacian_low": cfg.blur_laplacian_low,
            "blur_laplacian_high": cfg.blur_laplacian_high,
            "lighting_mean_low": cfg.lighting_mean_low,
            "lighting_mean_high": cfg.lighting_mean_high,
        },
        "disclaimer": "Observation reliability reflects visual/temporal data quality and does not claim ground-truth validation.",
    }
