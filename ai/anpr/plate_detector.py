"""
Plate region detector for Phase 2B ANPR (SIH 2026 PS 26124).

MODULAR ARCHITECTURE NOTE & LIMITATIONS:
This module isolates license-plate localization from full vehicle detection.
The morphological/contour approach implemented here is an EXPERIMENTAL FALLBACK only.
Do not claim that heuristic plate localization provides reliable ANPR in arbitrary real-world footage.
Dedicated license plate detection model recommended for production accuracy.
The interface is pluggable so that a dedicated object detection model (e.g., YOLOv8-plate / YOLO11-plate)
can drop in seamlessly to replace the heuristic extractor.
"""

from typing import List, Optional, Tuple
import cv2
import numpy as np

from ai.anpr.config import ANPRConfig


class LicensePlateDetector:
    """
    Extracts candidate license-plate regions from vehicle bounding boxes.
    Does NOT pass the whole vehicle to OCR.

    NOTE:
    Morphological / contour extraction is an EXPERIMENTAL FALLBACK only.
    Dedicated license plate detection model recommended for production accuracy.
    """

    def __init__(self, config: Optional[ANPRConfig] = None):
        self.config = config or ANPRConfig()

    def detect_plate(
        self,
        frame: np.ndarray,
        vehicle_bbox: List[float],
    ) -> Optional[Tuple[np.ndarray, List[float]]]:
        """
        Locates the license-plate candidate region inside the vehicle bounding box.

        Args:
            frame: Full BGR video frame.
            vehicle_bbox: [x1, y1, x2, y2] bounding box of detected vehicle.

        Returns:
            Tuple of (plate_crop_bgr, [px1, py1, px2, py2] in frame coordinates),
            or None if no valid region can be extracted.
        """
        fh, fw = frame.shape[:2]
        vx1, vy1, vx2, vy2 = [int(v) for v in vehicle_bbox]

        # Clamp vehicle bbox to frame boundaries
        vx1 = max(0, min(vx1, fw - 1))
        vy1 = max(0, min(vy1, fh - 1))
        vx2 = max(vx1 + 1, min(vx2, fw))
        vy2 = max(vy1 + 1, min(vy2, fh))

        vw = vx2 - vx1
        vh = vy2 - vy1

        if vw < self.config.min_plate_width or vh < self.config.min_plate_height:
            return None

        # Focus search region on the lower portion of the vehicle (front/rear bumper)
        roi_y1 = vy1 + int(vh * self.config.roi_top_fraction)
        roi_y2 = vy1 + int(vh * self.config.roi_bottom_fraction)
        roi_x1 = vx1
        roi_x2 = vx2

        roi_h = roi_y2 - roi_y1
        roi_w = roi_x2 - roi_x1

        if roi_w < self.config.min_plate_width or roi_h < self.config.min_plate_height:
            return None

        vehicle_roi = frame[roi_y1:roi_y2, roi_x1:roi_x2]
        if vehicle_roi.size == 0:
            return None

        # Morphological search for rectangular high-contrast plate region
        gray = cv2.cvtColor(vehicle_roi, cv2.COLOR_BGR2GRAY)
        blur = cv2.bilateralFilter(gray, 9, 75, 75)
        edges = cv2.Canny(blur, 50, 200)

        contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

        best_rect = None
        best_score = 0.0
        min_ar, max_ar = self.config.aspect_ratio_range

        for cnt in contours:
            approx = cv2.approxPolyDP(cnt, 0.02 * cv2.arcLength(cnt, True), True)
            if len(approx) == 4 or cv2.isContourConvex(approx):
                x, y, w, h = cv2.boundingRect(cnt)
                if h == 0:
                    continue
                aspect_ratio = w / float(h)

                if (
                    min_ar <= aspect_ratio <= max_ar
                    and w >= self.config.min_plate_width
                    and h >= self.config.min_plate_height
                    and w <= int(roi_w * 0.95)
                ):
                    area = w * h
                    if area > best_score:
                        best_score = area
                        best_rect = (x, y, w, h)

        if best_rect is not None:
            # Found distinct candidate contour
            bx, by, bw, bh = best_rect
            px1 = roi_x1 + bx
            py1 = roi_y1 + by
            px2 = px1 + bw
            py2 = py1 + bh
        else:
            # Modular heuristic fallback: license plates are centrally positioned on the bumper
            # Use central bottom 30% height and central 65% width of vehicle
            margin_x = int(vw * 0.175)
            px1 = vx1 + margin_x
            px2 = vx2 - margin_x
            py1 = vy1 + int(vh * 0.70)
            py2 = vy2 - int(vh * 0.05)

        # Clamp plate coordinates
        px1 = max(0, min(px1, fw - 1))
        py1 = max(0, min(py1, fh - 1))
        px2 = max(px1 + 1, min(px2, fw))
        py2 = max(py1 + 1, min(py2, fh))

        plate_crop = frame[py1:py2, px1:px2]
        if plate_crop.shape[0] < self.config.min_plate_height or plate_crop.shape[1] < self.config.min_plate_width:
            return None

        return plate_crop, [float(px1), float(py1), float(px2), float(py2)]
