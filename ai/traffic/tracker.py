"""
Thin adapter that reuses the Phase 2A YOLODetector with the .track() method
for multi-object tracking (ByteTrack via Ultralytics pipeline).

This module does NOT duplicate YOLO loading logic — it delegates to the
existing detector infrastructure and adds only the tracking layer on top.
"""

import math
import sys
from collections import deque
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
from ultralytics import YOLO

# Resolve project root so the existing Phase 2A module is always importable
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.traffic.config import TrafficConfig
from ai.traffic.models import TrackedObject


class VehicleTracker:
    """
    Wraps Ultralytics YOLO .track() (ByteTrack) to produce persistent
    TrackedObject instances with trajectory histories across video frames.

    Key guarantee: the same physical vehicle keeps the same track_id across
    consecutive frames — it is never double-counted.
    """

    def __init__(self, config: TrafficConfig):
        self.config = config

        # Load model once
        model_path = config.model_path
        if not model_path.exists():
            print(f"[VehicleTracker] Weights not found at {model_path}, loading by name …")
            self.model = YOLO(model_path.name)
        else:
            self.model = YOLO(str(model_path))

        self._target_set = {c.lower() for c in config.target_classes}

        # Active track registry  {track_id: TrackedObject}
        self._tracks: Dict[int, TrackedObject] = {}
        self._frame_index: int = 0

        print(
            f"[VehicleTracker] Initialized | "
            f"model={model_path.name} | "
            f"device={config.device} | "
            f"conf={config.confidence_threshold} | "
            f"target={config.target_classes}"
        )

    # ─── Public API ───────────────────────────────────────────────────────────

    def update(self, frame: np.ndarray) -> List[TrackedObject]:
        """
        Process one frame. Returns the list of TrackedObjects visible in this frame.

        The same track_id is guaranteed across consecutive frames (ByteTrack).
        """
        results = self.model.track(
            source=frame,
            conf=self.config.confidence_threshold,
            imgsz=self.config.img_size,
            device=self.config.device,
            persist=True,       # keeps ByteTrack state between calls
            tracker="bytetrack.yaml",
            verbose=False,
        )

        active_in_frame: List[TrackedObject] = []

        for result in results:
            boxes = result.boxes
            if boxes is None or boxes.id is None:
                continue

            for box in boxes:
                cls_id = int(box.cls[0].item())
                class_name = self.model.names.get(cls_id, str(cls_id)).lower()

                if class_name not in self._target_set:
                    continue

                track_id = int(box.id[0].item())
                conf = float(box.conf[0].item())
                x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]
                cx = (x1 + x2) / 2.0
                cy = (y1 + y2) / 2.0

                if track_id not in self._tracks:
                    # New track seen for the first time
                    self._tracks[track_id] = TrackedObject(
                        track_id=track_id,
                        class_name=class_name,
                        confidence=conf,
                        bbox=[x1, y1, x2, y2],
                        center_x=cx,
                        center_y=cy,
                        first_seen_frame=self._frame_index,
                        last_seen_frame=self._frame_index,
                        frames_seen=1,
                        trajectory=deque(maxlen=self.config.max_trajectory_length),
                        _pixel_displacements=deque(
                            maxlen=self.config.speed_smoothing_frames
                        ),
                    )
                    self._tracks[track_id].trajectory.append((cx, cy))
                else:
                    # Update existing track (same vehicle, same id)
                    t = self._tracks[track_id]

                    # Pixel displacement since last frame for speed estimation
                    prev_cx, prev_cy = t.center_x, t.center_y
                    pixel_dist = math.hypot(cx - prev_cx, cy - prev_cy)
                    t._pixel_displacements.append(pixel_dist)

                    # Update fields
                    t.class_name = class_name
                    t.confidence = max(t.confidence, conf)
                    t.bbox = [x1, y1, x2, y2]
                    t.center_x = cx
                    t.center_y = cy
                    t.last_seen_frame = self._frame_index
                    t.frames_seen += 1
                    t.trajectory.append((cx, cy))

                    # Speed estimation (only if calibrated)
                    t.speed_kmh = self._estimate_speed(t)

                active_in_frame.append(self._tracks[track_id])

        self._frame_index += 1
        return active_in_frame

    @property
    def all_tracks(self) -> Dict[int, TrackedObject]:
        """All tracks ever seen (including those no longer active)."""
        return self._tracks

    @property
    def frame_index(self) -> int:
        return self._frame_index

    def reset(self) -> None:
        """Reset tracker state (start fresh video)."""
        self._tracks.clear()
        self._frame_index = 0
        # Reload model to reset ByteTrack internal state
        model_path = self.config.model_path
        self.model = YOLO(str(model_path) if model_path.exists() else model_path.name)

    # ─── Internal helpers ─────────────────────────────────────────────────────

    def _estimate_speed(self, track: TrackedObject) -> Optional[float]:
        """
        Estimate speed in km/h ONLY when pixel calibration is configured.

        Returns None when PIXELS_PER_METER is not set — the caller must
        present this as 'speed_kmh: null' (uncalibrated).
        """
        ppm = self.config.pixels_per_meter
        if ppm is None or ppm <= 0:
            return None  # Uncalibrated — do not guess

        if not track._pixel_displacements:
            return None

        avg_pixels_per_frame = sum(track._pixel_displacements) / len(
            track._pixel_displacements
        )
        meters_per_frame = avg_pixels_per_frame / ppm
        meters_per_second = meters_per_frame * self.config.fps
        return round(meters_per_second * 3.6, 2)  # → km/h
