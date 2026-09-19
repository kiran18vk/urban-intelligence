"""
Digital Twin State Engine (SIH 2026 PS 26124).

Prototype Urban Digital Twin for AI-Powered Mobile Sensing.
Maintains persistent representations of Pune testbed roads, traffic corridors,
and detected urban infrastructure.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple

from ai.digital_twin.models import (
    RoadSegment,
    TrafficZone,
    TransitRouteTwin,
    UrbanAsset,
    TwinObservation,
    StateTimelineEntry,
    DigitalTwinSummary,
    FreshnessState,
    ConditionState,
    CongestionLevel,
    AssetType,
)
from ai.digital_twin.updater import (
    haversine_km,
    min_dist_to_segment_km,
    evaluate_freshness,
    evaluate_condition_from_defects,
)


def _get_field(obj: Any, key: str, default: Any = None) -> Any:
    """Helper to access attributes or dict keys transparently."""
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


class DigitalTwinStateEngine:
    """
    Persistent in-memory state engine for the Urban Digital Twin.
    Ingests perception UrbanEvents and updates state representation.
    """

    def __init__(self, data_source: str = "demo_simulation"):
        self.data_source = data_source
        self.roads: Dict[str, RoadSegment] = {}
        self.traffic_zones: Dict[str, TrafficZone] = {}
        self.assets: Dict[str, UrbanAsset] = {}
        self.transit_routes: Dict[str, TransitRouteTwin] = {}
        self.observations: List[TwinObservation] = []
        self.timeline: List[StateTimelineEntry] = []
        self._init_default_testbed()

    def _init_default_testbed(self) -> None:
        """Initializes default Pune/PMPML testbed corridors and infrastructure."""
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Road Segments
        default_roads = [
            RoadSegment(
                id="ROAD-01",
                name="Tilak Road / Shivaji Road Corridor",
                corridor_id="CORR-01",
                coordinates=[(18.5018, 73.8636), (18.5167, 73.8562)],
                condition_state=ConditionState.GOOD.value,
                defect_count=1,
                priority_score=42,
                priority_level="LOW",
                deterioration_index=2.4,
                deterioration_trend="STABLE",
                estimated_cost_inr=9800,
                cost_range_min_inr=8300,
                cost_range_max_inr=12200,
                lifecycle_counts={"DETECTED": 0, "VERIFIED": 1, "PRIORITIZED": 0, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 0},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
            RoadSegment(
                id="ROAD-02",
                name="Fergusson College (FC) Road",
                corridor_id="CORR-02",
                coordinates=[(18.5167, 73.8562), (18.5284, 73.8423)],
                condition_state=ConditionState.GOOD.value,
                defect_count=2,
                priority_score=68,
                priority_level="HIGH",
                deterioration_index=4.8,
                deterioration_trend="SLOWLY_DETERIORATING",
                estimated_cost_inr=24500,
                cost_range_min_inr=20800,
                cost_range_max_inr=30600,
                lifecycle_counts={"DETECTED": 1, "VERIFIED": 0, "PRIORITIZED": 1, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 0},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
            RoadSegment(
                id="ROAD-03",
                name="JM Road - Shivajinagar Junction",
                corridor_id="CORR-02",
                coordinates=[(18.5284, 73.8423), (18.5312, 73.8445)],
                condition_state=ConditionState.EXCELLENT.value,
                defect_count=0,
                priority_score=15,
                priority_level="LOW",
                deterioration_index=1.0,
                deterioration_trend="STABLE",
                estimated_cost_inr=0,
                cost_range_min_inr=0,
                cost_range_max_inr=0,
                lifecycle_counts={"DETECTED": 0, "VERIFIED": 0, "PRIORITIZED": 0, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 2},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
            RoadSegment(
                id="ROAD-04",
                name="Old Pune-Mumbai Hwy (Shivajinagar to Khadki)",
                corridor_id="CORR-03",
                coordinates=[(18.5312, 73.8445), (18.5601, 73.8182)],
                condition_state=ConditionState.DEGRADED.value,
                defect_count=4,
                priority_score=86,
                priority_level="CRITICAL",
                deterioration_index=8.4,
                deterioration_trend="RAPIDLY_DETERIORATING",
                estimated_cost_inr=84000,
                cost_range_min_inr=71400,
                cost_range_max_inr=105000,
                lifecycle_counts={"DETECTED": 1, "VERIFIED": 1, "PRIORITIZED": 1, "REPAIR_ACTION": 1, "RE_OBSERVED": 0, "RESOLVED": 0},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
            RoadSegment(
                id="ROAD-05",
                name="Khadki - Kasarwadi Industrial Highway",
                corridor_id="CORR-04",
                coordinates=[(18.5601, 73.8182), (18.6012, 73.7934)],
                condition_state=ConditionState.GOOD.value,
                defect_count=1,
                priority_score=52,
                priority_level="MEDIUM",
                deterioration_index=3.6,
                deterioration_trend="SLOWLY_DETERIORATING",
                estimated_cost_inr=16800,
                cost_range_min_inr=14200,
                cost_range_max_inr=21000,
                lifecycle_counts={"DETECTED": 0, "VERIFIED": 1, "PRIORITIZED": 0, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 0},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
            RoadSegment(
                id="ROAD-06",
                name="Kasarwadi - Pimpri Chowk Corridor",
                corridor_id="CORR-04",
                coordinates=[(18.6012, 73.7934), (18.6298, 73.7997)],
                condition_state=ConditionState.GOOD.value,
                defect_count=2,
                priority_score=58,
                priority_level="MEDIUM",
                deterioration_index=4.1,
                deterioration_trend="SLOWLY_DETERIORATING",
                estimated_cost_inr=28000,
                cost_range_min_inr=23800,
                cost_range_max_inr=35000,
                lifecycle_counts={"DETECTED": 1, "VERIFIED": 0, "PRIORITIZED": 1, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 0},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
            RoadSegment(
                id="ROAD-07",
                name="Baner - Hinjewadi IT Express Corridor",
                corridor_id="CORR-05",
                coordinates=[(18.5590, 73.7868), (18.5913, 73.7389)],
                condition_state=ConditionState.DEGRADED.value,
                defect_count=3,
                priority_score=78,
                priority_level="HIGH",
                deterioration_index=7.2,
                deterioration_trend="RAPIDLY_DETERIORATING",
                estimated_cost_inr=56000,
                cost_range_min_inr=47600,
                cost_range_max_inr=70000,
                lifecycle_counts={"DETECTED": 1, "VERIFIED": 1, "PRIORITIZED": 1, "REPAIR_ACTION": 0, "RE_OBSERVED": 0, "RESOLVED": 0},
                last_updated=now_iso,
                observation_source=self.data_source,
            ),
        ]
        for r in default_roads:
            self.roads[r.id] = r

        # 2. Traffic Zones
        default_zones = [
            TrafficZone(
                id="ZONE-01",
                name="Swargate Intermodal Hub",
                center_coord=(18.5018, 73.8636),
                radius_km=1.2,
                current_density="MEDIUM",
                congestion_level=CongestionLevel.MEDIUM.value,
                vehicle_count=18,
                average_observed_speed_kmh=24.0,
                estimated_delay_min=4.5,
                last_updated=now_iso,
            ),
            TrafficZone(
                id="ZONE-02",
                name="FC Road Commercial Zone",
                center_coord=(18.5284, 73.8423),
                radius_km=1.0,
                current_density="MEDIUM",
                congestion_level=CongestionLevel.MEDIUM.value,
                vehicle_count=22,
                average_observed_speed_kmh=20.0,
                estimated_delay_min=6.0,
                last_updated=now_iso,
            ),
            TrafficZone(
                id="ZONE-03",
                name="Shivajinagar Station Node",
                center_coord=(18.5312, 73.8445),
                radius_km=1.2,
                current_density="LOW",
                congestion_level=CongestionLevel.LOW.value,
                vehicle_count=9,
                average_observed_speed_kmh=32.0,
                estimated_delay_min=1.2,
                last_updated=now_iso,
            ),
            TrafficZone(
                id="ZONE-04",
                name="Pimpri Industrial & Metro Node",
                center_coord=(18.6298, 73.7997),
                radius_km=1.5,
                current_density="HIGH",
                congestion_level=CongestionLevel.HIGH.value,
                vehicle_count=38,
                average_observed_speed_kmh=14.0,
                estimated_delay_min=17.5,
                last_updated=now_iso,
            ),
            TrafficZone(
                id="ZONE-05",
                name="Hinjewadi Tech Hub Entry",
                center_coord=(18.5913, 73.7389),
                radius_km=2.0,
                current_density="HIGH",
                congestion_level=CongestionLevel.HIGH.value,
                vehicle_count=42,
                average_observed_speed_kmh=12.0,
                estimated_delay_min=21.0,
                last_updated=now_iso,
            ),
        ]
        for z in default_zones:
            self.traffic_zones[z.id] = z

        # 3. Urban Assets
        default_assets = [
            UrbanAsset(
                id="ASSET-01",
                asset_type=AssetType.TRAFFIC_SIGNAL.value,
                name="FC Road - Goodluck Chowk Signal",
                location=(18.5245, 73.8415),
                condition="OPERATIONAL",
                defect_count=0,
                confidence=0.96,
                operational_confidence=0.94,
                last_inspected=now_iso,
            ),
            UrbanAsset(
                id="ASSET-02",
                asset_type=AssetType.DIVIDER.value,
                name="Shivajinagar Flyover Median Barrier",
                location=(18.5310, 73.8440),
                condition="GOOD",
                defect_count=0,
                confidence=0.92,
                operational_confidence=0.88,
                last_inspected=now_iso,
            ),
            UrbanAsset(
                id="ASSET-03",
                asset_type=AssetType.ZEBRA_CROSSING.value,
                name="Swargate Bus Stand Pedestrian Crosswalk",
                location=(18.5020, 73.8630),
                condition="FAIR",
                defect_count=1,
                confidence=0.89,
                operational_confidence=0.85,
                last_inspected=now_iso,
            ),
            UrbanAsset(
                id="ASSET-04",
                asset_type=AssetType.TRAFFIC_SIGN.value,
                name="Old Pune-Mumbai Hwy Speed Limit 50 Sign",
                location=(18.5550, 73.8220),
                condition="OPERATIONAL",
                defect_count=0,
                confidence=0.95,
                operational_confidence=0.92,
                last_inspected=now_iso,
            ),
            UrbanAsset(
                id="ASSET-05",
                asset_type=AssetType.STREETLIGHT.value,
                name="Kasarwadi Metro Corridor Solar Mast #12",
                location=(18.6010, 73.7930),
                condition="OPERATIONAL",
                defect_count=0,
                confidence=0.90,
                operational_confidence=0.86,
                last_inspected=now_iso,
            ),
        ]
        for a in default_assets:
            self.assets[a.id] = a

        # Initial timeline entries
        self.timeline.append(
            StateTimelineEntry(
                timestamp=now_iso,
                title="Digital Twin Initialized",
                description="Pune Urban Mobility Testbed (PMPML) digital twin baseline established.",
                entity_id="SYSTEM",
                event_type="SYSTEM_INIT",
                severity="LOW",
            )
        )

    def find_nearest_road(self, lat: float, lon: float) -> Optional[RoadSegment]:
        """Finds nearest road segment to the given coordinates within threshold (5 km)."""
        best_road: Optional[RoadSegment] = None
        min_dist = 5.0  # max 5 km cutoff
        for r in self.roads.values():
            d = min_dist_to_segment_km((lat, lon), r.coordinates)
            if d < min_dist:
                min_dist = d
                best_road = r
        return best_road

    def find_nearest_traffic_zone(self, lat: float, lon: float) -> Optional[TrafficZone]:
        """Finds nearest traffic zone to coordinates within zone radius."""
        best_zone: Optional[TrafficZone] = None
        min_dist = float("inf")
        for z in self.traffic_zones.values():
            d = haversine_km(lat, lon, z.center_coord[0], z.center_coord[1])
            if d <= z.radius_km and d < min_dist:
                min_dist = d
                best_zone = z
        return best_zone

    def ingest_urban_event(self, event: Any) -> Optional[TwinObservation]:
        """
        Updates the Digital Twin state based on an incoming perception UrbanEvent.
        """
        event_id = _get_field(event, "event_id", "")
        event_type = _get_field(event, "event_type", "UNKNOWN")
        bus_id = _get_field(event, "bus_id", "PMP-BUS-001")
        camera_id = _get_field(event, "camera_id", "CAM-FRONT-01")
        timestamp = _get_field(event, "timestamp", datetime.now(timezone.utc).isoformat())
        severity = _get_field(event, "severity", "LOW")
        raw_conf = float(_get_field(event, "confidence", 1.0))

        # Operational confidence ($C_{op} <= C_{raw}$)
        op_conf = _get_field(event, "operational_confidence")
        if op_conf is None:
            rel_obj = _get_field(event, "reliability")
            if rel_obj:
                op_conf = float(_get_field(rel_obj, "operational_confidence", raw_conf))
            else:
                op_conf = raw_conf
        op_conf = min(float(op_conf), raw_conf)

        rel_dict: Dict[str, Any] = {}
        rel_obj = _get_field(event, "reliability")
        if rel_obj:
            if hasattr(rel_obj, "to_dict"):
                rel_dict = rel_obj.to_dict()
            elif isinstance(rel_obj, dict):
                rel_dict = rel_obj

        # Extract GPS
        gps_obj = _get_field(event, "gps")
        lat = 18.5204
        lon = 73.8567
        if gps_obj:
            lat = float(_get_field(gps_obj, "latitude", lat))
            lon = float(_get_field(gps_obj, "longitude", lon))

        now_iso = datetime.now(timezone.utc).isoformat()
        entity_id = "UNKNOWN"
        entity_type = "unknown"

        # 1. Road Damage Events (Pothole / Crack)
        if event_type in ("ROAD_POTHOLE", "ROAD_CRACK"):
            nearest_road = self.find_nearest_road(lat, lon)
            if nearest_road:
                entity_id = nearest_road.id
                entity_type = "road"
                nearest_road.defect_count += 1
                nearest_road.condition_state = evaluate_condition_from_defects(nearest_road.defect_count)
                nearest_road.latest_observation_id = event_id
                nearest_road.latest_event_type = event_type
                nearest_road.observation_confidence = raw_conf
                nearest_road.operational_confidence = op_conf
                nearest_road.reliability_score = float(rel_dict.get("score", 1.0))
                nearest_road.last_updated = now_iso
                nearest_road.freshness = FreshnessState.FRESH.value

                self.timeline.append(
                    StateTimelineEntry(
                        timestamp=str(timestamp),
                        title=f"{event_type.replace('_', ' ').title()} on {nearest_road.name}",
                        description=f"Defect detected by {bus_id} ({camera_id}). Condition updated to {nearest_road.condition_state}.",
                        entity_id=nearest_road.id,
                        event_type=event_type,
                        severity=severity,
                    )
                )

        # 2. Traffic Events
        elif event_type in ("TRAFFIC_CONGESTION", "VEHICLE_DETECTED"):
            nearest_zone = self.find_nearest_traffic_zone(lat, lon)
            if nearest_zone:
                entity_id = nearest_zone.id
                entity_type = "traffic_zone"
                nearest_zone.vehicle_count += 1
                if nearest_zone.vehicle_count > 30:
                    nearest_zone.congestion_level = CongestionLevel.HIGH.value
                    nearest_zone.current_density = "HIGH"
                    nearest_zone.estimated_delay_min = 15.0
                elif nearest_zone.vehicle_count > 15:
                    nearest_zone.congestion_level = CongestionLevel.MEDIUM.value
                    nearest_zone.current_density = "MEDIUM"
                    nearest_zone.estimated_delay_min = 6.0
                nearest_zone.last_updated = now_iso
                nearest_zone.freshness = FreshnessState.FRESH.value

                self.timeline.append(
                    StateTimelineEntry(
                        timestamp=str(timestamp),
                        title=f"Traffic Density Update at {nearest_zone.name}",
                        description=f"Observation from {bus_id}. Congestion level: {nearest_zone.congestion_level}.",
                        entity_id=nearest_zone.id,
                        event_type=event_type,
                        severity=severity,
                    )
                )

        # 3. Incident Events
        elif event_type in ("HIT_AND_RUN", "PEDESTRIAN_RISK", "POTENTIAL_COLLISION"):
            nearest_road = self.find_nearest_road(lat, lon)
            entity_id = nearest_road.id if nearest_road else "INCIDENT-LOC"
            entity_type = "incident"
            if nearest_road:
                nearest_road.last_updated = now_iso
                nearest_road.freshness = FreshnessState.FRESH.value

            self.timeline.append(
                StateTimelineEntry(
                    timestamp=str(timestamp),
                    title=f"Potential Incident Alert near {entity_id}",
                    description=f"{event_type.replace('_', ' ').title()} recorded by {bus_id} ({camera_id}). Operational Confidence: {op_conf:.2f}.",
                    entity_id=entity_id,
                    event_type=event_type,
                    severity=severity,
                )
            )

        # Create Observation Record
        obs = TwinObservation(
            observation_id=f"TWIN-OBS-{len(self.observations) + 1:04d}",
            entity_id=entity_id,
            entity_type=entity_type,
            event_type=event_type,
            timestamp=str(timestamp),
            gps={"latitude": lat, "longitude": lon, "is_simulated": True},
            raw_confidence=raw_conf,
            operational_confidence=op_conf,
            reliability=rel_dict,
            source_bus=bus_id,
            source_camera=camera_id,
            evidence_reference=_get_field(_get_field(event, "evidence", {}), "image_path"),
        )
        self.observations.append(obs)
        return obs

    def ingest_events_batch(self, events: List[Any]) -> int:
        """Ingests a collection of events."""
        count = 0
        for ev in events:
            if self.ingest_urban_event(ev):
                count += 1
        return count

    def refresh_freshness(self) -> None:
        """Recalculates freshness state for all digital twin entities."""
        now = datetime.now(timezone.utc)
        for r in self.roads.values():
            r.freshness = evaluate_freshness(r.last_updated, now)
        for z in self.traffic_zones.values():
            z.freshness = evaluate_freshness(z.last_updated, now)
        for a in self.assets.values():
            a.freshness = evaluate_freshness(a.last_inspected, now)

    def get_summary(self, active_buses_count: int = 11) -> DigitalTwinSummary:
        """Returns the high-level summary of the digital twin."""
        self.refresh_freshness()
        active_defects = sum(r.defect_count for r in self.roads.values())
        congested_zones = sum(
            1 for z in self.traffic_zones.values() if z.congestion_level in ("MEDIUM", "HIGH")
        )

        return DigitalTwinSummary(
            generated_at=datetime.now(timezone.utc).isoformat(),
            data_source=self.data_source,
            testbed="Pune Urban Mobility Testbed (PMPML)",
            active_buses=active_buses_count,
            roads_observed=len(self.roads),
            active_defects=active_defects,
            congested_zones=congested_zones,
            recent_incidents=sum(1 for t in self.timeline if "Incident" in t.title),
            observations_count=len(self.observations),
            timeline=list(reversed(self.timeline[-20:])),  # latest 20 events
            roads=list(self.roads.values()),
            traffic_zones=list(self.traffic_zones.values()),
            assets=list(self.assets.values()),
        )

    def get_roads(self) -> List[Dict[str, Any]]:
        self.refresh_freshness()
        return [r.to_dict() for r in self.roads.values()]

    def get_traffic_zones(self) -> List[Dict[str, Any]]:
        self.refresh_freshness()
        return [z.to_dict() for z in self.traffic_zones.values()]

    def get_assets(self) -> List[Dict[str, Any]]:
        self.refresh_freshness()
        return [a.to_dict() for a in self.assets.values()]

    def get_observations(self, entity_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if entity_id:
            return [o.to_dict() for o in self.observations if o.entity_id == entity_id]
        return [o.to_dict() for o in self.observations]

    def get_entity(self, entity_id: str) -> Optional[Dict[str, Any]]:
        self.refresh_freshness()
        if entity_id in self.roads:
            return {"type": "road", "data": self.roads[entity_id].to_dict()}
        if entity_id in self.traffic_zones:
            return {"type": "traffic_zone", "data": self.traffic_zones[entity_id].to_dict()}
        if entity_id in self.assets:
            return {"type": "asset", "data": self.assets[entity_id].to_dict()}
        return None
