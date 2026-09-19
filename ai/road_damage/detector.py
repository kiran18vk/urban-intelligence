"""
Ultralytics-based Road Defect Detector (Phase 3A, SIH 2026 PS 26124).
DISCLAIMER: BENCHMARK MODEL — NOT FINAL PROJECT MODEL.
"""

import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from ultralytics import YOLO

from ai.road_damage.config import (
    DEFECT_CLASS_COLORS_BGR,
    DEFAULT_DEFECT_COLOR_BGR,
    RoadDamageConfig,
)
from ai.road_damage.models import RoadDefectDetection


class RoadDamageDetector:
    """
    Inference engine for road surface defect detection (potholes, cracks).
    Wraps Ultralytics PyTorch checkpoints with structured output formatting.
    """

    def __init__(self, config: Optional[RoadDamageConfig] = None):
        self.config = config or RoadDamageConfig()
        model_path = Path(self.config.model_path)

        if not model_path.exists():
            raise FileNotFoundError(
                f"[RoadDamageDetector] Model checkpoint not found at: {model_path}. "
                f"Please verify ROAD_DAMAGE_MODEL_PATH environment variable."
            )

        print(
            f"[RoadDamageDetector] Loading road damage model: {model_path.name} "
            f"on device={self.config.device} ..."
        )
        self.model = YOLO(str(model_path))
        self.class_names: Dict[int, str] = self.model.names
        self._target_set = {c.lower() for c in self.config.target_classes}
        print(f"[RoadDamageDetector] Model loaded successfully. Classes: {list(self.class_names.values())}")

    def detect(
        self,
        frame: np.ndarray,
        frame_index: Optional[int] = None,
        timestamp_sec: Optional[float] = None,
        source_id: Optional[str] = None,
    ) -> List[RoadDefectDetection]:
        """
        Runs object detection on a single image/frame and returns structured detections.
        """
        if frame is None or frame.size == 0:
            return []

        results = self.model.predict(
            source=frame,
            conf=self.config.confidence_threshold,
            iou=self.config.iou_threshold,
            max_det=self.config.max_detections,
            device=self.config.device,
            verbose=False,
        )

        detections: List[RoadDefectDetection] = []
        if not results:
            return detections

        boxes = results[0].boxes
        if boxes is None or len(boxes) == 0:
            return detections

        for box in boxes:
            cls_id = int(box.cls[0].item())
            class_name = self.class_names.get(cls_id, str(cls_id)).lower()

            if class_name not in self._target_set:
                continue

            conf = float(box.conf[0].item())
            x1, y1, x2, y2 = [float(v) for v in box.xyxy[0].tolist()]

            detections.append(
                RoadDefectDetection(
                    class_name=class_name,
                    confidence=conf,
                    bbox=[x1, y1, x2, y2],
                    frame_index=frame_index,
                    timestamp_sec=timestamp_sec,
                    source_id=source_id,
                )
            )

        return detections

    def detect_with_timing(
        self,
        frame: np.ndarray,
        frame_index: Optional[int] = None,
        timestamp_sec: Optional[float] = None,
        source_id: Optional[str] = None,
    ) -> Tuple[List[RoadDefectDetection], float]:
        """
        Runs detection and returns tuple of (detections, latency_in_ms).
        """
        t0 = time.perf_counter()
        detections = self.detect(
            frame=frame,
            frame_index=frame_index,
            timestamp_sec=timestamp_sec,
            source_id=source_id,
        )
        latency_ms = (time.perf_counter() - t0) * 1000.0
        return detections, latency_ms

    def annotate(
        self,
        frame: np.ndarray,
        detections: List[RoadDefectDetection],
        frame_number: Optional[int] = None,
    ) -> np.ndarray:
        """
        Draws defect bounding boxes, confidence tags, and benchmark watermark on the frame.
        """
        if frame is None or frame.size == 0:
            return frame

        annotated = frame.copy()
        fh, fw = annotated.shape[:2]

        for det in detections:
            x1, y1, x2, y2 = [int(v) for v in det.bbox]
            color = DEFECT_CLASS_COLORS_BGR.get(det.class_name, DEFAULT_DEFECT_COLOR_BGR)

            # Draw box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            # Draw label background + text
            label = f"{det.class_name} {det.confidence:.2f}"
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            tag_y = max(y1 - 6, th + 4)
            cv2.rectangle(annotated, (x1, tag_y - th - 4), (x1 + tw + 6, tag_y + 2), color, -1)
            cv2.putText(
                annotated,
                label,
                (x1 + 3, tag_y - 2),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 0),
                1,
                cv2.LINE_AA,
            )

        # Draw Benchmark Watermark Top HUD
        hud_text = f"{self.config.disclaimer}"
        if frame_number is not None:
            hud_text += f" | Frame: {frame_number}"
        hud_text += f" | Defects: {len(detections)}"

        (hw, hh), _ = cv2.getTextSize(hud_text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        cv2.rectangle(annotated, (10, 8), (20 + hw, 16 + hh), (0, 0, 0), -1)
        cv2.rectangle(annotated, (10, 8), (20 + hw, 16 + hh), (0, 165, 255), 1)
        cv2.putText(
            annotated,
            hud_text,
            (15, 12 + hh),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 255, 255),
            1,
            cv2.LINE_AA,
        )

        return annotated
