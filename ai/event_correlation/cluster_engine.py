"""
Spatial-Temporal Clustering Engine for Generic Multi-Bus Event Correlation.
Groups UrbanEvents by event_type, spatial proximity (Haversine), and temporal windows.
"""
from typing import Any, Dict, List, Optional, Tuple
import datetime
import hashlib
import time

from ai.event_correlation.config import EventCorrelationConfig, DEFAULT_CORRELATION_CONFIG
from ai.event_correlation.confidence import (
    haversine_distance,
    calculate_correlation_strength,
    determine_correlation_level,
    calculate_canonical_location,
    aggregate_confidences,
    aggregate_severity,
    determine_freshness,
    determine_status,
)
from ai.event_correlation.explain import generate_correlation_explanation
from ai.event_correlation.models import CorrelatedEvent


def parse_timestamp_to_seconds(ts: Any) -> float:
    """Parses various timestamp formats (ISO string, int, float) to unix epoch seconds."""
    if ts is None:
        return time.time()
    if isinstance(ts, (int, float)):
        return float(ts)
    if isinstance(ts, str):
        try:
            # Handle ISO string
            dt = datetime.datetime.fromisoformat(ts.replace("Z", "+00:00"))
            return dt.timestamp()
        except Exception:
            try:
                return float(ts)
            except Exception:
                return time.time()
    return time.time()


def extract_event_coords(ev: Any) -> Tuple[float, float, bool]:
    """Extracts latitude, longitude, and is_simulated from an event."""
    if hasattr(ev, "gps"):
        lat = ev.gps.latitude if hasattr(ev.gps, "latitude") else ev.gps.get("latitude", 18.520430)
        lon = ev.gps.longitude if hasattr(ev.gps, "longitude") else ev.gps.get("longitude", 73.856744)
        is_sim = ev.gps.is_simulated if hasattr(ev.gps, "is_simulated") else ev.gps.get("is_simulated", True)
    elif isinstance(ev, dict) and "latitude" in ev:
        lat = ev["latitude"]
        lon = ev["longitude"]
        is_sim = ev.get("is_simulated", True)
    elif isinstance(ev, dict) and "gps" in ev and isinstance(ev["gps"], dict):
        lat = ev["gps"].get("latitude", 18.520430)
        lon = ev["gps"].get("longitude", 73.856744)
        is_sim = ev["gps"].get("is_simulated", True)
    else:
        lat, lon, is_sim = 18.520430, 73.856744, True
    return lat, lon, is_sim


def extract_event_id(ev: Any) -> str:
    """Extracts the unique event ID."""
    if hasattr(ev, "event_id"):
        return str(ev.event_id)
    if isinstance(ev, dict) and "event_id" in ev:
        return str(ev["event_id"])
    return f"EVT-{id(ev)}"


def extract_bus_id(ev: Any) -> str:
    """Extracts bus ID from the event."""
    if hasattr(ev, "bus_id"):
        return str(ev.bus_id)
    if isinstance(ev, dict) and "bus_id" in ev:
        return str(ev["bus_id"])
    return "UNKNOWN-BUS"


def extract_event_type(ev: Any) -> str:
    """Extracts event type from the event."""
    if hasattr(ev, "event_type"):
        return str(ev.event_type)
    if isinstance(ev, dict) and "event_type" in ev:
        return str(ev["event_type"])
    return "UNKNOWN_EVENT"


def extract_evidence_path(ev: Any) -> Optional[str]:
    """Extracts evidence image/video path from the event."""
    if hasattr(ev, "evidence"):
        ev_obj = ev.evidence
        if hasattr(ev_obj, "image_path") and ev_obj.image_path:
            return ev_obj.image_path
        if hasattr(ev_obj, "crop_path") and ev_obj.crop_path:
            return ev_obj.crop_path
    if isinstance(ev, dict):
        if "evidence" in ev and isinstance(ev["evidence"], dict):
            return ev["evidence"].get("image_path") or ev["evidence"].get("crop_path")
        if "evidence_reference" in ev:
            return ev["evidence_reference"]
    return None


