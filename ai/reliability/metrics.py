"""
Deterministic image quality and observation metrics (Phase 5, SIH 2026 PS 26124).
Provides CPU-friendly, reproducible measurements for:
- Blur / Sharpness (Variance of Laplacian)
- Lighting / Illumination (Mean Luminance)
- Visibility / Contrast (Standard Deviation of Luminance)
- Temporal Stability (Track continuity where available)
"""

from typing import Optional, Tuple
import cv2
import numpy as np

from ai.reliability.config import ReliabilityConfig


def calculate_blur_score(
    image: np.ndarray,
    config: Optional[ReliabilityConfig] = None,
) -> Tuple[Optional[float], str]:
    """
    Computes image sharpness score using the Variance of Laplacian method.
    Returns (score [0.0, 1.0], human-readable reason).
    Higher variance indicates sharper edges.
    """
    if image is None or image.size == 0:
        return None, "Blur measurement unavailable (empty image)"

    cfg = config or ReliabilityConfig()

    try:
        if len(image.shape) == 3 and image.shape[2] == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        elif len(image.shape) == 2:
            gray = image
        else:
            return None, "Blur measurement unavailable (unsupported image shape)"

        laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        # Normalize score between blur_laplacian_low and blur_laplacian_high
        if laplacian_var <= cfg.blur_laplacian_low:
            score = 0.20 + 0.30 * max(0.0, laplacian_var / cfg.blur_laplacian_low)
            reason = "Low image sharpness (blur or motion detected)"
        elif laplacian_var >= cfg.blur_laplacian_high:
            score = 1.0
            reason = "High image sharpness (crisp focus)"
        else:
            ratio = (laplacian_var - cfg.blur_laplacian_low) / (cfg.blur_laplacian_high - cfg.blur_laplacian_low)
            score = 0.50 + 0.50 * ratio
            reason = "Moderate image sharpness"

        return float(np.clip(score, 0.0, 1.0)), reason
    except Exception as e:
        return None, f"Blur calculation error: {str(e)}"


def calculate_lighting_score(
    image: np.ndarray,
    config: Optional[ReliabilityConfig] = None,
) -> Tuple[Optional[float], str]:
    """
    Computes illumination quality score based on mean luminance.
    Returns (score [0.0, 1.0], human-readable reason).
    """
    if image is None or image.size == 0:
        return None, "Lighting measurement unavailable (empty image)"

    cfg = config or ReliabilityConfig()

    try:
        if len(image.shape) == 3 and image.shape[2] == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        elif len(image.shape) == 2:
            gray = image
        else:
            return None, "Lighting measurement unavailable (unsupported image shape)"

        mean_lum = float(np.mean(gray))

        if mean_lum < cfg.lighting_mean_low:
            # Underexposed / dark
            score = 0.20 + 0.35 * max(0.0, mean_lum / cfg.lighting_mean_low)
            reason = "Poor illumination (underexposed / dark scene)"
        elif mean_lum > cfg.lighting_mean_high:
            # Overexposed / glare
            excess = mean_lum - cfg.lighting_mean_high
            max_excess = 255.0 - cfg.lighting_mean_high
            score = 0.55 - 0.35 * min(1.0, excess / max(1.0, max_excess))
            reason = "Suboptimal lighting (glare / overexposed scene)"
        elif cfg.lighting_mean_optimal_low <= mean_lum <= cfg.lighting_mean_optimal_high:
            score = 0.95
            reason = "Optimal lighting condition"
        else:
            # Transition zones
            if mean_lum < cfg.lighting_mean_optimal_low:
                ratio = (mean_lum - cfg.lighting_mean_low) / (cfg.lighting_mean_optimal_low - cfg.lighting_mean_low)
                score = 0.55 + 0.40 * ratio
                reason = "Acceptable low-light condition"
            else:
                ratio = (cfg.lighting_mean_high - mean_lum) / (cfg.lighting_mean_high - cfg.lighting_mean_optimal_high)
                score = 0.55 + 0.40 * ratio
                reason = "Acceptable bright lighting condition"

        return float(np.clip(score, 0.0, 1.0)), reason
    except Exception as e:
        return None, f"Lighting calculation error: {str(e)}"


def calculate_visibility_score(
    image: np.ndarray,
    config: Optional[ReliabilityConfig] = None,
) -> Tuple[Optional[float], str]:
    """
    Computes scene visibility and contrast using standard deviation of luminance.
    Returns (score [0.0, 1.0], human-readable reason).
    """
    if image is None or image.size == 0:
        return None, "Visibility measurement unavailable (empty image)"

    cfg = config or ReliabilityConfig()

    try:
        if len(image.shape) == 3 and image.shape[2] == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        elif len(image.shape) == 2:
            gray = image
        else:
            return None, "Visibility measurement unavailable (unsupported image shape)"

        std_contrast = float(np.std(gray))

        if std_contrast <= cfg.visibility_std_low:
            score = 0.25 + 0.30 * max(0.0, std_contrast / cfg.visibility_std_low)
            reason = "Low scene contrast (possible haze, fog, or washed out image)"
        elif std_contrast >= cfg.visibility_std_high:
            score = 1.0
            reason = "Clear visibility and high dynamic range"
        else:
            ratio = (std_contrast - cfg.visibility_std_low) / (cfg.visibility_std_high - cfg.visibility_std_low)
            score = 0.55 + 0.45 * ratio
            reason = "Good scene visibility"

        return float(np.clip(score, 0.0, 1.0)), reason
    except Exception as e:
        return None, f"Visibility calculation error: {str(e)}"


def calculate_temporal_stability_score(
    track_history_length: Optional[int],
    consecutive_hits: Optional[int] = None,
    config: Optional[ReliabilityConfig] = None,
) -> Tuple[Optional[float], str]:
    """
    Evaluates tracking persistence across video frames.
    Returns (score [0.0, 1.0], human-readable reason).
    """
    if track_history_length is None or track_history_length <= 0:
        return None, "Temporal tracking history unavailable"

    cfg = config or ReliabilityConfig()
    hits = consecutive_hits if consecutive_hits is not None else track_history_length

    if hits >= cfg.temporal_optimal_hits:
        return 0.98, "High temporal tracking stability"
    elif hits >= cfg.temporal_min_hits:
        ratio = (hits - cfg.temporal_min_hits) / max(1, cfg.temporal_optimal_hits - cfg.temporal_min_hits)
        score = 0.60 + 0.35 * ratio
        return float(np.clip(score, 0.0, 1.0)), "Moderate temporal tracking stability"
    else:
        return 0.45, "Low temporal persistence (transient detection)"
