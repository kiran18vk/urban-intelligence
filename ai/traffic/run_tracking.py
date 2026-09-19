"""
Phase 2C — End-to-End Traffic Tracking Verification Script (SIH 2026 PS 26124).

Runs the full pipeline on either a provided video or a freshly generated synthetic one.
Prints a structured report and saves an annotated output video.

Usage:
    python ai/traffic/run_tracking.py
    python ai/traffic/run_tracking.py --video path/to/video.mp4
    python ai/traffic/run_tracking.py --video path/to/video.mp4 --output annotated.mp4
    python ai/traffic/run_tracking.py --max-frames 60
"""

import argparse
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.traffic.config import TrafficConfig
from ai.traffic.generate_test_video import generate_test_video
from ai.traffic.pipeline import TrafficPipeline


def main():
    parser = argparse.ArgumentParser(
        description="Run Phase 2C multi-object vehicle tracking pipeline"
    )
    parser.add_argument(
        "--video",
        default=None,
        help="Path to input video. If omitted, a synthetic test video is generated.",
    )
    parser.add_argument(
        "--output",
        default="ai/traffic/annotated_output.mp4",
        help="Path to save annotated output video.",
    )
    parser.add_argument("--max-frames", type=int, default=None, help="Cap frames to process")
    parser.add_argument("--confidence", type=float, default=0.25)
    parser.add_argument(
        "--line-fraction", type=float, default=0.5,
        help="Counting line position as fraction of frame height",
    )
    args = parser.parse_args()

    # ── Video source ──────────────────────────────────────────────────────────
    if args.video:
        video_path = Path(args.video)
        if not video_path.exists():
            print(f"[ERROR] Video not found: {video_path}")
            sys.exit(1)
    else:
        print("\n[run_tracking] No video provided — generating synthetic test video …")
        video_path = Path(
            generate_test_video(
                output_path="ai/traffic/test_traffic.mp4",
                n_frames=120,
                fps=15.0,
            )
        )

    output_path = Path(args.output)
    print(f"[run_tracking] Input  : {video_path}")
    print(f"[run_tracking] Output : {output_path}")
    print(f"[run_tracking] Confidence threshold : {args.confidence}")
    print(f"[run_tracking] Counting line Y      : {args.line_fraction * 100:.0f}% of frame height")
    if args.max_frames:
        print(f"[run_tracking] Frame limit : {args.max_frames}")
    print()

    # ── Run pipeline ──────────────────────────────────────────────────────────
    config = TrafficConfig(
        confidence_threshold=args.confidence,
        line_y_fraction=args.line_fraction,
    )
    pipeline = TrafficPipeline(config)
    result = pipeline.run_video(
        video_path=video_path,
        output_path=output_path,
        max_frames=args.max_frames,
    )

    # ── Report ────────────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("PHASE 2C TRACKING REPORT")
    print("=" * 60)

    if result.status != "success":
        print(f"[FAILED] {result.error_message}")
        sys.exit(1)

    print(f"Status            : {result.status}")
    print(f"Frames processed  : {result.frames_processed}")
    print(f"Processing FPS    : {result.processing_fps:.2f}")
    print(f"Total unique IDs  : {result.total_unique_vehicles}")
    print(f"Active in last    : {result.active_tracks}")
    print(f"Density level     : {result.density.level} ({result.density.value} active)")
    print(f"Incoming (↓)      : {result.directional_counts.incoming}")
    print(f"Outgoing (↑)      : {result.directional_counts.outgoing}")
    print(f"Annotated video   : {result.annotated_video_path}")

    print("\nVehicles by class:")
    for cls, count in sorted(result.vehicles_by_class.items()):
        print(f"  {cls:<12} : {count}")

    print("\nPer-track detail (first 10):")
    for track in result.tracks[:10]:
        d = track.to_dict()
        speed_str = (
            f"~{d['speed_kmh']:.1f} km/h (estimated)" if d["speed_kmh"] else "N/A (uncalibrated)"
        )
        print(
            f"  ID:{d['track_id']:3d}  {d['class_name']:<10}  "
            f"conf={d['confidence']:.2f}  "
            f"frames={d['frames_seen']:3d}  "
            f"traj_len={len(d['trajectory']):3d}  "
            f"speed={speed_str}"
        )

    print("=" * 60)
    print("\n[run_tracking] Done. Open the annotated video to verify tracking visually.")


if __name__ == "__main__":
    main()
