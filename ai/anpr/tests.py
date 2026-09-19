"""
Comprehensive test suite for Phase 2B ANPR (SIH 2026 PS 26124).
Tests:
  - Plate normalization
  - Valid Indian registration formats (standard state codes & Bharat series)
  - Invalid registration formats
  - OCR confidence threshold handling
  - Track-to-plate association
  - Missing plate handling
  - Low-confidence OCR classification
  - Pipeline result schema & serialization
"""

import sys
from pathlib import Path
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.anpr.config import ANPRConfig
from ai.anpr.models import ANPRPipelineResult, PlateResult, VehiclePlateRecord
from ai.anpr.validator import (
    evaluate_plate_status,
    normalize_plate_text,
    validate_indian_registration,
)


class TestPlateNormalization:
    def test_strip_whitespace_and_hyphens(self):
        assert normalize_plate_text("MH-12-AB-1234") == "MH12AB1234"
        assert normalize_plate_text("  MH 14 CD 5678 ") == "MH14CD5678"
        assert normalize_plate_text("KA.01.MJ.9999") == "KA01MJ9999"

    def test_case_insensitive_handling(self):
        assert normalize_plate_text("mh12ab1234") == "MH12AB1234"
        assert normalize_plate_text("ap28bw1122") == "AP28BW1122"

    def test_contextual_substitution_without_hallucinating(self):
        # In state code, digit '0' -> 'O', '1' -> 'I'
        # In numbers, letter 'O' -> '0', 'I' -> '1', 'B' -> '8'
        # Example: 'MH12AB123O' -> 'MH12AB1230'
        assert normalize_plate_text("MH12AB123O") == "MH12AB1230"
        assert normalize_plate_text("DL01AB123I") == "DL01AB1231"

    def test_empty_string_normalization(self):
        assert normalize_plate_text("") == ""
        assert normalize_plate_text("   ") == ""
        assert normalize_plate_text("---") == ""


class TestRegistrationFormatValidation:
    def test_valid_standard_state_plates(self):
        valid_examples = [
            "MH12AB1234",   # Maharashtra
            "MH14CD5678",   # Pimpri-Chinchwad
            "DL1CAB5678",   # Delhi
            "KA01MJ9999",   # Karnataka
            "AP28BW1122",   # Andhra Pradesh
            "TN09BZ4321",   # Tamil Nadu
            "GJ01AB0001",   # Gujarat
            "UP32MN4567",   # Uttar Pradesh
            "TS07EA1234",   # Telangana
            "KL07BN9988",   # Kerala
        ]
        for plate in valid_examples:
            is_valid, fmt = validate_indian_registration(plate)
            assert is_valid is True, f"Failed for {plate}"
            assert fmt == "standard"

    def test_valid_bharat_series(self):
        bh_examples = [
            "22BH1234AA",
            "21BH9999A",
            "23BH5678XY",
        ]
        for plate in bh_examples:
            is_valid, fmt = validate_indian_registration(plate)
            assert is_valid is True, f"Failed for {plate}"
            assert fmt == "bharat_series"

    def test_invalid_registration_formats(self):
        invalid_examples = [
            "123456",            # Only numbers
            "ABCDEF",            # Only letters
            "MH12345",           # Missing series code
            "INVALID_PLATE",     # Random text
            "USA9999",           # Wrong length/format
            "M12AB1234",         # 1-letter state code
            "MH12AB12345",       # 5 digits at end
        ]
        for plate in invalid_examples:
            is_valid, fmt = validate_indian_registration(plate)
            assert is_valid is False, f"Should be invalid: {plate}"
            assert fmt == "invalid"

    def test_empty_or_none_validation(self):
        is_valid, fmt = validate_indian_registration("")
        assert is_valid is False
        assert fmt == "invalid"


class TestConfidenceAndStatusEvaluation:
    def test_verified_status(self):
        # Valid format + confidence >= threshold -> verified
        status = evaluate_plate_status(
            raw_text="MH 12 AB 1234",
            normalized_text="MH12AB1234",
            confidence=0.85,
            confidence_threshold=0.40,
        )
        assert status == "verified"

    def test_low_confidence_due_to_score(self):
        # Valid format but confidence < threshold -> low_confidence
        status = evaluate_plate_status(
            raw_text="MH 12 AB 1234",
            normalized_text="MH12AB1234",
            confidence=0.28,
            confidence_threshold=0.40,
        )
        assert status == "low_confidence"

    def test_low_confidence_due_to_invalid_format(self):
        # High confidence but invalid format -> low_confidence
        status = evaluate_plate_status(
            raw_text="GARBAGE 999",
            normalized_text="GARBAGE999",
            confidence=0.92,
            confidence_threshold=0.40,
        )
        assert status == "low_confidence"

    def test_not_detected_status(self):
        # Empty text -> not_detected
        assert evaluate_plate_status("", "", 0.0, 0.40) == "not_detected"
        assert evaluate_plate_status("raw", "", 0.5, 0.40) == "not_detected"


