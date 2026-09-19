"""
Risk Explainer Module for Pedestrian Risk Intelligence.
Generates data-grounded explanations of risk factors without hallucinating unobserved parameters.
"""
from typing import List
from ai.pedestrian_risk.models import RiskFactorScore, DataSufficiency, RiskLevel


class RiskExplainer:
    """Generates human-readable, grounded explanations for why a hotspot is flagged."""

    @staticmethod
    def generate_detailed_reasons(
        factor_scores: List[RiskFactorScore],
        data_sufficiency: DataSufficiency,
        risk_level: RiskLevel,
        unique_bus_count: int = 1,
    ) -> List[str]:
        reasons: List[str] = []
        
        factor_map = {f.key: f for f in factor_scores}

        # 1. Pedestrian Activity
        ped_f = factor_map.get("pedestrian_activity")
        if ped_f and ped_f.score >= 50.0:
            reasons.append("High pedestrian activity and crossing demand")
        elif ped_f and ped_f.score >= 35.0:
            reasons.append("Moderate pedestrian presence recorded")

        # 2. Vehicle Density
        veh_f = factor_map.get("vehicle_density")
        if veh_f and veh_f.score >= 55.0:
            reasons.append("High vehicle traffic density along corridor")

        # 3. Proximity Conflicts
        prox_f = factor_map.get("proximity_events")
        if prox_f and prox_f.score >= 45.0:
            reasons.append("Repeated close pedestrian–vehicle proximity interactions")

        # 4. Multi-Bus Independent Corroboration
        if unique_bus_count >= 2:
            reasons.append(f"Observed across {unique_bus_count} independent buses")

        # 5. Recurrence
        rec_f = factor_map.get("recurrence_density")
        if rec_f and rec_f.score >= 50.0:
            reasons.append("Recurring risk pattern detected across multiple fleet journeys")

        # 6. Visibility / Lighting
        vis_f = factor_map.get("visibility_lighting")
        if vis_f and vis_f.score >= 50.0:
            reasons.append("Reduced visibility or low-light conditions recorded during passes")

        # 7. Infrastructure Context
        infra_f = factor_map.get("infrastructure_defect")
        if infra_f and infra_f.score >= 60.0:
            reasons.append("Nearby road defect or unobserved marked crossing in transit zone")

        # Data sufficiency qualification
        if data_sufficiency == DataSufficiency.LIMITED:
            reasons.append("Notice: Preliminary assessment based on limited observations")
        elif data_sufficiency == DataSufficiency.INSUFFICIENT:
            reasons.append("Notice: Insufficient observation volume for statistical significance")

        if not reasons:
            reasons.append("Nominal risk factors within standard urban corridor parameters")

        return reasons
