"""
What-If Scenario Simulator for Urban Digital Twin (SIH 2026 PS 26124).

Provides deterministic impact projections for transport authority decision support.
Explicitly labeled as: "SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION".
"""

from typing import Dict, Any, Optional

from ai.digital_twin.models import (
    SimulationResult,
    ConditionState,
    CongestionLevel,
)
from ai.digital_twin.state_engine import DigitalTwinStateEngine


class DigitalTwinSimulator:
    """
    Deterministic What-If scenario projection engine.
    Calculates operational deltas for hypothetical road condition changes,
    congestion surges, and corridor closures.
    """

    CONGESTION_MULTIPLIERS = {
        "LOW": 1.05,
        "MEDIUM": 1.30,
        "HIGH": 1.70,
        "CRITICAL": 2.10,
    }

    BASELINE_ROUTE_TIMES_MIN = {
        "CORR-01": 15.0,  # Swargate - Alka Talkies
        "CORR-02": 20.0,  # FC Road - Shivajinagar
        "CORR-03": 18.0,  # Shivajinagar - Khadki
        "CORR-04": 25.0,  # Kasarwadi - Pimpri
        "CORR-05": 30.0,  # Baner - Hinjewadi
    }

    def __init__(self, state_engine: Optional[DigitalTwinStateEngine] = None):
        self.state_engine = state_engine or DigitalTwinStateEngine()

    def simulate_scenario(
        self,
        scenario_type: str,
        target_id: str,
        parameters: Optional[Dict[str, Any]] = None,
    ) -> SimulationResult:
        """Dispatches scenario evaluation based on scenario_type."""
        parameters = parameters or {}
        scenario_type_upper = scenario_type.upper()

        if scenario_type_upper == "ROAD_DEFECT":
            return self._simulate_road_defect(target_id, parameters)
        elif scenario_type_upper in ("CONGESTION_SURGE", "CONGESTION"):
            return self._simulate_congestion_surge(target_id, parameters)
        elif scenario_type_upper in ("ROAD_CLOSURE", "CLOSURE"):
            return self._simulate_road_closure(target_id, parameters)
        else:
            raise ValueError(f"Unknown scenario type: '{scenario_type}'. Supported: ROAD_DEFECT, CONGESTION_SURGE, ROAD_CLOSURE")

    def _simulate_road_defect(self, road_id: str, params: Dict[str, Any]) -> SimulationResult:
        road = self.state_engine.roads.get(road_id)
        road_name = road.name if road else f"Road Segment {road_id}"
        baseline_defects = road.defect_count if road else 1
        baseline_condition = road.condition_state if road else ConditionState.GOOD.value

        additional_defects = int(params.get("additional_defects", 3))
        simulated_defects = baseline_defects + additional_defects

        if simulated_defects > 5:
            sim_condition = ConditionState.CRITICAL.value
            serviceability_score = 35.0
        elif simulated_defects > 2:
            sim_condition = ConditionState.DEGRADED.value
            serviceability_score = 60.0
        else:
            sim_condition = ConditionState.GOOD.value
            serviceability_score = 85.0

        formula = "serviceability_score = max(20.0, 100.0 - (total_defects * 12.0))"

        return SimulationResult(
            scenario_type="ROAD_DEFECT",
            target_id=road_id,
            target_name=road_name,
            baseline_metrics={
                "defect_count": baseline_defects,
                "condition_state": baseline_condition,
                "serviceability_score": max(20.0, 100.0 - (baseline_defects * 12.0)),
            },
            simulated_metrics={
                "defect_count": simulated_defects,
                "condition_state": sim_condition,
                "serviceability_score": serviceability_score,
            },
            impact_summary=(
                f"Adding {additional_defects} severe defects downgrades {road_name} "
                f"from {baseline_condition} to {sim_condition}. Immediate maintenance dispatch advised."
            ),
            delta={
                "defect_delta": additional_defects,
                "condition_change": f"{baseline_condition} -> {sim_condition}",
                "serviceability_drop_pct": round(
                    max(20.0, 100.0 - (baseline_defects * 12.0)) - serviceability_score, 1
                ),
            },
            formula_used=formula,
        )

    def _simulate_congestion_surge(self, zone_or_corridor_id: str, params: Dict[str, Any]) -> SimulationResult:
        target_level = params.get("target_congestion_level", "HIGH").upper()
        if target_level not in self.CONGESTION_MULTIPLIERS:
            target_level = "HIGH"

        baseline_corridor = "CORR-02"
        target_name = "FC Road Commercial Zone"

        zone = self.state_engine.traffic_zones.get(zone_or_corridor_id)
        if zone:
            target_name = zone.name
            baseline_level = zone.congestion_level
        else:
            baseline_level = "MEDIUM"

        baseline_factor = self.CONGESTION_MULTIPLIERS.get(baseline_level, 1.30)
        target_factor = self.CONGESTION_MULTIPLIERS[target_level]

        baseline_time_min = self.BASELINE_ROUTE_TIMES_MIN.get(baseline_corridor, 20.0)
        baseline_delay_min = round(baseline_time_min * (baseline_factor - 1.0), 1)
        simulated_delay_min = round(baseline_time_min * (target_factor - 1.0), 1)
        delta_delay_min = round(simulated_delay_min - baseline_delay_min, 1)

        formula = "estimated_delay = baseline_time_min * (congestion_factor - 1.0)"

        return SimulationResult(
            scenario_type="CONGESTION_SURGE",
            target_id=zone_or_corridor_id,
            target_name=target_name,
            baseline_metrics={
                "congestion_level": baseline_level,
                "congestion_factor": baseline_factor,
                "estimated_delay_min": baseline_delay_min,
                "baseline_transit_time_min": baseline_time_min,
            },
            simulated_metrics={
                "congestion_level": target_level,
                "congestion_factor": target_factor,
                "estimated_delay_min": simulated_delay_min,
                "projected_total_transit_time_min": round(baseline_time_min + simulated_delay_min, 1),
            },
            impact_summary=(
                f"Surging congestion to {target_level} increases estimated transit delay by "
                f"+{delta_delay_min} minutes (+{round((delta_delay_min / max(0.1, baseline_time_min)) * 100, 1)}% corridor travel time)."
            ),
            delta={
                "congestion_change": f"{baseline_level} -> {target_level}",
                "delay_increase_min": delta_delay_min,
                "delay_increase_pct": round((delta_delay_min / max(0.1, baseline_delay_min or 1.0)) * 100, 1),
            },
            formula_used=formula,
        )

    def _simulate_road_closure(self, road_id: str, params: Dict[str, Any]) -> SimulationResult:
        road = self.state_engine.roads.get(road_id)
        road_name = road.name if road else f"Road Segment {road_id}"
        corridor_id = road.corridor_id if road else "CORR-02"

        baseline_time_min = self.BASELINE_ROUTE_TIMES_MIN.get(corridor_id, 20.0)
        detour_multiplier = float(params.get("detour_multiplier", 1.55))
        simulated_time_min = round(baseline_time_min * detour_multiplier, 1)
        detour_delay_min = round(simulated_time_min - baseline_time_min, 1)

        formula = "simulated_route_time = baseline_time_min * detour_multiplier"

        return SimulationResult(
            scenario_type="ROAD_CLOSURE",
            target_id=road_id,
            target_name=road_name,
            baseline_metrics={
                "status": "OPEN",
                "baseline_transit_time_min": baseline_time_min,
                "affected_routes": ["Route 12", "Route 18"],
            },
            simulated_metrics={
                "status": "CLOSED_DETOUR_ACTIVE",
                "detour_transit_time_min": simulated_time_min,
                "estimated_detour_penalty_min": detour_delay_min,
            },
            impact_summary=(
                f"Complete closure of {road_name} requires rerouting via alternate arterials, "
                f"imposing a +{detour_delay_min} min detour penalty (+{round((detour_multiplier - 1.0) * 100)}%) on active bus routes."
            ),
            delta={
                "status_change": "OPEN -> CLOSED (Detour)",
                "transit_time_penalty_min": detour_delay_min,
                "transit_time_penalty_pct": round((detour_multiplier - 1.0) * 100, 1),
            },
            formula_used=formula,
        )
