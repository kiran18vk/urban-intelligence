"""
Verification Scoring & Evidence Sufficiency Engine (Feature #8).
"""
from typing import Dict, Any, List, Tuple
from ai.reobservation.models import EvidenceSufficiency, CorroborationLevel


class VerificationEngine:
    """
    Calculates evidence sufficiency verification score (0-100) and corroboration classification.
    """

    @staticmethod
    def calculate_score(
        comparison: Dict[str, Any],
        after_reliability: float,
        after_operational_confidence: float,
        independent_bus_count: int = 1,
        has_evidence_ref: bool = True,
    ) -> Tuple[float, EvidenceSufficiency, CorroborationLevel]:
        """
        Computes 0-100 verification score representing evidence sufficiency.
        """
        # 1. Observation Reliability Component (Max 35 points)
        rel_clamped = max(0.0, min(1.0, after_reliability))
        rel_pts = rel_clamped * 35.0

        # 2. Spatial Proximity Component (Max 25 points)
        dist_m = float(comparison.get("spatial_distance_m", 0.0))
        spatial_thresh = float(comparison.get("spatial_threshold_m", 150.0))
        if dist_m <= spatial_thresh:
            # Linear decay from 25 pts at 0m to 15 pts at threshold
            prox_ratio = max(0.0, 1.0 - (dist_m / spatial_thresh))
            spatial_pts = 15.0 + (prox_ratio * 10.0)
        else:
            spatial_pts = max(0.0, 10.0 - ((dist_m - spatial_thresh) / 50.0))

        # 3. Temporal Validity Component (Max 15 points)
        temporal_hours = float(comparison.get("temporal_delta_hours", 24.0))
        if temporal_hours <= 168.0:  # within 7 days
            temporal_pts = 15.0
        elif temporal_hours <= 720.0:  # within 30 days
            temporal_pts = 10.0
        else:
            temporal_pts = 5.0

        # 4. Multi-Bus Corroboration Component (Max 15 points)
        if independent_bus_count >= 3:
            bus_pts = 15.0
            corroboration = CorroborationLevel.MULTI_BUS_CONSENSUS
        elif independent_bus_count == 2:
            bus_pts = 12.0
            corroboration = CorroborationLevel.MULTI_BUS_CORROBORATION
        else:
            bus_pts = 8.0
            corroboration = CorroborationLevel.SINGLE_BUS_OBSERVATION

        # 5. Operational Confidence & Evidence Reference (Max 10 points)
        op_conf_clamped = max(0.0, min(1.0, after_operational_confidence))
        evidence_pts = (op_conf_clamped * 6.0) + (4.0 if has_evidence_ref else 0.0)

        total_score = round(min(100.0, rel_pts + spatial_pts + temporal_pts + bus_pts + evidence_pts), 1)

        # Classify sufficiency
        if total_score >= 75.0 and comparison.get("spatial_match", True):
            sufficiency = EvidenceSufficiency.GOOD
        elif total_score >= 50.0:
            sufficiency = EvidenceSufficiency.LIMITED
        else:
            sufficiency = EvidenceSufficiency.INSUFFICIENT

        return total_score, sufficiency, corroboration
