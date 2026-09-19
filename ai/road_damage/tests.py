"""
Comprehensive Test Suite for Road Defect Detection (Phase 3A, SIH 2026 PS 26124).
Tests:
  - Configuration defaults and environment variable overrides
  - Domain models & serialization schema
  - Detection confidence & IoU thresholding
  - Aggregation logic and defect breakdown
  - Empty, None, and invalid input handling
  - Standalone Python invocation without FastAPI
"""

import os
import sys
from pathlib import Path
import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.road_damage.config import (
    DEFAULT_BENCHMARK_MODEL_PATH,
    SUPPORTED_ROAD_DEFECT_CLASSES,
    RoadDamageConfig,
)
from ai.road_damage.models import (
    RoadDamageFrameResult,
    RoadDamagePipelineResult,
    RoadDefectDetection,
)
from ai.road_damage.detector import RoadDamageDetector
from ai.road_damage.pipeline import RoadDamagePipeline


class TestRoadDamageConfig:
    def test_default_config_values(self):
        cfg = RoadDamageConfig()
        assert cfg.confidence_threshold == 0.25
        assert cfg.iou_threshold == 0.45
        assert cfg.device == "cpu"
        assert "pothole" in cfg.target_classes
        assert "longitudinal" in cfg.target_classes
        assert "BENCHMARK MODEL" in cfg.disclaimer

    def test_env_var_model_path_override(self, monkeypatch):
        custom_path = r"C:\CustomPath\custom_model.pt"
        monkeypatch.setenv("ROAD_DAMAGE_MODEL_PATH", custom_path)
        cfg = RoadDamageConfig()
        assert str(cfg.model_path) == custom_path


class TestRoadDamageModels:
    def test_defect_detection_serialization(self):
        det = RoadDefectDetection(
            class_name="pothole",
            confidence=0.72345,
            bbox=[100.12, 150.34, 250.56, 300.78],
            frame_index=12,
            timestamp_sec=0.48,
            source_id="camera_01",
        )
        d = det.to_dict()
        assert d["class_name"] == "pothole"
        assert d["confidence"] == 0.7235
        assert d["bbox"] == [100.12, 150.34, 250.56, 300.78]
        assert d["frame_index"] == 12
        assert d["timestamp_sec"] == 0.48
        assert d["source_id"] == "camera_01"

    def test_frame_result_serialization(self):
        det1 = RoadDefectDetection("pothole", 0.85, [10, 10, 50, 50])
        det2 = RoadDefectDetection("longitudinal", 0.65, [60, 60, 120, 120])
        frame_res = RoadDamageFrameResult(
            frame_index=5,
            timestamp_sec=0.20,
            detections=[det1, det2],
        )
        d = frame_res.to_dict()
        assert d["frame_index"] == 5
        assert d["detection_count"] == 2
        assert len(d["detections"]) == 2

    def test_pipeline_result_serialization(self):
        res = RoadDamagePipelineResult(
            status="success",
            frames_processed=100,
            processing_fps=15.5,
            total_detections=3,
            defects_by_class={"pothole": 2, "alligator": 1},
            annotated_output_path="outputs/annotated.mp4",
            model_path="yolov9s_best.pt",
        )
        d = res.to_dict()
        assert d["status"] == "success"
        assert d["total_detections"] == 3
        assert d["defects_by_class"]["pothole"] == 2
        assert "BENCHMARK MODEL" in d["benchmark_disclaimer"]
        assert "not deduplicated physical" in d["aggregation_note"]


class TestRoadDamageDetectorAndPipeline:
    @pytest.fixture
    def benchmark_model_available(self):
        cfg = RoadDamageConfig()
        return Path(cfg.model_path).exists()

    def test_invalid_model_path_raises(self):
        cfg = RoadDamageConfig(model_path="C:\\NonExistent\\no_model.pt")
        with pytest.raises(FileNotFoundError):
            RoadDamageDetector(cfg)

    def test_empty_frame_returns_empty_detections(self, benchmark_model_available):
        if not benchmark_model_available:
            pytest.skip("Benchmark model file not available in test environment.")
        detector = RoadDamageDetector()
        assert detector.detect(None) == []
        assert detector.detect(np.zeros((0, 0, 3), dtype=np.uint8)) == []

    def test_nonexistent_image_returns_error_result(self, benchmark_model_available):
        if not benchmark_model_available:
            pytest.skip("Benchmark model file not available in test environment.")
        pipeline = RoadDamagePipeline()
        result = pipeline.run_image("C:\\NonExistent\\image.jpg")
        assert result.status == "error"
        assert "not found" in (result.error_message or "").lower()

    def test_nonexistent_video_returns_error_result(self, benchmark_model_available):
        if not benchmark_model_available:
            pytest.skip("Benchmark model file not available in test environment.")
        pipeline = RoadDamagePipeline()
        result = pipeline.run_video("C:\\NonExistent\\video.mp4")
        assert result.status == "error"
        assert "not found" in (result.error_message or "").lower()

    def test_clean_synthetic_image_has_zero_detections(self, benchmark_model_available):
        if not benchmark_model_available:
            pytest.skip("Benchmark model file not available in test environment.")
        pipeline = RoadDamagePipeline()
        # Flat asphalt grey image without road damage
        clean_img = np.ones((480, 640, 3), dtype=np.uint8) * 100
        result = pipeline.run_image(clean_img)
        assert result.status == "success"
        assert result.total_detections == 0
        assert result.defects_by_class == {}

    def test_annotation_with_banner(self, benchmark_model_available):
        if not benchmark_model_available:
            pytest.skip("Benchmark model file not available in test environment.")
        detector = RoadDamageDetector()
        img = np.zeros((480, 640, 3), dtype=np.uint8)
        dets = [RoadDefectDetection("pothole", 0.75, [100.0, 100.0, 200.0, 200.0])]
        annotated = detector.annotate(img, dets, frame_number=1)
        assert annotated is not None
        assert annotated.shape == img.shape


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