class EventClusterEngine:
    """
    Deterministic clustering engine for multi-bus urban events.
    """

    def __init__(self, config: Optional[EventCorrelationConfig] = None):
        self.config = config or DEFAULT_CORRELATION_CONFIG

    def cluster_events(
        self,
        events: List[Any],
        reference_time: Optional[float] = None
    ) -> List[CorrelatedEvent]:
        """
        Clusters input events and converts each cluster into a CorrelatedEvent.
        """
        if not events:
            return []

        current_time = reference_time if reference_time is not None else time.time()

        # 1. Group by event_type first (strict separation across distinct condition types)
        by_type: Dict[str, List[Any]] = {}
        for ev in events:
            etype = extract_event_type(ev)
            by_type.setdefault(etype, []).append(ev)

        raw_clusters: List[List[Any]] = []

        # 2. Perform spatial-temporal clustering per event type
        for etype, type_events in by_type.items():
            temp_window_seconds = self.config.get_temporal_window_hours(etype) * 3600.0
            spatial_radius = self.config.spatial_radius_meters

            # Sort events chronologically
            sorted_events = sorted(
                type_events,
                key=lambda e: parse_timestamp_to_seconds(getattr(e, "timestamp", None) or (e.get("timestamp") if isinstance(e, dict) else 0))
            )

            type_clusters: List[List[Any]] = []
            for ev in sorted_events:
                ev_lat, ev_lon, _ = extract_event_coords(ev)
                ev_time = parse_timestamp_to_seconds(getattr(ev, "timestamp", None) or (e.get("timestamp") if isinstance(ev, dict) else 0))

                best_cluster_idx = -1
                best_dist = float("inf")

                for c_idx, cluster in enumerate(type_clusters):
                    # Check temporal window against cluster bounds
                    cluster_times = [
                        parse_timestamp_to_seconds(getattr(item, "timestamp", None) or (item.get("timestamp") if isinstance(item, dict) else 0))
                        for item in cluster
                    ]
                    min_time = min(cluster_times)
                    max_time = max(cluster_times)

                    if abs(ev_time - min_time) > temp_window_seconds and abs(ev_time - max_time) > temp_window_seconds:
                        continue

                    # Check spatial distance to cluster centroid
                    c_lat, c_lon, _ = calculate_canonical_location(cluster)
                    dist = haversine_distance(ev_lat, ev_lon, c_lat, c_lon)

                    if dist <= spatial_radius and dist < best_dist:
                        best_dist = dist
                        best_cluster_idx = c_idx

                if best_cluster_idx != -1:
                    type_clusters[best_cluster_idx].append(ev)
                else:
                    type_clusters.append([ev])

            raw_clusters.extend(type_clusters)

        # 3. Transform raw clusters into CorrelatedEvent domain objects
        correlated_events: List[CorrelatedEvent] = []

        # Sort raw clusters deterministically by (event_type, earliest_time, first_event_id)
        def cluster_sort_key(cl: List[Any]):
            first_time = min(
                parse_timestamp_to_seconds(getattr(item, "timestamp", None) or (item.get("timestamp") if isinstance(item, dict) else 0))
                for item in cl
            )
            return (extract_event_type(cl[0]), first_time, extract_event_id(cl[0]))

        raw_clusters.sort(key=cluster_sort_key)

        for idx, cluster in enumerate(raw_clusters, start=1):
            etype = extract_event_type(cluster[0])
            source_ids = [extract_event_id(item) for item in cluster]
            bus_ids = sorted(list(set(extract_bus_id(item) for item in cluster)))
            unique_bus_count = len(bus_ids)
            obs_count = len(cluster)

            # Canonical location
            can_lat, can_lon, is_sim = calculate_canonical_location(cluster)

            # Timestamps
            timestamps = [
                parse_timestamp_to_seconds(getattr(item, "timestamp", None) or (item.get("timestamp") if isinstance(item, dict) else 0))
                for item in cluster
            ]
            first_time = min(timestamps)
            last_time = max(timestamps)
            time_span_seconds = max(0.0, last_time - first_time)

            first_iso = datetime.datetime.fromtimestamp(first_time, datetime.timezone.utc).isoformat()
            last_iso = datetime.datetime.fromtimestamp(last_time, datetime.timezone.utc).isoformat()

            # Max distance within cluster from canonical location
            max_dist = 0.0
            for item in cluster:
                ilat, ilon, _ = extract_event_coords(item)
                d = haversine_distance(ilat, ilon, can_lat, can_lon)
                if d > max_dist:
                    max_dist = d

            # Confidence aggregations
            conf_metrics = aggregate_confidences(cluster)
            sev = aggregate_severity(cluster)
            corr_strength = calculate_correlation_strength(unique_bus_count, self.config)
            corr_level = determine_correlation_level(unique_bus_count, self.config)
            freshness = determine_freshness(last_time, current_time, self.config).value
            status = determine_status(last_time, current_time, config=self.config).value

            # Evidence references
            evidence_refs = []
            for item in cluster:
                ref = extract_evidence_path(item)
                if ref and ref not in evidence_refs:
                    evidence_refs.append(ref)

            # Explanation
            explanation = generate_correlation_explanation(
                event_type=etype,
                independent_bus_count=unique_bus_count,
                observation_count=obs_count,
                bus_ids=bus_ids,
                max_distance_meters=max_dist,
                time_span_seconds=time_span_seconds,
                correlation_level_str=corr_level.value,
            )

            # Deterministic Correlation ID: CORR-000001 or hash-based
            corr_id = f"CORR-{idx:06d}"

            # Canonical location dict
            can_loc = {
                "latitude": round(can_lat, 6),
                "longitude": round(can_lon, 6),
                "is_simulated": is_sim,
                "max_spread_meters": round(max_dist, 1),
            }

            # Optional road_id or zone_id inference if available
            road_id = None
            zone_id = None
            for item in cluster:
                if hasattr(item, "detection") and isinstance(item.detection, dict):
                    if "road_id" in item.detection and not road_id:
                        road_id = item.detection["road_id"]
                    if "zone_id" in item.detection and not zone_id:
                        zone_id = item.detection["zone_id"]
                elif isinstance(item, dict):
                    if "road_id" in item and not road_id:
                        road_id = item["road_id"]
                    if "zone_id" in item and not zone_id:
                        zone_id = item["zone_id"]

            correlated_events.append(
                CorrelatedEvent(
                    correlation_id=corr_id,
                    event_type=etype,
                    canonical_location=can_loc,
                    latitude=can_lat,
                    longitude=can_lon,
                    first_observed_at=first_iso,
                    last_observed_at=last_iso,
                    observation_count=obs_count,
                    independent_bus_count=unique_bus_count,
                    bus_ids=bus_ids,
                    source_event_ids=source_ids,
                    severity=sev,
                    max_raw_confidence=conf_metrics["max_raw_confidence"],
                    max_operational_confidence=conf_metrics["max_operational_confidence"],
                    average_operational_confidence=conf_metrics["average_operational_confidence"],
                    average_reliability=conf_metrics["average_reliability"],
                    correlation_strength=corr_strength,
                    correlation_level=corr_level,
                    freshness=freshness,
                    evidence_references=evidence_refs,
                    status=status,
                    explanation=explanation,
                    is_simulated=is_sim,
                    road_id=road_id,
                    zone_id=zone_id,
                )
            )

        return correlated_events
