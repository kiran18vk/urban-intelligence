"""
Road Defect Detection Pipeline Orchestrator (Phase 3A, SIH 2026 PS 26124).
DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
"""

import time
from pathlib import Path
from typing import Dict, List, Optional, Union

import cv2
import numpy as np

from ai.road_damage.config import RoadDamageConfig
from ai.road_damage.detector import RoadDamageDetector
from ai.road_damage.models import (
    RoadDamageFrameResult,
    RoadDamagePipelineResult,
    RoadDefectDetection,
)


class RoadDamagePipeline:
    """
    End-to-end pipeline for processing single road images or video streams.
    Provides structured aggregation across frames and optional video annotation.
    """

    def __init__(self, config: Optional[RoadDamageConfig] = None):
        self.config = config or RoadDamageConfig()
        self.detector = RoadDamageDetector(self.config)

    def run_image(
        self,
        image_input: Union[str, Path, np.ndarray],
        output_path: Optional[Union[str, Path]] = None,
        source_id: Optional[str] = None,
    ) -> RoadDamagePipelineResult:
        """
        Runs road damage inference on a single image file or numpy BGR image array.
        """
        if isinstance(image_input, (str, Path)):
            img_path = Path(image_input)
            if not img_path.exists():
                return RoadDamagePipelineResult(
                    status="error",
                    error_message=f"Image file not found: {img_path}",
                    model_path=str(self.config.model_path),
                )
            frame = cv2.imread(str(img_path))
            if frame is None:
                return RoadDamagePipelineResult(
                    status="error",
                    error_message=f"OpenCV failed to decode image: {img_path}",
                    model_path=str(self.config.model_path),
                )
            resolved_source_id = source_id or img_path.name
        elif isinstance(image_input, np.ndarray):
            frame = image_input
            resolved_source_id = source_id or "memory_buffer"
        else:
            return RoadDamagePipelineResult(
                status="error",
                error_message=f"Unsupported image input type: {type(image_input)}",
                model_path=str(self.config.model_path),
            )

        if frame.size == 0:
            return RoadDamagePipelineResult(
                status="error",
                error_message="Empty image buffer provided.",
                model_path=str(self.config.model_path),
            )

        # Run inference
        detections, latency_ms = self.detector.detect_with_timing(
            frame=frame,
            frame_index=0,
            timestamp_sec=0.0,
            source_id=resolved_source_id,
        )

        fps = 1000.0 / latency_ms if latency_ms > 0 else 0.0

        # Aggregation by class
        defects_by_class: Dict[str, int] = {}
        for d in detections:
            defects_by_class[d.class_name] = defects_by_class.get(d.class_name, 0) + 1

        # Annotation
        saved_output_path = None
        if output_path is not None:
            out_p = Path(output_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            annotated = self.detector.annotate(frame, detections, frame_number=0)
            cv2.imwrite(str(out_p), annotated)
            saved_output_path = str(out_p)

        frame_res = RoadDamageFrameResult(
            frame_index=0,
            timestamp_sec=0.0,
            detections=detections,
        )

        return RoadDamagePipelineResult(
            status="success",
            frames_processed=1,
            processing_fps=round(fps, 2),
            total_detections=len(detections),
            defects_by_class=defects_by_class,
            frame_results=[frame_res],
            annotated_output_path=saved_output_path,
            model_path=str(self.config.model_path),
        )

    def run_video(
        self,
        video_path: Union[str, Path],
        output_path: Optional[Union[str, Path]] = None,
        max_frames: Optional[int] = None,
        sample_every_n: int = 1,
        source_id: Optional[str] = None,
    ) -> RoadDamagePipelineResult:
        """
        Runs road damage inference sequentially across frames of a video file.
        """
        v_path = Path(video_path)
        if not v_path.exists():
            return RoadDamagePipelineResult(
                status="error",
                error_message=f"Video file not found: {v_path}",
                model_path=str(self.config.model_path),
            )

        cap = cv2.VideoCapture(str(v_path))
        if not cap.isOpened():
            return RoadDamagePipelineResult(
                status="error",
                error_message=f"OpenCV could not open video: {v_path}",
                model_path=str(self.config.model_path),
            )

        src_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        resolved_source_id = source_id or v_path.name

        writer: Optional[cv2.VideoWriter] = None
        if output_path is not None:
            out_p = Path(output_path)
            out_p.parent.mkdir(parents=True, exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(out_p), fourcc, src_fps, (frame_w, frame_h))

        frames_processed = 0
        total_detections_count = 0
        defects_by_class: Dict[str, int] = {}
        frame_results: List[RoadDamageFrameResult] = []

        t_start = time.perf_counter()

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if max_frames and frames_processed >= max_frames:
                break

            current_time_sec = frames_processed / src_fps

            should_detect = (frames_processed % sample_every_n == 0)
            detections: List[RoadDefectDetection] = []

            if should_detect:
                detections = self.detector.detect(
                    frame=frame,
                    frame_index=frames_processed,
                    timestamp_sec=current_time_sec,
                    source_id=resolved_source_id,
                )

                for d in detections:
                    total_detections_count += 1
                    defects_by_class[d.class_name] = defects_by_class.get(d.class_name, 0) + 1

                if detections:
                    frame_results.append(
                        RoadDamageFrameResult(
                            frame_index=frames_processed,
                            timestamp_sec=current_time_sec,
                            detections=detections,
                        )
                    )

            if writer is not None:
                annotated = self.detector.annotate(
                    frame=frame,
                    detections=detections,
                    frame_number=frames_processed,
                )
                writer.write(annotated)

            frames_processed += 1

        cap.release()
        if writer is not None:
            writer.release()

        elapsed = time.perf_counter() - t_start
        fps = frames_processed / elapsed if elapsed > 0 else 0.0

        return RoadDamagePipelineResult(
            status="success",
            frames_processed=frames_processed,
            processing_fps=round(fps, 2),
            total_detections=total_detections_count,
            defects_by_class=defects_by_class,
            frame_results=frame_results,
            annotated_output_path=str(output_path) if output_path else None,
            model_path=str(self.config.model_path),
        )
