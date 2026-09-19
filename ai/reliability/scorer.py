"""
Reliability evaluation engine (Phase 5, SIH 2026 PS 26124).
Combines measured observation quality factors into an overall reliability score
and derives operational confidence while ensuring operational_confidence <= raw_confidence.
"""

from typing import Dict, List, Optional
import numpy as np

from ai.reliability.config import ReliabilityConfig
from ai.reliability.metrics import (
    calculate_blur_score,
    calculate_lighting_score,
    calculate_temporal_stability_score,
    calculate_visibility_score,
)
from ai.reliability.models import ObservationQuality, ReliabilityResult


class ReliabilityScorer:
    """
    Transparent, explainable reliability evaluator for mobile urban sensing.
    """

    def __init__(self, config: Optional[ReliabilityConfig] = None):
        self.config = config or ReliabilityConfig()

    def evaluate_observation(
        self,
        raw_confidence: float,
        image: Optional[np.ndarray] = None,
        crop: Optional[np.ndarray] = None,
        track_history_length: Optional[int] = None,
        consecutive_hits: Optional[int] = None,
        custom_factors: Optional[Dict[str, float]] = None,
    ) -> ReliabilityResult:
        """
        Evaluates an observation given an image/crop and optional tracking metadata.
        Returns a complete ReliabilityResult.
        """
        clamped_raw_conf = float(np.clip(raw_confidence, 0.0, 1.0))
        target_img = crop if crop is not None and crop.size > 0 else image

        measured_factors: Dict[str, float] = {}
        reasons: List[str] = []
        unavailable_factors: List[str] = ["occlusion", "camera_angle"]

        is_measured = False

        if target_img is not None and target_img.size > 0:
            is_measured = True
            # 1. Blur
            b_score, b_reason = calculate_blur_score(target_img, self.config)
            if b_score is not None:
                measured_factors["blur"] = b_score
                reasons.append(b_reason)
            else:
                unavailable_factors.append("blur")
                reasons.append(b_reason)

            # 2. Lighting
            l_score, l_reason = calculate_lighting_score(target_img, self.config)
            if l_score is not None:
                measured_factors["lighting"] = l_score
                reasons.append(l_reason)
            else:
                unavailable_factors.append("lighting")
                reasons.append(l_reason)

            # 3. Visibility
            v_score, v_reason = calculate_visibility_score(target_img, self.config)
            if v_score is not None:
                measured_factors["visibility"] = v_score
                reasons.append(v_reason)
            else:
                unavailable_factors.append("visibility")
                reasons.append(v_reason)
        else:
            unavailable_factors.extend(["blur", "lighting", "visibility"])
            reasons.append("Visual quality metrics unavailable (no source frame attached)")

        # 4. Temporal Stability
        t_score, t_reason = calculate_temporal_stability_score(
            track_history_length, consecutive_hits, self.config
        )
        if t_score is not None:
            measured_factors["temporal_stability"] = t_score
            reasons.append(t_reason)
            is_measured = True
        else:
            unavailable_factors.append("temporal_stability")
            reasons.append(t_reason)

        # Include any custom factors (e.g. from tests or explicit simulation inputs)
        if custom_factors:
            for k, v in custom_factors.items():
                measured_factors[k] = float(np.clip(v, 0.0, 1.0))
                is_measured = True

        # Always explicitly note unmeasured environmental/hardware factors
        reasons.append("Occlusion not measured")
        reasons.append("Camera angle metadata unavailable")

        # Deduplicate unavailable_factors
        unique_unavailable = list(dict.fromkeys(unavailable_factors))

        # Compute weighted overall reliability score
        if measured_factors:
            weights_map = {
                "lighting": self.config.weight_lighting,
                "blur": self.config.weight_blur,
                "visibility": self.config.weight_visibility,
                "temporal_stability": self.config.weight_temporal_stability,
            }
            total_weight = 0.0
            weighted_sum = 0.0
            for factor_name, score in measured_factors.items():
                w = weights_map.get(factor_name, 0.25)
                weighted_sum += w * score
                total_weight += w

            overall_reliability = weighted_sum / max(0.001, total_weight)
        else:
            overall_reliability = self.config.fallback_unmeasured_reliability

        overall_reliability = float(np.clip(overall_reliability, 0.0, 1.0))

        # Operational confidence calculation
        # Operational confidence = raw_confidence * reliability_score
        # Guaranteed: operational_confidence <= raw_confidence and in [0.0, 1.0]
        operational_confidence = float(np.clip(clamped_raw_conf * overall_reliability, 0.0, clamped_raw_conf))

        return ReliabilityResult(
            raw_confidence=clamped_raw_conf,
            reliability_score=overall_reliability,
            operational_confidence=operational_confidence,
            factors=measured_factors,
            unavailable_factors=unique_unavailable,
            reasons=reasons,
            is_measured=is_measured,
        )
