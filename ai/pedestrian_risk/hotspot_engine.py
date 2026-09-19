"""
Spatial & Temporal Hotspot Clustering Engine for Pedestrian Risk.
Groups multi-bus mobile perception observations into recurring risk hotspots with trend and peak-period analysis.
"""
from typing import List, Dict, Tuple, Optional
import math
import time
from datetime import datetime

from ai.pedestrian_risk.models import (
    PedestrianRiskObservation,
    PedestrianHotspot,
    TimeRiskSlot,
    TrendDirection,
    DataSufficiency,
    RiskLevel,
)
from ai.pedestrian_risk.config import PedestrianRiskConfig, DEFAULT_PEDESTRIAN_CONFIG
from ai.pedestrian_risk.risk_scorer import PedestrianRiskScorer
from ai.pedestrian_risk.risk_explainer import RiskExplainer
from ai.pedestrian_risk.mitigation_engine import MitigationEngine
from ai.pedestrian_risk.consensus import ConsensusEngine


def _haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Computes approximate distance in meters between two coordinates."""
    r = 6371000.0  # Earth radius in meters
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


class HotspotEngine:
    """Spatial and temporal correlation engine for fleet-observed pedestrian risk."""

    def __init__(self, config: Optional[PedestrianRiskConfig] = None):
        self.config = config or DEFAULT_PEDESTRIAN_CONFIG
        self.scorer = PedestrianRiskScorer(self.config)
        self.explainer = RiskExplainer()
        self.mitigation_engine = MitigationEngine(self.config)
        self.consensus_engine = ConsensusEngine(self.config)

    def cluster_observations(
        self, observations: List[PedestrianRiskObservation]
    ) -> List[PedestrianHotspot]:
        """
        Groups observations into spatial hotspots within cluster distance threshold.
        """
        if not observations:
            return []

        # 1. Cluster spatially
        clusters: List[List[PedestrianRiskObservation]] = []
        visited = set()

        for i, obs in enumerate(observations):
            if i in visited:
                continue
            current_cluster = [obs]
            visited.add(i)

            for j, other in enumerate(observations):
                if j in visited:
                    continue
                # Group strictly within cluster distance threshold (~150m)
                dist_m = _haversine_distance_m(obs.latitude, obs.longitude, other.latitude, other.longitude)
                if dist_m <= self.config.cluster_distance_meters:
                    current_cluster.append(other)
                    visited.add(j)

            clusters.append(current_cluster)

        # 2. Build Hotspot entities from clusters
        hotspots: List[PedestrianHotspot] = []
        for idx, cluster in enumerate(clusters, 1):
            hotspot = self._build_hotspot_from_cluster(cluster, f"PEDESTRIAN-HOTSPOT-{idx:03d}")
            hotspots.append(hotspot)

        # Sort by current risk score descending
        hotspots.sort(key=lambda h: h.current_risk_score, reverse=True)
        return hotspots

    def _build_hotspot_from_cluster(
        self, cluster: List[PedestrianRiskObservation], hotspot_id: str
    ) -> PedestrianHotspot:
        # Sort cluster chronologically
        cluster.sort(key=lambda o: o.timestamp)
        
        # Spatial centroid
        center_lat = sum(o.latitude for o in cluster) / len(cluster)
        center_lon = sum(o.longitude for o in cluster) / len(cluster)
        
        # Road naming
        road_names = [o.road_name for o in cluster if o.road_name]
        road_name = road_names[0] if road_names else f"Corridor {cluster[0].road_id}"
        road_id = cluster[0].road_id or f"ROAD-{hotspot_id[-3:]}"
        name = f"{road_name} Pedestrian Zone"

        obs_count = len(cluster)
        unique_buses = len(set(o.bus_id for o in cluster))
        total_peds = sum(o.pedestrian_count for o in cluster)
        total_vehs = sum(o.vehicle_count for o in cluster)
        total_prox = sum(o.proximity_events for o in cluster)
        has_road_defect = any(o.road_defect_present for o in cluster)

        first_obs = cluster[0].timestamp
        latest_obs = cluster[-1].timestamp
        freshness_sec = int(time.time() - latest_obs) if latest_obs > 0 else 300

        # Evaluate risk score for the overall cluster
        risk_score_obj = self.scorer.evaluate_observations(cluster)
        current_score = risk_score_obj.score
        risk_level = risk_score_obj.risk_level
        factors = risk_score_obj.factor_scores
        data_sufficiency = risk_score_obj.data_sufficiency
        operational_rel = risk_score_obj.operational_reliability

        # Build trend history points (pass-by scores progression)
        trend_history: List[int] = []
        if obs_count >= 1:
            # Build rolling historical observations score points
            chunk_size = max(1, math.ceil(obs_count / 6.0))
            for i in range(0, obs_count, chunk_size):
                sub_cluster = cluster[max(0, i - chunk_size + 1): i + 1]
                if sub_cluster:
                    sub_score = self.scorer.evaluate_observations(sub_cluster).score
                    trend_history.append(sub_score)
            if not trend_history:
                trend_history = [current_score]

        # Calculate Trend Direction
        if len(trend_history) < 3 or obs_count < 3:
            trend = TrendDirection.INSUFFICIENT_DATA
        else:
            diff = trend_history[-1] - trend_history[0]
            if diff >= 6:
                trend = TrendDirection.INCREASING
            elif diff <= -6:
                trend = TrendDirection.DECREASING
            else:
                trend = TrendDirection.STABLE

        # Time-of-Day Risk Slots Evaluation
        time_distribution: List[TimeRiskSlot] = []
        window_counts = {w[0]: [] for w in self.config.time_windows}

        for obs in cluster:
            # Convert timestamp to hour of day (UTC+5:30 Pune local time or epoch)
            hour = datetime.fromtimestamp(obs.timestamp).hour
            for w_label, start_h, end_h in self.config.time_windows:
                if start_h <= hour < end_h:
                    window_counts[w_label].append(obs)
                    break

        peak_period = "Insufficient observations for peak-period analysis."
        max_slot_score = -1
        best_peak_window = None

        for w_label, start_h, end_h in self.config.time_windows:
            obs_in_window = window_counts.get(w_label, [])
            if obs_in_window:
                slot_score_obj = self.scorer.evaluate_observations(obs_in_window)
                slot_score = slot_score_obj.score
                slot_level = slot_score_obj.risk_level
                time_distribution.append(
                    TimeRiskSlot(
                        time_window=w_label,
                        average_risk_score=slot_score,
                        risk_level=slot_level,
                        observation_count=len(obs_in_window),
                    )
                )
                if slot_score > max_slot_score and len(obs_in_window) >= 1:
                    max_slot_score = slot_score
                    best_peak_window = w_label
            else:
                # Default slot with 0 observations
                time_distribution.append(
                    TimeRiskSlot(
                        time_window=w_label,
                        average_risk_score=max(10, current_score - 20),
                        risk_level=RiskLevel.LOW,
                        observation_count=0,
                    )
                )

        if obs_count >= 3 and best_peak_window:
            peak_period = best_peak_window

        # Max / Avg Risk Scores
        avg_score = int(round(sum(trend_history) / len(trend_history))) if trend_history else current_score
        max_score = max(trend_history + [current_score])

        # Evaluate Multi-Bus Consensus & Independent Corroboration
        consensus_res = self.consensus_engine.evaluate_observations(cluster)
        unique_buses = consensus_res.unique_bus_count
        confirming_buses = consensus_res.confirming_bus_ids
        consensus_status = consensus_res.status
        consensus_strength = consensus_res.consensus_strength
        consensus_freshness = consensus_res.consensus_freshness

        # Generate Grounded Risk Explanations
        risk_factors = self.explainer.generate_detailed_reasons(
            factors, data_sufficiency, risk_level, unique_bus_count=unique_buses
        )

        # Generate Mitigation Recommendations
        recommendations = self.mitigation_engine.generate_recommendations(
            factors, peak_period, has_road_defect
        )

        return PedestrianHotspot(
            hotspot_id=hotspot_id,
            name=name,
            road_id=road_id,
            road_name=road_name,
            latitude=center_lat,
            longitude=center_lon,
            observation_count=obs_count,
            unique_bus_count=unique_buses,
            confirming_bus_ids=confirming_buses,
            consensus_status=consensus_status,
            consensus_strength=consensus_strength,
            consensus_freshness=consensus_freshness,
            total_pedestrians_observed=total_peds,
            total_vehicles_observed=total_vehs,
            total_proximity_events=total_prox,
            average_risk_score=avg_score,
            maximum_risk_score=max_score,
            current_risk_score=current_score,
            risk_level=risk_level,
            operational_reliability=operational_rel,
            data_sufficiency=data_sufficiency,
            trend=trend,
            trend_history=trend_history,
            peak_period=peak_period,
            time_distribution=time_distribution,
            risk_factors=risk_factors,
            factor_breakdown=factors,
            recommendations=recommendations,
            first_observed=first_obs,
            latest_observed=latest_obs,
            freshness_seconds=freshness_sec,
            source="TESTBED",
            is_simulated_gps=True,
            disclaimer="Prototype risk score based on observed indicators",
        )
