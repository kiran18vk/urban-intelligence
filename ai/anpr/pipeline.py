"""
ANPR pipeline orchestrator (Phase 2B, SIH 2026 PS 26124).
Combines:
  1. Vehicle tracking via ByteTrack (VehicleTracker from ai/traffic)
  2. License plate region localization (LicensePlateDetector - modular fallback)
  3. Optical Character Recognition (PlateOCR via EasyOCR)
  4. Indian plate format validation & error normalization (validator)
  5. Persistent track-to-plate association, track-level confidence aggregation & video annotation
"""

from pathlib import Path
import time
from typing import Dict, List, Optional, Union
import cv2
import numpy as np

from ai.traffic.config import TrafficConfig
from ai.traffic.tracker import VehicleTracker
from ai.anpr.config import ANPRConfig
from ai.anpr.models import ANPRPipelineResult, PlateResult, VehiclePlateRecord
from ai.anpr.ocr import PlateOCR
from ai.anpr.plate_detector import LicensePlateDetector
from ai.anpr.validator import evaluate_plate_status, normalize_plate_text, validate_indian_registration


class ANPRPipeline:
    """
    End-to-end Automatic Number Plate Recognition pipeline associated with tracked vehicles.
    Reuses the existing ByteTrack VehicleTracker from Phase 2C to maintain persistent vehicle IDs.
    """

    def __init__(
        self,
        anpr_config: Optional[ANPRConfig] = None,
        traffic_config: Optional[TrafficConfig] = None,
    ):
        self.anpr_config = anpr_config or ANPRConfig()
        self.traffic_config = traffic_config or TrafficConfig()

        # Direct reuse of existing Phase 2C tracker — no duplicate YOLO detector
        self.tracker = VehicleTracker(self.traffic_config)
        self.plate_detector = LicensePlateDetector(self.anpr_config)
        self.ocr = PlateOCR(self.anpr_config)

    def run_video(
        self,
        video_path: Union[str, Path],
        output_path: Optional[Union[str, Path]] = None,
        max_frames: Optional[int] = None,
        ocr_every_n_frames: int = 3,
    ) -> ANPRPipelineResult:
        """
        Processes a video file to track vehicles and extract license plates.
        """
        video_path = Path(video_path)
        if not video_path.exists():
            return ANPRPipelineResult(
                status="error",
                error_message=f"Video file not found: {video_path}",
            )

        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            return ANPRPipelineResult(
                status="error",
                error_message=f"OpenCV could not open video: {video_path}",
            )

        source_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        frame_w = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_h = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        writer: Optional[cv2.VideoWriter] = None
        if output_path:
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            writer = cv2.VideoWriter(str(output_path), fourcc, source_fps, (frame_w, frame_h))

        self.tracker.reset()

        # Track records accumulator: {track_id: VehiclePlateRecord}
        records: Dict[int, VehiclePlateRecord] = {}

        frames_processed = 0
        t_start = time.perf_counter()

        while True:
            ret, frame = cap.read()
            if not ret:
                break
            if max_frames and frames_processed >= max_frames:
                break

            current_time_sec = frames_processed / source_fps

            # 1. Update vehicle tracking (ByteTrack)
            active_tracks = self.tracker.update(frame)

            annotated_frame = frame.copy() if writer else None

            for track in active_tracks:
                track_id = track.track_id
                vclass = track.class_name

                # Register vehicle in accumulator if new
                if track_id not in records:
                    records[track_id] = VehiclePlateRecord(
                        track_id=track_id,
                        vehicle_class=vclass,
                        first_seen_frame=frames_processed,
                        last_seen_frame=frames_processed,
                        frames_seen=1,
                    )
                else:
                    records[track_id].last_seen_frame = frames_processed
                    records[track_id].frames_seen += 1

                # Only run OCR for target vehicle classes and throttled frames
                should_run_ocr = (
                    vclass in self.anpr_config.target_vehicle_classes
                    and (frames_processed % ocr_every_n_frames == 0)
                )

                if should_run_ocr:
                    # 2. Localize plate candidate from vehicle crop
                    plate_res = self.plate_detector.detect_plate(frame, track.bbox)
                    if plate_res is not None:
                        crop, pbbox = plate_res
                        # 3. Optical Character Recognition
                        raw_text, conf = self.ocr.read_text(crop)
                        norm_text = normalize_plate_text(raw_text)
                        is_valid_format, fmt_type = validate_indian_registration(norm_text)
                        status = evaluate_plate_status(
                            raw_text=raw_text,
                            normalized_text=norm_text,
                            confidence=conf,
                            confidence_threshold=self.anpr_config.ocr_confidence_threshold,
                        )

                        current_plate = PlateResult(
                            raw_text=raw_text,
                            normalized_text=norm_text,
                            confidence=conf,
                            is_format_valid=is_valid_format,
                            format_type=fmt_type,
                            status=status,
                            plate_bbox=pbbox,
                            frame_index=frames_processed,
                            timestamp_sec=current_time_sec,
                        )

                        # 4. Track-level aggregation: update record with highest-confidence valid reading
                        records[track_id].add_reading(current_plate)

                best_plate = records[track_id].plate

                # 5. Optional video annotation
                if writer is not None and annotated_frame is not None:
                    self._annotate_vehicle(annotated_frame, track, best_plate)

            if writer is not None and annotated_frame is not None:
                # Add HUD
                cv2.putText(
                    annotated_frame,
                    f"ANPR System | Frame: {frames_processed} | Active: {len(active_tracks)}",
                    (15, 30),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    (0, 255, 255),
                    2,
                    cv2.LINE_AA,
                )
                writer.write(annotated_frame)

            frames_processed += 1

        cap.release()
        if writer:
            writer.release()

        elapsed = time.perf_counter() - t_start
        fps = frames_processed / elapsed if elapsed > 0 else 0.0

        all_records = list(records.values())
        detected_count = sum(1 for r in all_records if r.plate.status in ("verified", "low_confidence"))
        format_valid_count = sum(1 for r in all_records if r.plate.is_format_valid)
        verified_count = sum(1 for r in all_records if r.plate.status == "verified")

        validation_note = None
        if verified_count == 0 and frames_processed > 0:
            if detected_count == 0:
                validation_note = (
                    "ANPR pipeline executed successfully. The input video contains no readable "
                    "license plates (insufficient resolution/angle/lighting for OCR extraction)."
                )
            else:
                validation_note = (
                    f"ANPR pipeline executed: {detected_count} low-confidence text candidate(s) "
                    f"extracted, but 0 met the valid Indian registration syntax + confidence threshold."
                )

        return ANPRPipelineResult(
            status="success",
            frames_processed=frames_processed,
            processing_fps=round(fps, 2),
            total_vehicles_tracked=len(all_records),
            plates_detected=detected_count,
            plates_format_valid=format_valid_count,
            plates_verified=verified_count,
            records=all_records,
            annotated_video_path=str(output_path) if output_path else None,
            validation_note=validation_note,
        )

    def _annotate_vehicle(self, frame: np.ndarray, track, plate: PlateResult):
        """Draws bounding boxes and OCR overlay on frame."""
        vx1, vy1, vx2, vy2 = [int(v) for v in track.bbox]

        # Vehicle box
        cv2.rectangle(frame, (vx1, vy1), (vx2, vy2), (255, 150, 0), 2)

        # Vehicle & plate label
        label = f"ID:{track.track_id} {track.class_name}"
        if plate.status == "verified":
            label += f" | {plate.normalized_text} ({plate.confidence:.2f})"
            box_color = (0, 255, 0)
        elif plate.status == "low_confidence":
            label += f" | {plate.normalized_text or plate.raw_text} [LOW CONF]"
            box_color = (0, 165, 255)
        else:
            label += " | Plate: N/A"
            box_color = (150, 150, 150)

        # Draw vehicle tag
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
        tag_y = max(vy1 - 6, th + 4)
        cv2.rectangle(frame, (vx1, tag_y - th - 4), (vx1 + tw + 6, tag_y + 2), box_color, -1)
        cv2.putText(frame, label, (vx1 + 3, tag_y - 2), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1, cv2.LINE_AA)

        # Draw plate bbox if available
        if plate.plate_bbox:
            px1, py1, px2, py2 = [int(v) for v in plate.plate_bbox]
            cv2.rectangle(frame, (px1, py1), (px2, py2), (0, 255, 255), 2)

