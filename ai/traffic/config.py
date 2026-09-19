"""
Central configuration for Phase 2C Traffic Tracking Pipeline (SIH 2026 PS 26124).
All thresholds and calibration parameters are defined here — nowhere else.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Optional, Tuple

# ─── Project paths ─────────────────────────────────────────────────────────────
AI_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = AI_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_MODEL_NAME = "yolov8n.pt"
DEFAULT_MODEL_PATH = MODELS_DIR / DEFAULT_MODEL_NAME

# ─── Classes to track ─────────────────────────────────────────────────────────
VEHICLE_CLASSES: List[str] = [
    "car", "motorcycle", "bicycle", "bus", "truck", "person"
]

# ─── Tracker ──────────────────────────────────────────────────────────────────
DEFAULT_CONFIDENCE_THRESHOLD: float = 0.25
DEFAULT_IMG_SIZE: int = 640
DEFAULT_DEVICE: str = "cpu"

# Maximum center-point history to keep per track (avoids unbounded memory).
MAX_TRAJECTORY_LENGTH: int = 120   # frames (~4 s at 30 fps)

# ─── Traffic density thresholds (vehicle count per ROI / frame) ───────────────
DENSITY_LOW_MAX: int = 4     # 0–4  active tracks → LOW
DENSITY_MEDIUM_MAX: int = 12  # 5–12 active tracks → MEDIUM
# > 12 active tracks → HIGH

# ─── Speed estimation calibration ─────────────────────────────────────────────
# Physical calibration. These must be measured for a specific camera installation.
# If PIXELS_PER_METER is None the system will NOT produce speed estimates and
# will instead return speed_kmh = None (clearly marked as uncalibrated).
PIXELS_PER_METER: Optional[float] = None  # e.g. 24.5 for a typical PTZ camera
DEFAULT_FPS: float = 25.0               # frames per second used when no FPS metadata available
SPEED_SMOOTHING_FRAMES: int = 10        # average speed over this many frames

# ─── Virtual counting line defaults (fraction of frame height) ────────────────
# A horizontal line at 50 % of frame height. Can be overridden at pipeline construction.
DEFAULT_LINE_Y_FRACTION: float = 0.50

# ─── Annotation ───────────────────────────────────────────────────────────────
ANNOTATION_BOX_THICKNESS: int = 2
ANNOTATION_FONT_SCALE: float = 0.55
ANNOTATION_FONT_THICKNESS: int = 1

# BGR colours for per-class bounding boxes
CLASS_COLORS_BGR = {
    "car": (255, 150, 0),
    "motorcycle": (0, 215, 255),
    "bus": (70, 200, 50),
    "truck": (200, 50, 200),
    "bicycle": (255, 200, 0),
    "person": (50, 100, 255),
}
DEFAULT_COLOR_BGR = (200, 200, 200)

# HUD / overlay colours
HUD_LINE_COLOR_BGR = (0, 255, 255)         # cyan counting line
HUD_INCOMING_COLOR_BGR = (0, 255, 100)     # green for incoming arrow
HUD_OUTGOING_COLOR_BGR = (0, 80, 255)      # red-ish for outgoing arrow


@dataclass
class TrafficConfig:
    """Runtime configuration for the traffic tracking pipeline."""
    model_path: Path = DEFAULT_MODEL_PATH
    confidence_threshold: float = DEFAULT_CONFIDENCE_THRESHOLD
    img_size: int = DEFAULT_IMG_SIZE
    device: str = DEFAULT_DEVICE
    target_classes: List[str] = field(default_factory=lambda: list(VEHICLE_CLASSES))
    max_trajectory_length: int = MAX_TRAJECTORY_LENGTH
    density_low_max: int = DENSITY_LOW_MAX
    density_medium_max: int = DENSITY_MEDIUM_MAX
    line_y_fraction: float = DEFAULT_LINE_Y_FRACTION
    pixels_per_meter: Optional[float] = PIXELS_PER_METER
    fps: float = DEFAULT_FPS
    speed_smoothing_frames: int = SPEED_SMOOTHING_FRAMES

    def __post_init__(self):
        if isinstance(self.model_path, str):
            self.model_path = Path(self.model_path)
