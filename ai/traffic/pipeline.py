"""
Main traffic tracking pipeline orchestrator (Phase 2C, SIH 2026 PS 26124).

Wires together:
  VehicleTracker (ByteTrack via Ultralytics)
  DirectionalCounter (virtual line crossing)
  DensityCalculator (LOW / MEDIUM / HIGH)
  annotate_frame (OpenCV visualization)

Accepts: video file path  OR  a list of pre-loaded numpy frames.
Returns: PipelineResult with full analytics and optional annotated video.
"""

import sys
import time
from pathlib import Path
from typing import Dict, List, Optional, Union

import cv2
import numpy as np

# Resolve project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.traffic.config import TrafficConfig, CLASS_COLORS_BGR
from ai.traffic.counter import DirectionalCounter
from ai.traffic.density import DensityCalculator
from ai.traffic.detector import annotate_frame
from ai.traffic.models import DensityResult, DirectionalCounts, PipelineResult, TrackedObject
from ai.traffic.tracker import VehicleTracker


class TrafficPipeline:
    """
    End-to-end traffic analysis pipeline.

    Usage:
        pipeline = TrafficPipeline()
        result = pipeline.run_video("path/to/video.mp4", output_path="annotated.mp4")
        print(result.to_dict())
    """

    def __init__(self, config: Optional[TrafficConfig] = None):
        self.config = config or TrafficConfig()
        self.tracker = VehicleTracker(self.config)
        self.density_calc = DensityCalculator(self.config)

    # ─── Public API ───────────────────────────────────────────────────────────

    def run_video(
        self,
        video_path: Union[str, Path],
        output_path: Optional[Union[str, Path]] = None,
        max_frames: Optional[int] = None,
    ) -> PipelineResult:
        """
        Process a video file and return aggregated tracking analytics.

        Args:
            video_path:  Path to input video (MP4, AVI, MOV, etc.)
            output_path: Optional path to save annotated output video.
            max_frames:  Optional frame cap (useful for quick testing).
        """
        video_path = Path(video_path)
        if not video_path.exists():
            return PipelineResult(
                status="error",
                error_message=f"Video file not found: {video_path}",
            )

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return PipelineResult(
                status="error",
                error_message=f"OpenCV could not open video: {video_path}",
            )

        # Video metadata
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        source_fps = cap.get(cv2.CAP_PROP_FPS) or self.config.fps
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Counting line at configured fraction of frame height
        line_y = int(frame_h * self.config.line_y_fraction)
        counter = DirectionalCounter(line_y=line_y)

        # Video writer (optional)
        writer: Optional[cv2.VideoWriter] = None
        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(
                str(output_path), fourcc, source_fps, (frame_w, frame_h)
            )

        # Reset tracker state for clean run
        self.tracker.reset()

        frames_processed = 0
        t_start = time.perf_counter()
        current_density = DensityResult("LOW", 0)

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if max_frames and frames_processed >= max_frames:
                break

            # ── Track ─────────────────────────────────────────────────────────
            active_tracks = self.tracker.update(frame)

            # ── Count crossing ─────────────────────────────────────────────────
            counts = counter.update(active_tracks)

            # ── Density ───────────────────────────────────────────────────────
            current_density = self.density_calc.calculate(len(active_tracks))

            # ── Annotate & write frame ─────────────────────────────────────────
            if writer is not None:
                elapsed = time.perf_counter() - t_start
                live_fps = (frames_processed + 1) / elapsed if elapsed > 0 else 0.0
                annotated = annotate_frame(
                    frame=frame,
                    active_tracks=active_tracks,
                    line_y=line_y,
                    counts=counts,
                    density=current_density,
                    fps=live_fps,
                    frame_index=frames_processed,
                )
                writer.write(annotated)

            frames_processed += 1

        cap.release()
        if writer:
            writer.release()

        elapsed_total = time.perf_counter() - t_start
        processing_fps = frames_processed / elapsed_total if elapsed_total > 0 else 0.0

        return self._build_result(
            frames_processed=frames_processed,
            processing_fps=processing_fps,
            counts=counts,
            density=current_density,
            output_path=output_path,
        )

    def run_frames(
        self,
        frames: List[np.ndarray],
        frame_height: Optional[int] = None,
    ) -> PipelineResult:
        """
        Process a list of in-memory numpy frames.
        Useful for testing without a video file.
        """
        if not frames:
            return PipelineResult(status="error", error_message="No frames provided")

        fh = frame_height or frames[0].shape[0]
        line_y = int(fh * self.config.line_y_fraction)
        counter = DirectionalCounter(line_y=line_y)

        self.tracker.reset()
        t_start = time.perf_counter()
        frames_processed = 0
        current_density = DensityResult("LOW", 0)
        counts = DirectionalCounts()

        for frame in frames:
            active_tracks = self.tracker.update(frame)
            counts = counter.update(active_tracks)
            current_density = self.density_calc.calculate(len(active_tracks))
            frames_processed += 1

        elapsed = time.perf_counter() - t_start
        processing_fps = frames_processed / elapsed if elapsed > 0 else 0.0

        return self._build_result(
            frames_processed=frames_processed,
            processing_fps=processing_fps,
            counts=counts,
            density=current_density,
            output_path=None,
        )

    # ─── Internal helpers ─────────────────────────────────────────────────────

    def _build_result(
        self,
        frames_processed: int,
        processing_fps: float,
        counts: DirectionalCounts,
        density: DensityResult,
        output_path: Optional[Path],
    ) -> PipelineResult:
        all_tracks = self.tracker.all_tracks
        active_tracks = [
            t for t in all_tracks.values()
            if t.last_seen_frame == self.tracker.frame_index - 1
        ]

        vehicles_by_class: Dict[str, int] = {}
        for t in all_tracks.values():
            vehicles_by_class[t.class_name] = (
                vehicles_by_class.get(t.class_name, 0) + 1
            )

        return PipelineResult(
            status="success",
            frames_processed=frames_processed,
            processing_fps=round(processing_fps, 2),
            total_unique_vehicles=len(all_tracks),
            active_tracks=len(active_tracks),
            vehicles_by_class=vehicles_by_class,
            directional_counts=counts,
            density=density,
            tracks=list(all_tracks.values()),
            annotated_video_path=str(output_path) if output_path else None,
        )
