"""
Evidence Management and Storage Abstraction (Phase 3B, SIH 2026 PS 26124).
Stores media path references rather than embedding large binary blobs in JSON.
"""

from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Union
import cv2
import numpy as np

from ai.events.models import EventEvidence


class EvidenceStore(ABC):
    """Abstract interface for storing perception evidence media."""

    @abstractmethod
    def store_evidence(
        self,
        event_id: str,
        image_path: Optional[Union[str, Path]] = None,
        video_path: Optional[Union[str, Path]] = None,
        crop: Optional[np.ndarray] = None,
    ) -> EventEvidence:
        """Stores or references evidence media and returns EventEvidence reference."""
        pass


class LocalEvidenceStore(EvidenceStore):
    """
    Local filesystem evidence store.
    Saves image crops to disk and retains file path references.
    """

    def __init__(self, storage_dir: Optional[Union[str, Path]] = None):
        self.storage_dir = Path(storage_dir or "ai/events/evidence_store")
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def store_evidence(
        self,
        event_id: str,
        image_path: Optional[Union[str, Path]] = None,
        video_path: Optional[Union[str, Path]] = None,
        crop: Optional[np.ndarray] = None,
    ) -> EventEvidence:
        resolved_img = str(image_path) if image_path else None
        resolved_vid = str(video_path) if video_path else None
        resolved_crop = None

        if crop is not None and crop.size > 0:
            crop_filename = f"{event_id}_crop.jpg"
            crop_file_path = self.storage_dir / crop_filename
            cv2.imwrite(str(crop_file_path), crop)
            resolved_crop = str(crop_file_path)

        return EventEvidence(
            image_path=resolved_img,
            video_path=resolved_vid,
            crop_path=resolved_crop,
        )
