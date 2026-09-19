"""
Rule-based Prototype Incident Detector.

Evaluates spatio-temporal tracking information and trigger heuristics to identify
potential road incidents (collision suspect, sudden deviation, suspicious proximity)
without claiming ground-truth collision or verified liability.
"""
from typing import Dict, Any, List, Optional, Tuple
import math

from ai.incidents.models import IncidentTrigger, IncidentType
from ai.incidents.config import IncidentConfig


class IncidentDetector:
    """
    Transparent, lightweight rule-based incident detector operating on
    ByteTrack track histories and trigger heuristics.
    """

    def __init__(self, config: Optional[IncidentConfig] = None):
        self.config = config or IncidentConfig()

    def evaluate_track_motion(
        self,
        track_id: int,
        history: List[Tuple[float, float]],
        current_frame: int = 0,
        is_disappeared: bool = False,
    ) -> Tuple[str, Optional[IncidentTrigger]]:
        """
        Evaluates a single vehicle track's motion history for sudden trajectory
        deviations or sudden disappearance.
        
        Args:
            track_id: ByteTrack unique track ID
            history: List of (cx, cy) center coordinates across consecutive frames
            current_frame: Current video frame index
            is_disappeared: Whether the track was lost abruptly

        Returns:
            Tuple of (detection_result_string, Optional[IncidentTrigger])
        """
        if len(history) < self.config.min_track_persistence_frames:
            return "NO_INCIDENT", None

        # Check trajectory angle change between segments
        if len(history) >= 4:
            p0, p1, p2, p3 = history[-4], history[-3], history[-2], history[-1]
            dx1, dy1 = p1[0] - p0[0], p1[1] - p0[1]
            dx2, dy2 = p3[0] - p2[0], p3[1] - p2[1]
            
            mag1 = math.hypot(dx1, dy1)
            mag2 = math.hypot(dx2, dy2)
            
            if mag1 > 5.0 and mag2 > 5.0:
                dot = (dx1 * dx2 + dy1 * dy2) / (mag1 * mag2)
                dot = max(-1.0, min(1.0, dot))
                angle_deg = math.degrees(math.acos(dot))

                if angle_deg >= self.config.trajectory_deviation_threshold_deg:
                    trigger = IncidentTrigger(
                        trigger_type=IncidentType.SUDDEN_DEVIATION,
                        track_id=track_id,
                        frame_index=current_frame,
                        confidence=0.72,
                        description=(
                            f"Sudden trajectory angle change ({angle_deg:.1f}° >= {self.config.trajectory_deviation_threshold_deg}°) "
                            f"detected for track #{track_id}. Potential incident trigger — requires human review."
                        ),
                        trajectory_deviation=angle_deg,
                        persistence_frames=len(history),
                    )
                    return "POTENTIAL_INCIDENT", trigger

        # Check sudden disappearance if flagged
        if is_disappeared and len(history) >= self.config.min_track_persistence_frames:
            trigger = IncidentTrigger(
                trigger_type=IncidentType.HIT_AND_RUN_SUSPECT,
                track_id=track_id,
                frame_index=current_frame,
                confidence=0.68,
                description=(
                    f"Vehicle track #{track_id} abruptly lost following active motion history. "
                    f"Flagged as potential hit-and-run suspect — requires human review."
                ),
                persistence_frames=len(history),
            )
            return "POTENTIAL_INCIDENT", trigger

        return "NO_INCIDENT", None

    def evaluate_proximity_interaction(
        self,
        track_id_a: int,
        bbox_a: List[float],
        track_id_b: int,
        bbox_b: List[float],
        current_frame: int = 0,
    ) -> Tuple[str, Optional[IncidentTrigger]]:
        """
        Evaluates proximity between two tracked entities (e.g. vehicle and vehicle/pedestrian).
        """
        cx_a = (bbox_a[0] + bbox_a[2]) / 2.0
        cy_a = (bbox_a[1] + bbox_a[3]) / 2.0
        cx_b = (bbox_b[0] + bbox_b[2]) / 2.0
        cy_b = (bbox_b[1] + bbox_b[3]) / 2.0

        dist = math.hypot(cx_a - cx_b, cy_a - cy_b)

        if dist <= self.config.proximity_threshold_px:
            trigger = IncidentTrigger(
                trigger_type=IncidentType.SUSPICIOUS_PROXIMITY,
                track_id=track_id_a,
                frame_index=current_frame,
                confidence=0.75,
                description=(
                    f"Proximity interaction ({dist:.1f}px <= {self.config.proximity_threshold_px}px) "
                    f"between track #{track_id_a} and #{track_id_b}. Requires human review."
                ),
                proximity_distance_px=dist,
                metadata={"partner_track_id": track_id_b},
            )
            return "POTENTIAL_INCIDENT", trigger

        return "NO_INCIDENT", None

    def create_demo_trigger(
        self,
        track_id: int = 101,
        frame_index: int = 45,
    ) -> Tuple[str, IncidentTrigger]:
        """
        Generates a deterministic synthetic demo incident trigger for UI walkthroughs.
        """
        trigger = IncidentTrigger(
            trigger_type=IncidentType.HIT_AND_RUN_SUSPECT,
            track_id=track_id,
            frame_index=frame_index,
            confidence=0.82,
            description=(
                f"[DEMO ONLY] Potential incident trigger detected for synthetic track #{track_id} "
                f"with sudden departure motion. Requires human review."
            ),
            trajectory_deviation=52.4,
            proximity_distance_px=38.2,
            persistence_frames=12,
            metadata={"is_demo": True},
        )
        return "DEMO_INCIDENT", trigger
