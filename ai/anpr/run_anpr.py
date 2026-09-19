"""
Phase 2B — End-to-End ANPR Pipeline Execution & Verification Script (SIH 2026 PS 26124).

Features:
  1. Unit and benchmark evaluation of OCR engine on synthetic plate images.
     (Clearly labelled as [SYNTHETIC TEST DATA]).
  2. End-to-end ANPR execution on real-world traffic video (e.g., bus_video_test.mp4).
  3. Strict separation of OCR confidence from syntactic format validation.
  4. Track-level plate aggregation and persistent vehicle association.
  5. Honest reporting on readability of real-world plates without fabrication.

Usage:
    python ai/anpr/run_anpr.py
    python ai/anpr/run_anpr.py --video ai/traffic/bus_video_test.mp4 --output ai/anpr/bus_anpr_annotated.mp4
    python ai/anpr/run_anpr.py --synthetic-only
"""

import argparse
import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import cv2
import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.anpr.config import ANPRConfig
from ai.anpr.models import PlateResult
from ai.anpr.ocr import PlateOCR
from ai.anpr.pipeline import ANPRPipeline
from ai.anpr.validator import (
    evaluate_plate_status,
    normalize_plate_text,
    validate_indian_registration,
)
from ai.traffic.config import TrafficConfig


def generate_synthetic_plate_image(text: str) -> np.ndarray:
    """
    Generates a clean synthetic plate crop image for OCR component testing.
    NOTE: SYNTHETIC TEST DATA ONLY — for unit/component validation.
    """
    img = np.ones((90, 320, 3), dtype=np.uint8) * 245  # Off-white plate
    # Plate border
    cv2.rectangle(img, (4, 4), (315, 85), (0, 0, 0), 2)
    # IND badge on left
    cv2.rectangle(img, (6, 6), (40, 83), (230, 200, 150), -1)
    cv2.putText(img, "IND", (8, 55), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 180), 1, cv2.LINE_AA)
    # Registration text
    cv2.putText(
        img,
        text,
        (48, 58),
        cv2.FONT_HERSHEY_SIMPLEX,
        1.1,
        (10, 10, 10),
        2,
        cv2.LINE_AA,
    )
    return img


def run_synthetic_benchmark(ocr_engine: PlateOCR) -> List[dict]:
    """
    Evaluates OCR engine against a suite of synthetic plate images.
    Returns structured results.
    """
    print("\n" + "=" * 60)
    print("EVALUATION 1: SYNTHETIC PLATE OCR BENCHMARK")
    print("[LABEL: SYNTHETIC TEST DATA ONLY - NOT REAL WORLD VIDEO]")
    print("=" * 60)

    test_plates = [
        ("MH12AB1234", "standard"),
        ("DL1CAB5678", "standard"),
        ("KA01MJ9999", "standard"),
        ("22BH1234AA", "bharat_series"),
        ("TN09BZ4321", "standard"),
        ("AP28BW1122", "standard"),
    ]

    results = []
    t_start = time.perf_counter()

    for ground_truth, expected_type in test_plates:
        synth_img = generate_synthetic_plate_image(ground_truth)
        raw_text, conf = ocr_engine.read_text(synth_img)
        norm_text = normalize_plate_text(raw_text)
        is_valid, fmt = validate_indian_registration(norm_text)
        status = evaluate_plate_status(raw_text, norm_text, conf, ocr_engine.config.ocr_confidence_threshold)

        match_exact = (norm_text == ground_truth)
        results.append({
            "ground_truth": ground_truth,
            "raw_text": raw_text,
            "normalized_text": norm_text,
            "confidence": conf,
            "is_format_valid": is_valid,
            "format_type": fmt,
            "status": status,
            "exact_match": match_exact,
        })

        print(
            f"  Ground Truth: {ground_truth:<12} | "
            f"Extracted: {norm_text:<12} | "
            f"Conf: {conf:.2f} | "
            f"Format Valid: {str(is_valid):<5} | "
            f"Status: {status}"
        )

    elapsed = time.perf_counter() - t_start
    avg_ms = (elapsed / len(test_plates)) * 1000.0

    exact_matches = sum(1 for r in results if r["exact_match"])
    valid_syntax = sum(1 for r in results if r["is_format_valid"])

    print("-" * 60)
    print(f"Synthetic Plates Tested   : {len(test_plates)}")
    print(f"Exact Character Matches   : {exact_matches}/{len(test_plates)} ({exact_matches/len(test_plates)*100:.1f}%)")
    print(f"Valid Indian Formats      : {valid_syntax}/{len(test_plates)}")
    print(f"Average OCR Latency       : {avg_ms:.1f} ms / crop (CPU)")
    print("=" * 60)

    return results


