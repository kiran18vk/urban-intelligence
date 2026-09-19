"""
Generates a synthetic traffic video for Phase 2C verification testing.
No external downloads required. Creates animated circles representing vehicles
moving across the frame in different directions.

Usage:
    python ai/traffic/generate_test_video.py --output ai/traffic/test_traffic.mp4
"""

import argparse
import math
import sys
from pathlib import Path

import cv2
import numpy as np

# Ensure project root is importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def generate_test_video(
    output_path: str = "ai/traffic/test_traffic.mp4",
    width: int = 640,
    height: int = 480,
    fps: float = 15.0,
    n_frames: int = 120,
):
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    writer = cv2.VideoWriter(str(output_path), fourcc, fps, (width, height))

    # --- Define synthetic "vehicles" (circles) ---
    vehicles = [
        # (id, x_start, y_start, vx, vy, radius, color_bgr, label)
        (1, 50,  200, 5,   0,   18, (255, 150, 0),   "car"),      # moves right → incoming
        (2, 600, 250, -4,  0,   24, (70, 200, 50),   "bus"),      # moves left ← outgoing
        (3, 100,  50, 0,   4,   14, (0, 215, 255),   "moto"),     # moves down ↓ incoming
        (4, 300, 430, 2,  -3,   14, (200, 50, 200),  "truck"),    # moves up-right ↑ outgoing
        (5, 500, 300, -3,  3,   12, (255, 200, 0),   "bicycle"),  # diagonal
        (6, 200, 100, 3,   2,   10, (50, 100, 255),  "person"),   # diagonal
    ]

    line_y = height // 2

    for frame_idx in range(n_frames):
        # Dark asphalt background with lane markings
        frame = np.full((height, width, 3), (35, 35, 35), dtype=np.uint8)

        # Lane markings
        for x in range(0, width, 40):
            cv2.rectangle(frame, (x, height // 2 - 2), (x + 20, height // 2 + 2), (100, 100, 100), -1)

        # Counting line
        cv2.line(frame, (0, line_y), (width, line_y), (0, 255, 255), 2)
        cv2.putText(frame, "COUNTING LINE", (8, line_y - 8),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 255, 255), 1, cv2.LINE_AA)

        # Frame label
        cv2.putText(frame, f"Frame {frame_idx:03d} | Synthetic Traffic",
                    (8, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (200, 200, 200), 1, cv2.LINE_AA)

        # Draw vehicles
        for vid, x0, y0, vx, vy, r, color, label in vehicles:
            cx = int(x0 + vx * frame_idx) % width
            cy = int(y0 + vy * frame_idx) % height

            # Draw shadow
            cv2.circle(frame, (cx + 3, cy + 3), r, (0, 0, 0), -1)
            # Draw vehicle
            cv2.circle(frame, (cx, cy), r, color, -1)
            cv2.circle(frame, (cx, cy), r, (255, 255, 255), 1)  # border
            # Label
            cv2.putText(frame, f"{label} #{vid}", (cx - r, cy - r - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.35, color, 1, cv2.LINE_AA)

        writer.write(frame)

    writer.release()
    print(f"[generate_test_video] Saved synthetic video → {output_path}")
    print(f"  Frames: {n_frames}, FPS: {fps}, Size: {width}x{height}")
    return str(output_path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate synthetic test traffic video")
    parser.add_argument("--output", default="ai/traffic/test_traffic.mp4")
    parser.add_argument("--frames", type=int, default=120)
    parser.add_argument("--fps", type=float, default=15.0)
    args = parser.parse_args()
    generate_test_video(
        output_path=args.output,
        n_frames=args.frames,
        fps=args.fps,
    )
