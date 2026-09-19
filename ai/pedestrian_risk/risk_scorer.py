"""
Explainable Pedestrian Risk Scoring Engine (SIH 2026 PS 26124).
Calculates deterministic 0-100 composite risk scores from observed perception indicators.
"""
from typing import List, Optional
import math

from ai.pedestrian_risk.models import (
    RiskLevel,
    RiskFactorScore,
    PedestrianRiskScore,
    PedestrianRiskObservation,
    DataSufficiency,
)
from ai.pedestrian_risk.config import PedestrianRiskConfig, DEFAULT_PEDESTRIAN_CONFIG


class PedestrianRiskScorer:
    """Deterministic, explainable risk scoring based on observed fleet indicators."""

    def __init__(self, config: Optional[PedestrianRiskConfig] = None):
        self.config = config or DEFAULT_PEDESTRIAN_CONFIG

    def evaluate_observations(
        self, observations: List[PedestrianRiskObservation]
    ) -> PedestrianRiskScore:
        """
        Aggregates a set of spatial/temporal observations into an explainable composite risk score.
        """
        if not observations:
            return PedestrianRiskScore(
                score=0,
                risk_level=RiskLevel.LOW,
                factor_scores=[],
                explanation=["No pedestrian-risk observations recorded."],
                operational_reliability=1.0,
                data_sufficiency=DataSufficiency.INSUFFICIENT,
            )

        weights = self.config.weights
        obs_count = len(observations)
        unique_buses = len(set(o.bus_id for o in observations))

        # 1. Evaluate Data Sufficiency
        if obs_count >= self.config.good_min_observations and unique_buses >= self.config.good_min_unique_buses:
            data_sufficiency = DataSufficiency.GOOD
        elif obs_count >= self.config.limited_min_observations:
            data_sufficiency = DataSufficiency.LIMITED
        else:
            data_sufficiency = DataSufficiency.INSUFFICIENT

        # 2. Compute Aggregates
        avg_peds = sum(o.pedestrian_count for o in observations) / obs_count
        max_peds = max(o.pedestrian_count for o in observations)
        avg_vehs = sum(o.vehicle_count for o in observations) / obs_count
        total_proximity = sum(o.proximity_events for o in observations)
        avg_proximity = total_proximity / obs_count
        has_road_defect = any(o.road_defect_present for o in observations)
        
        # Operational Reliability (average across observations)
        avg_reliability = sum(o.operational_reliability for o in observations) / obs_count

        # 3. Factor 1: Pedestrian Activity (0 - 100)
        # Scaled non-linearly: 0 -> 0, 1-2 -> 30, 3-5 -> 65, 6-9 -> 85, >=10 -> 100
        if avg_peds <= 0.5:
            ped_score = 10.0
            ped_ev = f"Low pedestrian activity observed (avg {avg_peds:.1f} per frame)"
        elif avg_peds <= 2.5:
            ped_score = 35.0 + (avg_peds - 0.5) * 15.0
            ped_ev = f"Moderate pedestrian presence (avg {avg_peds:.1f}, peak {max_peds})"
        elif avg_peds <= 6.0:
            ped_score = 65.0 + (avg_peds - 2.5) * 5.7
            ped_ev = f"High pedestrian activity (avg {avg_peds:.1f}, peak {max_peds})"
        else:
            ped_score = min(100.0, 85.0 + (avg_peds - 6.0) * 3.0)
            ped_ev = f"Very high pedestrian crowding (avg {avg_peds:.1f}, peak {max_peds})"

        # Factor 2: Vehicle Density (0 - 100)
        density_counts = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CONGESTED": 0}
        for o in observations:
            density_counts[o.traffic_density.upper()] = density_counts.get(o.traffic_density.upper(), 0) + 1
        
        # Weight density levels
        veh_score = min(
            100.0,
            (density_counts["LOW"] * 20.0
             + density_counts["MEDIUM"] * 50.0
             + density_counts["HIGH"] * 85.0
             + density_counts["CONGESTED"] * 98.0) / obs_count
        )
        veh_ev = f"Traffic load: avg {avg_vehs:.1f} vehicles observed (density: {max(density_counts, key=density_counts.get)})"

        # Factor 3: Pedestrian-Vehicle Proximity (0 - 100)
        if total_proximity == 0:
            prox_score = 10.0
            prox_ev = "No close pedestrian-vehicle proximity conflicts recorded"
        elif total_proximity <= 2:
            prox_score = 45.0 + (total_proximity * 10.0)
            prox_ev = f"{total_proximity} close pedestrian–vehicle proximity interactions"
        elif total_proximity <= 6:
            prox_score = 70.0 + ((total_proximity - 2) * 5.0)
            prox_ev = f"Repeated close proximity interactions ({total_proximity} events flagged)"
        else:
            prox_score = min(100.0, 85.0 + ((total_proximity - 6) * 3.0))
            prox_ev = f"Frequent proximity conflict interactions ({total_proximity} events flagged)"

        # Factor 4: Recurrence / Observation Density (0 - 100)
        if obs_count == 1:
            rec_score = 25.0
            rec_ev = f"Single observation ({unique_buses} bus pass-by)"
        elif obs_count <= 4:
            rec_score = 45.0 + (obs_count * 7.5)
            rec_ev = f"Multiple observations ({obs_count} passes across {unique_buses} buses)"
        elif obs_count <= 10:
            rec_score = 70.0 + ((obs_count - 4) * 3.5)
            rec_ev = f"Recurring risk pattern ({obs_count} passes across {unique_buses} unique buses)"
        else:
            rec_score = min(100.0, 90.0 + ((obs_count - 10) * 1.5))
            rec_ev = f"Persistent recurring hotspot ({obs_count} passes across {unique_buses} unique buses)"

        # Factor 5: Visibility / Lighting Deficit (0 - 100)
        low_light_count = sum(1 for o in observations if o.lighting_condition in ("LOW_LIGHT", "NIGHT"))
        avg_vis = sum((o.visibility_score or 0.9) for o in observations) / obs_count
        if avg_vis >= 0.85 and low_light_count == 0:
            vis_score = 15.0
            vis_ev = f"Optimal lighting & scene visibility (score {avg_vis*100:.0f}%)"
        elif avg_vis >= 0.65 or low_light_count <= 1:
            vis_score = 55.0
            vis_ev = f"Moderate visibility / {low_light_count} low-light observations"
        else:
            vis_score = 85.0
            vis_ev = f"Reduced visibility / {low_light_count} night or low-light passes"

        # Factor 6: Infrastructure Deficit / Road Defect (0 - 100)
        infra_observed = [o.infrastructure_observed for o in observations if o.infrastructure_observed and o.infrastructure_observed != "Not observed"]
        if infra_observed and not has_road_defect:
            infra_score = 15.0
            infra_ev = f"Infrastructure observed: {infra_observed[0]}"
        elif has_road_defect:
            infra_score = 75.0
            infra_ev = "Nearby road defect detected adding pedestrian diversion risk"
        else:
            infra_score = 50.0
            infra_ev = "Crossing infrastructure not observed by fleet camera"

        # 4. Compute Weighted Composite Score
        factors: List[RiskFactorScore] = [
            RiskFactorScore(
                name="Pedestrian Activity",
                key="pedestrian_activity",
                score=ped_score,
                weight=weights.pedestrian_activity,
                weighted_contribution=ped_score * weights.pedestrian_activity,
                evidence_text=ped_ev,
            ),
            RiskFactorScore(
                name="Vehicle Density",
                key="vehicle_density",
                score=veh_score,
                weight=weights.vehicle_density,
                weighted_contribution=veh_score * weights.vehicle_density,
                evidence_text=veh_ev,
            ),
            RiskFactorScore(
                name="Pedestrian–Vehicle Proximity",
                key="proximity_events",
                score=prox_score,
                weight=weights.proximity_events,
                weighted_contribution=prox_score * weights.proximity_events,
                evidence_text=prox_ev,
            ),
            RiskFactorScore(
                name="Recurrence & Density",
                key="recurrence_density",
                score=rec_score,
                weight=weights.recurrence_density,
                weighted_contribution=rec_score * weights.recurrence_density,
                evidence_text=rec_ev,
            ),
            RiskFactorScore(
                name="Visibility & Lighting Deficit",
                key="visibility_lighting",
                score=vis_score,
                weight=weights.visibility_lighting,
                weighted_contribution=vis_score * weights.visibility_lighting,
                evidence_text=vis_ev,
            ),
            RiskFactorScore(
                name="Infrastructure Context",
                key="infrastructure_defect",
                score=infra_score,
                weight=weights.infrastructure_defect,
                weighted_contribution=infra_score * weights.infrastructure_defect,
                evidence_text=infra_ev,
            ),
        ]

        raw_composite = sum(f.weighted_contribution for f in factors)
        final_score = int(round(max(0.0, min(100.0, raw_composite))))

        # 5. Classify Risk Level
        if final_score <= self.config.threshold_low_max:
            risk_level = RiskLevel.LOW
        elif final_score <= self.config.threshold_moderate_max:
            risk_level = RiskLevel.MODERATE
        elif final_score <= self.config.threshold_high_max:
            risk_level = RiskLevel.HIGH
        else:
            risk_level = RiskLevel.CRITICAL

        # 6. Generate Short Explanation Bullet Points
        explanation: List[str] = []
        if ped_score >= 60.0:
            explanation.append("High pedestrian activity observed")
        if veh_score >= 60.0:
            explanation.append("High vehicle traffic density")
        if prox_score >= 50.0:
            explanation.append(f"{total_proximity} close pedestrian–vehicle proximity interactions")
        if rec_score >= 60.0:
            explanation.append(f"Recurring observations across {unique_buses} unique buses")
        if vis_score >= 50.0:
            explanation.append("Reduced visibility or low-light conditions noted")
        if has_road_defect:
            explanation.append("Road surface defect in pedestrian transit corridor")

        if not explanation:
            explanation.append("Nominal pedestrian and vehicle activity within baseline parameters.")

        return PedestrianRiskScore(
            score=final_score,
            risk_level=risk_level,
            factor_scores=factors,
            explanation=explanation,
            operational_reliability=avg_reliability,
            data_sufficiency=data_sufficiency,
            disclaimer="Prototype risk score based on observed indicators",
        )
