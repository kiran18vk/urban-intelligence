"""
Verification & evaluation script for Phase 3A Road Defect Detection (SIH 2026 PS 26124).
DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
"""

import sys
import time
from pathlib import Path

import cv2

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.road_damage.config import RoadDamageConfig
from ai.road_damage.pipeline import RoadDamagePipeline


def main():
    print("=" * 65)
    print("PHASE 3A ROAD DEFECT INFERENCE BENCHMARK RUNNER")
    print("DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL")
    print("=" * 65)

    config = RoadDamageConfig(confidence_threshold=0.20)
    pipeline = RoadDamagePipeline(config)

    output_dir = Path("ai/road_damage/outputs")
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Damaged Road Image
    damaged_img_path = Path(r"C:\Users\KIRAN\Desktop\road_damage_benchmark\test_images\sample_pothole_road.jpg")
    print("\n" + "-" * 65)
    print("1. EVALUATION ON DAMAGED ROAD TEST IMAGE")
    print("-" * 65)
    if damaged_img_path.exists():
        res1 = pipeline.run_image(
            image_input=damaged_img_path,
            output_path=output_dir / "annotated_damaged_road.jpg",
        )
        print(f"Status            : {res1.status}")
        print(f"Latency / FPS     : {res1.processing_fps:.2f} FPS (CPU)")
        print(f"Total Detections  : {res1.total_detections}")
        print(f"Defects by Class  : {res1.defects_by_class}")
        if res1.frame_results and res1.frame_results[0].detections:
            for d in res1.frame_results[0].detections:
                print(f"  - {d.class_name:<14} (conf: {d.confidence:.2f}) bbox: {[round(v, 1) for v in d.bbox]}")
    else:
        print(f"[NOTE] Damaged road image not found at {damaged_img_path}")

    # 2. Clean Street Image
    clean_img_path = Path("ai/test_assets/urban_bus_test.jpg")
    print("\n" + "-" * 65)
    print("2. EVALUATION ON CLEAN STREET IMAGE")
    print("-" * 65)
    if clean_img_path.exists():
        res2 = pipeline.run_image(
            image_input=clean_img_path,
            output_path=output_dir / "annotated_clean_road.jpg",
        )
        print(f"Status            : {res2.status}")
        print(f"Latency / FPS     : {res2.processing_fps:.2f} FPS (CPU)")
        print(f"Total Detections  : {res2.total_detections}")
        print(f"Defects by Class  : {res2.defects_by_class}")
    else:
        print(f"[NOTE] Clean image not found at {clean_img_path}")

    # 3. Real Bus Video
    video_path = Path("ai/traffic/bus_video_test.mp4")
    print("\n" + "-" * 65)
    print("3. EVALUATION ON REAL BUS VIDEO (bus_video_test.mp4)")
    print("-" * 65)
    if video_path.exists():
        res3 = pipeline.run_video(
            video_path=video_path,
            output_path=output_dir / "annotated_bus_video_defects.mp4",
            max_frames=60,
        )
        print(f"Status            : {res3.status}")
        print(f"Frames Processed  : {res3.frames_processed}")
        print(f"Processing FPS    : {res3.processing_fps:.2f} FPS (CPU)")
        print(f"Total Detections  : {res3.total_detections}")
        print(f"Defects by Class  : {res3.defects_by_class}")
        print(f"Annotated Video   : {res3.annotated_output_path}")
    else:
        print(f"[NOTE] Video not found at {video_path}")

    print("\n" + "=" * 65)
    print("PHASE 3A EVALUATION COMPLETE")
    print("=" * 65)


if __name__ == "__main__":
    main()