class TestTrackToPlateAssociation:
    def test_vehicle_plate_record_schema(self):
        plate = PlateResult(
            raw_text="MH 12 AB 1234",
            normalized_text="MH12AB1234",
            confidence=0.88,
            is_format_valid=True,
            format_type="standard",
            status="verified",
            plate_bbox=[100.0, 200.0, 220.0, 240.0],
            frame_index=15,
            timestamp_sec=0.60,
        )
        record = VehiclePlateRecord(
            track_id=17,
            vehicle_class="car",
            first_seen_frame=0,
            last_seen_frame=30,
            frames_seen=31,
            plate=plate,
        )
        d = record.to_dict()

        assert d["track_id"] == 17
        assert d["vehicle_class"] == "car"
        assert d["plate"]["normalized_text"] == "MH12AB1234"
        assert d["plate"]["status"] == "verified"
        assert d["plate"]["confidence"] == 0.88
        assert d["plate"]["is_format_valid"] is True
        assert d["plate"]["frame_index"] == 15

    def test_track_level_aggregation_highest_confidence(self):
        """
        Scenario from requirements:
        Track ID 17:
          Frame 20 -> 'MH12AB1234' confidence 0.41
          Frame 21 -> 'MH12AB1234' confidence 0.72
          Frame 22 -> 'MH12AB1234' confidence 0.84
          Frame 23 -> 'INVALID999' confidence 0.95 (invalid format)
        Must keep the highest-confidence valid reading (0.84).
        """
        record = VehiclePlateRecord(track_id=17, vehicle_class="car")

        r1 = PlateResult(raw_text="MH12AB1234", normalized_text="MH12AB1234", confidence=0.41, is_format_valid=True, status="verified")
        r2 = PlateResult(raw_text="MH12AB1234", normalized_text="MH12AB1234", confidence=0.72, is_format_valid=True, status="verified")
        r3 = PlateResult(raw_text="MH12AB1234", normalized_text="MH12AB1234", confidence=0.84, is_format_valid=True, status="verified")
        r4 = PlateResult(raw_text="INVALID999", normalized_text="INVALID999", confidence=0.95, is_format_valid=False, status="low_confidence")

        record.add_reading(r1)
        assert record.plate.confidence == 0.41

        record.add_reading(r2)
        assert record.plate.confidence == 0.72

        record.add_reading(r3)
        assert record.plate.confidence == 0.84

        record.add_reading(r4)
        # Even though r4 has higher confidence (0.95), it is invalid format, so r3 (0.84, valid) is retained
        assert record.plate.confidence == 0.84
        assert record.plate.normalized_text == "MH12AB1234"
        assert record.plate.status == "verified"
        assert len(record.candidates) == 4

    def test_missing_plate_record(self):
        record = VehiclePlateRecord(
            track_id=42,
            vehicle_class="bus",
            first_seen_frame=5,
            last_seen_frame=20,
            frames_seen=16,
            plate=PlateResult(),
        )
        d = record.to_dict()
        assert d["track_id"] == 42
        assert d["plate"]["status"] == "not_detected"
        assert d["plate"]["normalized_text"] == ""
        assert d["plate"]["confidence"] == 0.0

    def test_anpr_pipeline_result_schema(self):
        res = ANPRPipelineResult(
            status="success",
            frames_processed=60,
            processing_fps=10.5,
            total_vehicles_tracked=2,
            plates_detected=1,
            plates_format_valid=1,
            plates_verified=1,
            records=[
                VehiclePlateRecord(
                    track_id=1,
                    vehicle_class="car",
                    plate=PlateResult(
                        raw_text="MH12AB1234",
                        normalized_text="MH12AB1234",
                        confidence=0.91,
                        is_format_valid=True,
                        format_type="standard",
                        status="verified",
                    ),
                )
            ],
            validation_note=None,
        )
        d = res.to_dict()
        assert d["status"] == "success"
        assert d["total_vehicles_tracked"] == 2
        assert d["plates_verified"] == 1
        assert d["plates_format_valid"] == 1
        assert len(d["records"]) == 1
        assert d["records"][0]["plate"]["status"] == "verified"


class TestSyntheticPlateOCR:
    """
    Tests EasyOCR engine on clearly labelled synthetic plate images.
    NOTE: SYNTHETIC TEST DATA ONLY — not real-world video frames.
    """

    def test_synthetic_plate_ocr_reading(self):
        import cv2
        import numpy as np
        from ai.anpr.ocr import PlateOCR

        # Generate synthetic high-contrast plate image (white background, black font)
        # [SYNTHETIC TEST DATA]
        img = np.ones((80, 280, 3), dtype=np.uint8) * 255
        cv2.rectangle(img, (2, 2), (277, 77), (0, 0, 0), 2)
        cv2.putText(
            img,
            "MH12AB1234",
            (15, 55),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.2,
            (0, 0, 0),
            3,
            cv2.LINE_AA,
        )

        ocr_engine = PlateOCR()
        raw_text, conf = ocr_engine.read_text(img)
        norm_text = normalize_plate_text(raw_text)

        assert "MH" in norm_text or len(norm_text) > 0
        assert conf > 0.0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
