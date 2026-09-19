"""
OpenCV frame annotator for Phase 2C traffic tracking visualization.
Draws bounding boxes, track IDs, class names, confidence, counting line,
directional counts, density level, and FPS HUD overlay.
"""

import cv2
import numpy as np
from typing import List, Optional

from ai.traffic.config import (
    CLASS_COLORS_BGR, DEFAULT_COLOR_BGR,
    HUD_LINE_COLOR_BGR, HUD_INCOMING_COLOR_BGR, HUD_OUTGOING_COLOR_BGR,
    ANNOTATION_BOX_THICKNESS, ANNOTATION_FONT_SCALE, ANNOTATION_FONT_THICKNESS,
)
from ai.traffic.models import DensityResult, DirectionalCounts, TrackedObject


def annotate_frame(
    frame: np.ndarray,
    active_tracks: List[TrackedObject],
    line_y: int,
    counts: DirectionalCounts,
    density: DensityResult,
    fps: float = 0.0,
    frame_index: int = 0,
) -> np.ndarray:
    """
    Return a copy of `frame` with all tracking annotations drawn.
    """
    out = frame.copy()
    h, w = out.shape[:2]

    # ── Counting line ─────────────────────────────────────────────────────────
    cv2.line(out, (0, line_y), (w, line_y), HUD_LINE_COLOR_BGR, 2)
    cv2.putText(
        out, "COUNTING LINE",
        (8, line_y - 8),
        cv2.FONT_HERSHEY_SIMPLEX, 0.45, HUD_LINE_COLOR_BGR, 1, cv2.LINE_AA,
    )

    # ── Per-track annotations ─────────────────────────────────────────────────
    for track in active_tracks:
        color = CLASS_COLORS_BGR.get(track.class_name, DEFAULT_COLOR_BGR)
        x1, y1, x2, y2 = [int(v) for v in track.bbox]

        # Bounding box
        cv2.rectangle(out, (x1, y1), (x2, y2), color, ANNOTATION_BOX_THICKNESS)

        # Label: ID + class + confidence
        label = f"ID:{track.track_id} {track.class_name} {track.confidence:.2f}"
        if track.speed_kmh is not None:
            label += f" ~{track.speed_kmh:.1f}km/h"

        (lw, lh), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX,
            ANNOTATION_FONT_SCALE, ANNOTATION_FONT_THICKNESS,
        )
        tag_y1 = max(y1 - lh - baseline - 4, 0)
        tag_y2 = max(y1, lh + baseline + 4)
        cv2.rectangle(out, (x1, tag_y1), (x1 + lw + 8, tag_y2), color, -1)
        cv2.putText(
            out, label,
            (x1 + 4, tag_y2 - baseline - 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            ANNOTATION_FONT_SCALE, (0, 0, 0),
            ANNOTATION_FONT_THICKNESS, cv2.LINE_AA,
        )

        # Center dot
        cx, cy = int(track.center_x), int(track.center_y)
        cv2.circle(out, (cx, cy), 3, color, -1)

        # Trajectory (last 30 points)
        hist = list(track.trajectory)[-30:]
        for i in range(1, len(hist)):
            pt1 = (int(hist[i - 1][0]), int(hist[i - 1][1]))
            pt2 = (int(hist[i][0]), int(hist[i][1]))
            cv2.line(out, pt1, pt2, color, 1, cv2.LINE_AA)

    # ── HUD top-right corner ──────────────────────────────────────────────────
    density_colors = {
        "LOW": (0, 255, 100),
        "MEDIUM": (0, 215, 255),
        "HIGH": (50, 50, 255),
    }
    density_color = density_colors.get(density.level, (255, 255, 255))

    hud_lines = [
        (f"FPS: {fps:.1f}", (200, 200, 200)),
        (f"Frame: {frame_index}", (180, 180, 180)),
        (f"Active tracks: {density.value}", (200, 200, 255)),
        (f"Density: {density.level}", density_color),
        (f"Incoming (↓): {counts.incoming}", HUD_INCOMING_COLOR_BGR),
        (f"Outgoing (↑): {counts.outgoing}", HUD_OUTGOING_COLOR_BGR),
    ]

    for i, (text, color) in enumerate(hud_lines):
        y_pos = 22 + i * 22
        # Shadow
        cv2.putText(out, text, (w - 210, y_pos + 1),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, (0, 0, 0), 2, cv2.LINE_AA)
        cv2.putText(out, text, (w - 210, y_pos),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.52, color, 1, cv2.LINE_AA)

    return out
