"""
Reusable YOLO-based computer vision detector for vehicle and pedestrian detection
in public transit mobile sensing applications (SIH 2026 PS 26124).
"""

import time
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import cv2
import numpy as np
from ultralytics import YOLO

try:
    from .config import DEFAULT_MODEL_PATH, DetectorConfig, SUPPORTED_CLASSES
except ImportError:
    from config import DEFAULT_MODEL_PATH, DetectorConfig, SUPPORTED_CLASSES


@dataclass
class DetectionResult:
    """Structured detection output for vehicle and pedestrian detection."""
    class_name: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2]
    frame_index: Optional[int] = None
    class_id: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert detection result to serializable dictionary."""
        return asdict(self)


# Distinct BGR colors for visualization
CLASS_COLORS: Dict[str, Tuple[int, int, int]] = {
    "car": (255, 150, 0),        # Cyan-ish blue
    "motorcycle": (0, 215, 255), # Amber / Gold
    "bus": (70, 200, 50),        # Emerald green
    "truck": (200, 50, 200),     # Magenta / Purple
    "bicycle": (255, 200, 0),    # Light blue
    "person": (50, 100, 255),    # Coral / Orange-Red
}
DEFAULT_COLOR = (0, 255, 0)


class YOLODetector:
    """
    Lightweight YOLO inference wrapper designed for local edge/server execution.
    Currently configured for standard vehicle and pedestrian classes.
    """

    def __init__(self, config: Optional[DetectorConfig] = None):
        self.config = config or DetectorConfig()
        model_path = Path(self.config.model_path)

        # If the model file is not yet downloaded to models/, use model name
        # Ultralytics will auto-download pretrained weights.
        if not model_path.exists():
            print(f"[YOLODetector] Model not found at {model_path}. Downloading/loading {model_path.name}...")
            self.model = YOLO(model_path.name)
            # Save downloaded weights to target models directory if possible
            if Path(model_path.name).exists() and not model_path.exists():
                try:
                    import shutil
                    shutil.move(model_path.name, str(model_path))
                    print(f"[YOLODetector] Moved model weights to {model_path}")
                except Exception:
                    pass
        else:
            self.model = YOLO(str(model_path))

        print(
            f"[YOLODetector] Initialized successfully.\n"
            f"  Model: {model_path.name}\n"
            f"  Device: {self.config.device}\n"
            f"  Confidence Threshold: {self.config.confidence_threshold}\n"
            f"  Target Classes: {self.config.target_classes}"
        )

    def detect(
        self,
        source: Union[str, Path, np.ndarray],
        frame_index: Optional[int] = None,
    ) -> List[DetectionResult]:
        """
        Run inference on an image file path or raw NumPy BGR frame.

        Args:
            source: Path to an image file, or an in-memory NumPy BGR frame (from OpenCV/camera).
            frame_index: Optional sequential frame number (for video streams).

        Returns:
            List of structured DetectionResult objects.
        """
        results, _ = self.detect_with_timing(source, frame_index=frame_index)
        return results

    def detect_with_timing(
        self,
        source: Union[str, Path, np.ndarray],
        frame_index: Optional[int] = None,
    ) -> Tuple[List[DetectionResult], float]:
        """
        Run inference and measure elapsed wall-clock inference time in milliseconds.

        Returns:
            Tuple of (List[DetectionResult], inference_time_ms)
        """
        # Resolve path string if Path provided
        img_input = str(source) if isinstance(source, Path) else source

        start_time = time.perf_counter()
        raw_results = self.model.predict(
            source=img_input,
            conf=self.config.confidence_threshold,
            imgsz=self.config.img_size,
            device=self.config.device,
            verbose=False,
        )
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        detections: List[DetectionResult] = []

        target_set = (
            set(c.lower() for c in self.config.target_classes)
            if self.config.target_classes is not None
            else None
        )

        for result in raw_results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0].item())
                class_name = self.model.names.get(cls_id, str(cls_id)).lower()

                # Filter to only targeted vehicle & pedestrian classes
                if target_set is not None and class_name not in target_set:
                    continue

                conf = round(float(box.conf[0].item()), 4)
                xyxy = [round(float(c), 2) for c in box.xyxy[0].tolist()]

                detections.append(
                    DetectionResult(
                        class_name=class_name,
                        confidence=conf,
                        bbox=xyxy,
                        frame_index=frame_index,
                        class_id=cls_id,
                    )
                )

        return detections, round(elapsed_ms, 2)

    def annotate(
        self,
        image: np.ndarray,
        detections: List[DetectionResult],
        line_width: int = 2,
    ) -> np.ndarray:
        """
        Draw clean bounding boxes and formatted labels onto an OpenCV BGR image.

        Args:
            image: Original BGR NumPy image array.
            detections: List of DetectionResult objects.
            line_width: Thickness of bounding boxes.

        Returns:
            Annotated BGR NumPy image.
        """
        annotated = image.copy()

        for det in detections:
            x1, y1, x2, y2 = [int(v) for v in det.bbox]
            color = CLASS_COLORS.get(det.class_name, DEFAULT_COLOR)

            # Draw bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, line_width)

            # Label text
            label = f"{det.class_name} {det.confidence:.2f}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            font_thickness = 1

            (label_w, label_h), baseline = cv2.getTextSize(
                label, font, font_scale, font_thickness
            )

            # Draw background tag pill
            tag_top = max(y1 - label_h - baseline - 4, 0)
            tag_bottom = max(y1, label_h + baseline + 4)
            cv2.rectangle(
                annotated,
                (x1, tag_top),
                (x1 + label_w + 8, tag_bottom),
                color,
                -1,
            )

            # Draw label text in dark or light font
            text_color = (0, 0, 0)
            cv2.putText(
                annotated,
                label,
                (x1 + 4, tag_bottom - baseline - 2),
                font,
                font_scale,
                text_color,
                font_thickness,
                cv2.LINE_AA,
            )

        return annotated


def create_synthetic_road_scene(output_path: Union[str, Path]) -> Path:
    """
    Generate a simple synthetic urban road image containing a bus, cars, and pedestrians
    to provide an immediate offline test image without external downloads.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 800x600 canvas
    img = np.full((600, 800, 3), (35, 45, 55), dtype=np.uint8)  # dark asphalt

    # Lane markings (dashed white)
    for x in range(20, 800, 60):
        cv2.line(img, (x, 300), (x + 30, 300), (220, 220, 220), 3)

    # Sky / background top
    img[0:150, :] = [180, 140, 100]

    # Road shoulder
    cv2.line(img, (0, 150), (800, 150), (100, 100, 100), 4)

    # Text indication
    cv2.putText(
        img,
        "Urban Intelligence Platform Test Scene (SIH 2026)",
        (30, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 255),
        2,
    )

    cv2.imwrite(str(output_path), img)
    return output_path


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Test Local YOLO Detector")
    parser.add_argument("--image", type=str, help="Path to input image")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    parser.add_argument("--save", type=str, default="annotated_output.jpg", help="Path to save annotated image")
    args = parser.parse_args()

    cfg = DetectorConfig(confidence_threshold=args.conf)
    detector = YOLODetector(cfg)

    # Use provided image or generate a sample
    if args.image and Path(args.image).exists():
        img_path = Path(args.image)
    else:
        sample_path = Path(__file__).resolve().parent / "sample_scene.jpg"
        print(f"[CLI Test] No image provided. Creating sample test scene at {sample_path}")
        img_path = create_synthetic_road_scene(sample_path)

    # Read image
    frame = cv2.imread(str(img_path))
    if frame is None:
        raise FileNotFoundError(f"Failed to read image at {img_path}")

    # Run inference
    detections, infer_ms = detector.detect_with_timing(frame)

    print("\n" + "=" * 50)
    print(f"Inference Report:")
    print(f"  Source: {img_path}")
    print(f"  Device: {cfg.device}")
    print(f"  Inference Time: {infer_ms:.2f} ms")
    print(f"  Total Detections: {len(detections)}")
    print("=" * 50)

    for i, det in enumerate(detections, 1):
        print(f"  [{i}] Class: {det.class_name.upper():<12} Confidence: {det.confidence:.4f}  BBox: {det.bbox}")

    # Annotate and save
    annotated = detector.annotate(frame, detections)
    save_path = Path(args.save)
    cv2.imwrite(str(save_path), annotated)
    print(f"\n[CLI Test] Saved annotated image to: {save_path.resolve()}")
