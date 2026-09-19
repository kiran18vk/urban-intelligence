"""
Comprehensive Test Suite for Observation Reliability Intelligence (Phase 5, SIH 2026 PS 26124).
Tests:
- Score range validation in [0.0, 1.0]
- Deterministic calculation
- Blur detection and scoring
- Lighting evaluation (dark, optimal, glare)
- Visibility / contrast evaluation
- Operational confidence clamping and mathematical guarantee (operational <= raw)
- Confidence never increases above raw AI confidence
- Explicit unavailable factors tracking
- Human-readable reason generation
- Empty / missing image fallback handling
- ReliabilityResult serialization
"""

import sys
from pathlib import Path
import cv2
import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.reliability.config import ReliabilityConfig
from ai.reliability.metrics import (
    calculate_blur_score,
    calculate_lighting_score,
    calculate_temporal_stability_score,
    calculate_visibility_score,
)
from ai.reliability.models import ObservationQuality, ReliabilityResult
from ai.reliability.scorer import ReliabilityScorer


class TestReliabilityMetrics:
    def test_sharp_synthetic_image_blur_score(self):
        # Create a sharp image with high frequency edges (checkerboard pattern)
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        img[::20, :, :] = 255
        img[:, ::20, :] = 255
        score, reason = calculate_blur_score(img)
        assert score is not None
        assert 0.0 <= score <= 1.0
        assert score > 0.70
        assert "sharpness" in reason.lower()

    def test_blurred_synthetic_image_blur_score(self):
        # Create a blurred image
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        img[::20, :, :] = 255
        img[:, ::20, :] = 255
        blurred = cv2.GaussianBlur(img, (25, 25), 10.0)
        score, reason = calculate_blur_score(blurred)
        assert score is not None
        assert 0.0 <= score <= 1.0
        assert score < 0.60
        assert "blur" in reason.lower()

    def test_dark_image_lighting_score(self):
        # Dark underexposed image
        dark_img = np.full((100, 100, 3), 15, dtype=np.uint8)
        score, reason = calculate_lighting_score(dark_img)
        assert score is not None
        assert 0.0 <= score <= 1.0
        assert score < 0.50
        assert "dark" in reason.lower() or "underexposed" in reason.lower() or "illumination" in reason.lower()

    def test_optimal_image_lighting_score(self):
        # Optimal medium gray image
        opt_img = np.full((100, 100, 3), 128, dtype=np.uint8)
        score, reason = calculate_lighting_score(opt_img)
        assert score is not None
        assert 0.0 <= score <= 1.0
        assert score > 0.90
        assert "optimal" in reason.lower()

    def test_overexposed_image_lighting_score(self):
        # Glare / overexposed image
        glare_img = np.full((100, 100, 3), 250, dtype=np.uint8)
        score, reason = calculate_lighting_score(glare_img)
        assert score is not None
        assert 0.0 <= score <= 1.0
        assert score < 0.60
        assert "glare" in reason.lower() or "overexposed" in reason.lower()

    def test_contrast_visibility_score(self):
        # High contrast image
        high_contrast = np.zeros((100, 100, 3), dtype=np.uint8)
        high_contrast[:50, :, :] = 255
        score, reason = calculate_visibility_score(high_contrast)
        assert score is not None
        assert 0.0 <= score <= 1.0
        assert score > 0.90

        # Zero contrast flat image
        flat = np.full((100, 100, 3), 128, dtype=np.uint8)
        score_flat, _ = calculate_visibility_score(flat)
        assert score_flat is not None
        assert score_flat < 0.40

    def test_temporal_stability_metric(self):
        score_high, reason_high = calculate_temporal_stability_score(15, 12)
        assert score_high is not None
        assert score_high > 0.90
        assert "high" in reason_high.lower()

        score_low, reason_low = calculate_temporal_stability_score(2, 1)
        assert score_low is not None
        assert score_low < 0.50

        score_none, reason_none = calculate_temporal_stability_score(None)
        assert score_none is None
        assert "unavailable" in reason_none.lower()


class TestReliabilityScorer:
    def setup_method(self):
        self.scorer = ReliabilityScorer()

    def test_operational_confidence_never_exceeds_raw(self):
        raw_confs = [0.10, 0.45, 0.72, 0.91, 0.99]
        for rc in raw_confs:
            res = self.scorer.evaluate_observation(raw_confidence=rc)
            assert res.operational_confidence <= rc
            assert 0.0 <= res.operational_confidence <= 1.0
            assert 0.0 <= res.reliability_score <= 1.0

    def test_poor_quality_reduces_confidence(self):
        # Extremely dark image
        dark_img = np.full((100, 100, 3), 10, dtype=np.uint8)
        raw_conf = 0.90
        res = self.scorer.evaluate_observation(raw_confidence=raw_conf, image=dark_img)
        assert res.operational_confidence < raw_conf
        assert res.reliability_score < 0.70
        assert "lighting" in res.factors

    def test_good_quality_preserves_confidence(self):
        # Crisp, well-lit image
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        img[::10, :, :] = 255
        img[:, ::10, :] = 255
        img = (img * 0.5 + 64).astype(np.uint8)
        raw_conf = 0.85
        res = self.scorer.evaluate_observation(raw_confidence=raw_conf, image=img)
        assert res.operational_confidence <= raw_conf
        assert res.operational_confidence >= 0.70
        assert res.reliability_score >= 0.80

    def test_unavailable_factors_explicitly_reported(self):
        res = self.scorer.evaluate_observation(raw_confidence=0.75)
        assert "occlusion" in res.unavailable_factors
        assert "camera_angle" in res.unavailable_factors
        reasons_text = " ".join(res.reasons)
        assert "occlusion" in reasons_text.lower()
        assert "camera angle" in reasons_text.lower()

    def test_empty_image_handling(self):
        res = self.scorer.evaluate_observation(raw_confidence=0.80, image=None)
        assert res.is_measured is False
        assert res.operational_confidence <= 0.80
        assert len(res.unavailable_factors) >= 2

    def test_serialization(self):
        res = self.scorer.evaluate_observation(
            raw_confidence=0.88,
            custom_factors={"lighting": 0.95, "blur": 0.90, "visibility": 0.85},
        )
        d = res.to_dict()
        assert "score" in d
        assert "raw_confidence" in d
        assert "operational_confidence" in d
        assert "factors" in d
        assert "unavailable_factors" in d
        assert "reasons" in d
        assert d["operational_confidence"] <= d["raw_confidence"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