def run_real_video_anpr(
    video_path: Path,
    output_path: Optional[Path] = None,
    max_frames: Optional[int] = 60,
    ocr_every_n: int = 3,
):
    """
    Executes full pipeline on real video footage and reports results honestly.
    """
    print("\n" + "=" * 60)
    print("EVALUATION 2: REAL VIDEO ANPR INFERENCE")
    print(f"[VIDEO SOURCE: {video_path.name}]")
    print("=" * 60)

    anpr_cfg = ANPRConfig(ocr_confidence_threshold=0.40, use_gpu=False)
    traffic_cfg = TrafficConfig(confidence_threshold=0.25, device="cpu")

    pipeline = ANPRPipeline(anpr_config=anpr_cfg, traffic_config=traffic_cfg)

    print(f"Input Video       : {video_path}")
    print(f"Output Video      : {output_path or 'None'}")
    print(f"Max Frames        : {max_frames or 'Full'}")
    print(f"OCR Frequency     : Every {ocr_every_n} frames")
    print("Running inference ...")

    result = pipeline.run_video(
        video_path=video_path,
        output_path=output_path,
        max_frames=max_frames,
        ocr_every_n_frames=ocr_every_n,
    )

    print("\n" + "-" * 60)
    print("REAL VIDEO EXECUTION METRICS:")
    print("-" * 60)
    print(f"Status                  : {result.status}")
    print(f"Frames Processed        : {result.frames_processed}")
    print(f"Processing FPS          : {result.processing_fps:.2f} fps (CPU)")
    print(f"Total Vehicles Tracked  : {result.total_vehicles_tracked}")
    print(f"Plates Detected (Text)  : {result.plates_detected}")
    print(f"Plates Format Valid     : {result.plates_format_valid}")
    print(f"Plates 'Verified' (Conf): {result.plates_verified}")
    print(f"Low-Confidence Results  : {result.plates_detected - result.plates_verified}")

    if result.validation_note:
        print(f"\n[HONEST REPORTING NOTE]:")
        print(f"  {result.validation_note}")

    print("\nTracked Vehicle Details:")
    if not result.records:
        print("  No vehicles tracked.")
    else:
        for r in result.records:
            p = r.plate
            print(
                f"  Track ID {r.track_id:2d} ({r.vehicle_class:<10}) | "
                f"Seen: {r.frames_seen:2d} frames | "
                f"Plate: '{p.normalized_text or 'N/A'}' | "
                f"Conf: {p.confidence:.2f} | "
                f"Format: {p.format_type} | "
                f"Status: {p.status}"
            )

    print("=" * 60)
    return result


def main():
    parser = argparse.ArgumentParser(description="Phase 2B ANPR Verification Runner")
    parser.add_argument("--video", default="ai/traffic/bus_video_test.mp4", help="Path to real test video")
    parser.add_argument("--output", default="ai/anpr/bus_anpr_annotated.mp4", help="Path to save annotated video")
    parser.add_argument("--max-frames", type=int, default=60, help="Maximum frames to process")
    parser.add_argument("--synthetic-only", action="store_true", help="Run only synthetic benchmark")
    args = parser.parse_args()

    ocr_engine = PlateOCR(ANPRConfig(use_gpu=False))

    # 1. Synthetic Benchmark
    run_synthetic_benchmark(ocr_engine)

    # 2. Real Video Inference (if not synthetic-only)
    if not args.synthetic_only:
        video_path = Path(args.video)
        if not video_path.exists():
            # Fallback to test_traffic.mp4 if bus_video_test.mp4 is missing
            alt_video = Path("ai/traffic/test_traffic.mp4")
            if alt_video.exists():
                video_path = alt_video

        if video_path.exists():
            out_path = Path(args.output) if args.output else None
            run_real_video_anpr(
                video_path=video_path,
                output_path=out_path,
                max_frames=args.max_frames,
            )
        else:
            print(f"\n[WARNING] Video file not found: {video_path}. Skipping real-video inference.")


if __name__ == "__main__":
    main()
