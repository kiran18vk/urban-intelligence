"""
Configuration for Observation Reliability Intelligence (Phase 5, SIH 2026 PS 26124).
Provides explainable weights, quality thresholds, and operational confidence tuning parameters.
"""

from dataclasses import dataclass


@dataclass
class ReliabilityConfig:
    """
    Configurable parameters and weights for observation reliability calculation.
    """
    # Factor Weights for Quality Scoring (normalized across available factors)
    weight_lighting: float = 0.35
    weight_blur: float = 0.40
    weight_visibility: float = 0.25
    weight_temporal_stability: float = 0.20

    # Blur / Sharpness Thresholds (Variance of Laplacian)
    # < blur_low is severely blurred; > blur_high is crisp and sharp
    blur_laplacian_low: float = 50.0
    blur_laplacian_high: float = 400.0

    # Lighting / Luminance Thresholds (Mean Grayscale Luminance [0, 255])
    # < lighting_low is underexposed / dark scene
    # > lighting_high is overexposed / saturated
    lighting_mean_low: float = 35.0
    lighting_mean_optimal_low: float = 80.0
    lighting_mean_optimal_high: float = 175.0
    lighting_mean_high: float = 230.0

    # Visibility / Contrast Thresholds (Standard Deviation of Luminance)
    # < visibility_low is washed out / hazy / foggy
    # > visibility_high is high dynamic range / clear
    visibility_std_low: float = 18.0
    visibility_std_high: float = 65.0

    # Temporal Stability Thresholds (Track Persistence Hits)
    temporal_min_hits: int = 3
    temporal_optimal_hits: int = 10

    # Confidence Adjustment Scaling
    # Operational confidence = clamp(raw_confidence * reliability_score, 0.0, raw_confidence)
    # Low quality reliability threshold for alert flagging
    low_reliability_threshold: float = 0.60

    # Fallback reliability score when no image data is present
    fallback_unmeasured_reliability: float = 0.85
