"""
Mitigation Recommendation & What-If Simulation Engine for Pedestrian Risk.
All outputs represent decision-support recommendations and modelled scenario estimates for municipal authority review.
"""
from typing import List, Dict, Any, Optional

from ai.pedestrian_risk.models import (
    RiskFactorScore,
    RiskLevel,
    MitigationRecommendation,
    MitigationScenarioType,
    PedestrianWhatIfResult,
)
from ai.pedestrian_risk.config import PedestrianRiskConfig, DEFAULT_PEDESTRIAN_CONFIG


class MitigationEngine:
    """Generates authority-review recommendations and models What-If mitigation scenario projections."""

    def __init__(self, config: Optional[PedestrianRiskConfig] = None):
        self.config = config or DEFAULT_PEDESTRIAN_CONFIG

    def generate_recommendations(
        self,
        factor_scores: List[RiskFactorScore],
        peak_period: Optional[str] = None,
        has_road_defect: bool = False,
    ) -> List[MitigationRecommendation]:
        """
        Derives rule-based mitigation recommendations for authority review.
        """
        recommendations: List[MitigationRecommendation] = []
        factor_map = {f.key: f for f in factor_scores}

        ped_score = factor_map.get("pedestrian_activity", RiskFactorScore("", "", 0, 0, 0, "")).score
        veh_score = factor_map.get("vehicle_density", RiskFactorScore("", "", 0, 0, 0, "")).score
        prox_score = factor_map.get("proximity_events", RiskFactorScore("", "", 0, 0, 0, "")).score
        vis_score = factor_map.get("visibility_lighting", RiskFactorScore("", "", 0, 0, 0, "")).score

        priority_counter = 1

        # 1. Crossing Infrastructure & Traffic Calming
        if ped_score >= 45.0 and (prox_score >= 40.0 or veh_score >= 50.0):
            recommendations.append(
                MitigationRecommendation(
                    priority=priority_counter,
                    title="Evaluate pedestrian crossing improvements and traffic-calming measures",
                    description=(
                        "Recommended action: Evaluate installation or refurbishment of high-visibility marked pedestrian crossings, "
                        "raised crosswalks, or pedestrian refuge islands to channel pedestrian movement safely."
                    ),
                    rationale="High pedestrian crossing activity coincides with sustained vehicle flow and proximity events.",
                    target_scenario=MitigationScenarioType.CROSSING_IMPROVEMENT,
                    estimated_score_reduction_points=self.config.whatif_reductions.get("CROSSING_IMPROVEMENT", 18),
                    requires_authority_review=True,
                )
            )
            priority_counter += 1

        # 2. Traffic Management & Speed Calming
        if veh_score >= 55.0 and prox_score >= 35.0:
            recommendations.append(
                MitigationRecommendation(
                    priority=priority_counter,
                    title="Evaluate traffic-management or speed-calming measures",
                    description=(
                        "Recommended action: Evaluate speed-calming interventions (e.g. rumble strips, speed cushions, lane narrowing) "
                        "and dynamic speed warning signs along the corridor approaches."
                    ),
                    rationale="Heavy vehicle density combined with pedestrian proximity interactions increases risk severity.",
                    target_scenario=MitigationScenarioType.TRAFFIC_CALMING,
                    estimated_score_reduction_points=self.config.whatif_reductions.get("TRAFFIC_CALMING", 15),
                    requires_authority_review=True,
                )
            )
            priority_counter += 1

        # 3. Street Lighting Evaluation
        if vis_score >= 45.0:
            recommendations.append(
                MitigationRecommendation(
                    priority=priority_counter,
                    title="Evaluate street-lighting improvement at the hotspot",
                    description=(
                        "Recommended action: Evaluate adequacy of roadway and sidewalk illumination levels, and consider targeted LED crosswalk floodlighting."
                    ),
                    rationale="Perception data recorded low-light or reduced visibility conditions during bus pass-bys.",
                    target_scenario=MitigationScenarioType.STREET_LIGHTING,
                    estimated_score_reduction_points=self.config.whatif_reductions.get("STREET_LIGHTING", 12),
                    requires_authority_review=True,
                )
            )
            priority_counter += 1

        # 4. Targeted Peak-Period Enforcement
        if peak_period and "Insufficient" not in peak_period:
            recommendations.append(
                MitigationRecommendation(
                    priority=priority_counter,
                    title=f"Consider targeted traffic management during observed peak period ({peak_period})",
                    description=(
                        f"Recommended action: Evaluate deploying traffic wardens or automated speed enforcement during the identified peak risk window ({peak_period})."
                    ),
                    rationale=f"Risk observations are heavily concentrated during {peak_period}.",
                    target_scenario=MitigationScenarioType.TARGETED_ENFORCEMENT,
                    estimated_score_reduction_points=self.config.whatif_reductions.get("TARGETED_ENFORCEMENT", 10),
                    requires_authority_review=True,
                )
            )
            priority_counter += 1

        # 5. Road Defect Remediation Context
        if has_road_defect:
            recommendations.append(
                MitigationRecommendation(
                    priority=priority_counter,
                    title="Evaluate road defect repair to prevent pedestrian diversion",
                    description=(
                        "Recommended action: Evaluate road defect and pothole/crack remediation with municipal road maintenance team "
                        "to eliminate surface hazards forcing pedestrians into vehicular travel lanes."
                    ),
                    rationale="Surface distress adjacent to pedestrian pathway increases lateral conflict risk.",
                    target_scenario=MitigationScenarioType.TRAFFIC_CALMING,
                    estimated_score_reduction_points=8,
                    requires_authority_review=True,
                )
            )
            priority_counter += 1

        # Fallback if baseline is nominal
        if not recommendations:
            recommendations.append(
                MitigationRecommendation(
                    priority=1,
                    title="Maintain periodic fleet monitoring and standard pedestrian infrastructure maintenance",
                    description="Recommended action: Continue routine mobile fleet observation pass-bys to maintain baseline condition records.",
                    rationale="Current observed indicators fall within normal corridor operating parameters.",
                    target_scenario=MitigationScenarioType.CROSSING_IMPROVEMENT,
                    estimated_score_reduction_points=5,
                    requires_authority_review=True,
                )
            )

        return recommendations

    def simulate_scenario(
        self,
        hotspot_id: str,
        baseline_score: int,
        scenario_type: str,
    ) -> PedestrianWhatIfResult:
        """
        Models hypothetical risk score reduction for a selected mitigation intervention.
        """
        reduction_points = self.config.whatif_reductions.get(scenario_type, 15)
        simulated_score = max(5, baseline_score - reduction_points)

        def score_to_level(s: int) -> RiskLevel:
            if s <= self.config.threshold_low_max:
                return RiskLevel.LOW
            elif s <= self.config.threshold_moderate_max:
                return RiskLevel.MODERATE
            elif s <= self.config.threshold_high_max:
                return RiskLevel.HIGH
            return RiskLevel.CRITICAL

        baseline_level = score_to_level(baseline_score)
        simulated_level = score_to_level(simulated_score)
        score_delta = -(baseline_score - simulated_score)

        scenario_names = {
            "CROSSING_IMPROVEMENT": "Pedestrian Crossing Improvement",
            "STREET_LIGHTING": "Street Lighting & Visibility Enhancement",
            "TRAFFIC_CALMING": "Traffic Calming & Speed Reduction",
            "TARGETED_ENFORCEMENT": "Targeted Peak-Period Traffic Management",
            "COMBINED_INTERVENTION": "Combined Comprehensive Safety Intervention",
        }

        factor_impacts = {
            "CROSSING_IMPROVEMENT": {"pedestrian_crossing_safety": "+45%", "conflict_separation": "+40%"},
            "STREET_LIGHTING": {"night_visibility": "+60%", "driver_reaction_distance": "+35%"},
            "TRAFFIC_CALMING": {"speed_compliance": "+30%", "vehicle_pedestrian_delta_v": "-25%"},
            "TARGETED_ENFORCEMENT": {"peak_flow_orderliness": "+35%", "jaywalking_reduction": "+25%"},
            "COMBINED_INTERVENTION": {"overall_corridor_safety_index": "+65%", "multi_factor_risk_drop": "-28 pts"},
        }

        return PedestrianWhatIfResult(
            hotspot_id=hotspot_id,
            scenario_type=scenario_type,
            scenario_name=scenario_names.get(scenario_type, scenario_type),
            baseline_score=baseline_score,
            baseline_level=baseline_level,
            simulated_score=simulated_score,
            simulated_level=simulated_level,
            score_delta=score_delta,
            factor_changes=factor_impacts.get(scenario_type, {}),
            disclaimer="Scenario estimate — decision support only",
        )
