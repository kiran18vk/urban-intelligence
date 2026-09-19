"""
Local OCR extraction engine for Phase 2B ANPR (SIH 2026 PS 26124).
Uses EasyOCR with image enhancement preprocessing.
"""

from typing import Optional, Tuple
import cv2
import easyocr
import numpy as np

from ai.anpr.config import ANPRConfig


class PlateOCR:
    """
    Wraps EasyOCR with license-plate pre-processing.
    """

    _reader_instance: Optional[easyocr.Reader] = None

    def __init__(self, config: Optional[ANPRConfig] = None):
        self.config = config or ANPRConfig()

        # Cache reader instance so it is only loaded once in memory
        if PlateOCR._reader_instance is None:
            print(f"[PlateOCR] Initializing EasyOCR (languages={self.config.ocr_languages}, gpu={self.config.use_gpu}) ...")
            PlateOCR._reader_instance = easyocr.Reader(
                self.config.ocr_languages,
                gpu=self.config.use_gpu,
                verbose=False,
            )
            print("[PlateOCR] EasyOCR initialized successfully.")

        self.reader = PlateOCR._reader_instance

    def preprocess(self, crop: np.ndarray) -> np.ndarray:
        """
        Enhances license plate crop contrast and resolution for OCR readability.
        """
        h, w = crop.shape[:2]
        # Upscale small plate crops to a standard height of ~80px for cleaner OCR
        if h < 80:
            scale = 80.0 / h
            crop = cv2.resize(crop, (int(w * scale), 80), interpolation=cv2.INTER_CUBIC)

        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY) if len(crop.shape) == 3 else crop

        # Contrast Limited Adaptive Histogram Equalization (CLAHE)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)

        return enhanced

    def read_text(self, plate_crop: np.ndarray) -> Tuple[str, float]:
        """
        Extracts raw alphanumeric text and confidence score from a license plate crop.

        Args:
            plate_crop: BGR or grayscale image crop containing the plate.

        Returns:
            Tuple of (raw_text, confidence_score [0.0 - 1.0]).
        """
        if plate_crop is None or plate_crop.size == 0:
            return "", 0.0

        processed = self.preprocess(plate_crop)

        # Run EasyOCR
        # detail=1 returns [ (bbox, text, conf), ... ]
        try:
            results = self.reader.readtext(processed, detail=1, paragraph=False)
        except Exception as e:
            print(f"[PlateOCR] Error during OCR inference: {e}")
            return "", 0.0

        if not results:
            return "", 0.0

        # Sort left-to-right, top-to-bottom
        # Each item: (bbox, text, conf)
        extracted_texts = []
        confidences = []
        weights = []

        for _, text, conf in results:
            clean = text.strip()
            if clean:
                extracted_texts.append(clean)
                confidences.append(float(conf))
                weights.append(len(clean))

        if not extracted_texts:
            return "", 0.0

        combined_raw = " ".join(extracted_texts)
        # Weighted confidence by character count
        total_chars = sum(weights)
        if total_chars > 0:
            weighted_conf = sum(c * w for c, w in zip(confidences, weights)) / total_chars
        else:
            weighted_conf = float(np.mean(confidences))

        return combined_raw, float(weighted_conf)
