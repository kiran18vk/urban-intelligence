"""
Test script for Phase 2A Local AI Inference Foundation.
Downloads a sample urban street image with a bus and pedestrians,
runs YOLOv8 Nano inference, prints structured detections, and saves annotated output.
"""

import sys
import urllib.request
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import cv2

from ai.config import DetectorConfig
from ai.detector import YOLODetector

def main():
    test_dir = Path(__file__).resolve().parent / "test_assets"
    test_dir.mkdir(parents=True, exist_ok=True)
    image_path = test_dir / "urban_bus_test.jpg"
    annotated_path = test_dir / "annotated_bus_test.jpg"

    # Download standard benchmark street image with bus and pedestrians if not present
    if not image_path.exists():
        url = "https://raw.githubusercontent.com/ultralytics/ultralytics/main/ultralytics/assets/bus.jpg"
        print(f"Downloading sample urban street image from {url} ...")
        try:
            urllib.request.urlretrieve(url, str(image_path))
            print(f"Saved test image to {image_path}")
        except Exception as e:
            print(f"Download failed: {e}. Generating local synthetic scene...")
            from ai.detector import create_synthetic_road_scene
            create_synthetic_road_scene(image_path)

    # Load image with OpenCV
    frame = cv2.imread(str(image_path))
    if frame is None:
        raise RuntimeError(f"Could not load image from {image_path}")

    h, w = frame.shape[:2]
    print(f"\nLoaded image: {image_path.name} ({w}x{h} px)")

    # Initialize YOLODetector
    config = DetectorConfig(
        confidence_threshold=0.25,
        device="cpu",
    )
    detector = YOLODetector(config)

    # Run inference with timing
    detections, infer_ms = detector.detect_with_timing(frame, frame_index=0)

    # Print summary
    print("\n" + "=" * 60)
    print("PHASE 2A INFERENCE REPORT")
    print("=" * 60)
    print(f"Model Used:           yolov8n.pt (YOLOv8 Nano)")
    print(f"Inference Device:     {config.device}")
    print(f"Inference Time:       {infer_ms:.2f} ms")
    print(f"Total Detections:     {len(detections)}")
    print(f"Detected Classes:     {sorted(list(set(d.class_name for d in detections)))}")
    print("-" * 60)
    print(f"{'INDEX':<6} {'CLASS':<14} {'CONFIDENCE':<12} {'BBOX [x1, y1, x2, y2]'}")
    print("-" * 60)
    for idx, d in enumerate(detections, 1):
        bbox_str = f"[{d.bbox[0]:.1f}, {d.bbox[1]:.1f}, {d.bbox[2]:.1f}, {d.bbox[3]:.1f}]"
        print(f"{idx:<6} {d.class_name:<14} {d.confidence * 100:>5.1f}%      {bbox_str}")
    print("=" * 60)

    # Save annotated image
    annotated = detector.annotate(frame, detections)
    cv2.imwrite(str(annotated_path), annotated)
    print(f"\nAnnotated output saved to: {annotated_path}")

if __name__ == "__main__":
    main()
