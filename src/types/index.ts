export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Reliability = 'verified' | 'probable' | 'unverified';
export type EventStatus = 'new' | 'reviewing' | 'confirmed' | 'dismissed';
export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'escalated';

export type EventType =
  | 'pothole'
  | 'waterlogging'
  | 'congestion'
  | 'accident'
  | 'signal_violation'
  | 'wrong_side'
  | 'overspeeding'
  | 'streetlight_out';

export interface GPSCoord {
  lat: number;
  lng: number;
}

export interface Bus {
  id: string;
  route: string;
  driver: string;
  location: GPSCoord;
  speed: number;
  status: 'active' | 'idle' | 'offline';
  lastUpdate: string;
  cameras: number;
  eventsToday: number;
}

export interface DetectionEvent {
  id: string;
  type: EventType;
  busId: string;
  camera: string;
  timestamp: string;
  location: GPSCoord;
  address: string;
  confidence: number;
  reliability: Reliability;
  reliabilityScore: number;
  severity: Severity;
  status: EventStatus;
  thumbnail?: string;
  description: string;
}

export interface RoadDefect {
  id: string;
  type: 'pothole' | 'crack' | 'waterlogging' | 'sinkhole' | 'surface_raveling';
  location: GPSCoord;
  address: string;
  detectedAt: string;
  severity: Severity;
  confidence: number;
  busId: string;
  status: 'detected' | 'verified' | 'scheduled' | 'repaired';
  sizeEstimate: string;
  repairCost?: number;
  reports: number;
  maintenancePriority?: {
    score: number;
    classification: 'Critical Priority' | 'High Priority' | 'Medium Priority' | 'Low Priority';
    defectSeverityScore: number;
    trafficLoad: number;
    recurrenceScore: number;
    roadImportanceScore: number;
  };
  deteriorationIndex?: {
    currentCondition: string;
    previousCondition: string;
    deteriorationRatePct: number;
    trend: 'Rapid Deterioration' | 'Moderate Deterioration' | 'Slow Deterioration' | 'Stable';
    preventiveIndication: string;
  };
  costEstimate?: {
    affectedLengthMeters: number;
    affectedAreaSqM: number;
    repairCategory: 'Minor Repair' | 'Moderate Repair' | 'Major Repair' | 'Full Rehabilitation';
    estimatedQuantity: string;
    estimatedCostINR: number;
    unitRateINR: number;
  };
}

export interface TrafficCongestion {
  id: string;
  location: GPSCoord;
  roadName: string;
  area: string;
  severity: Severity;
  avgSpeed: number;
  freeFlowSpeed: number;
  density: number;
  queueLength: number;
  duration: number;
  status: 'building' | 'stable' | 'clearing';
  trend: 'increasing' | 'stable' | 'decreasing';
  detectedAt: string;
}

export interface Incident {
  id: string;
  type: EventType;
  busId: string;
  camera: string;
  timestamp: string;
  location: GPSCoord;
  address: string;
  confidence: number;
  severity: Severity;
  status: IncidentStatus;
  videoUrl?: string;
  thumbnail: string;
  vehiclePlate: string;
  plateOcrConfidence: number;
  vehicleType: string;
  vehicleColor: string;
  description: string;
  assignedTo?: string;
  reportedBy: string;
}

export interface MapFilter {
  buses: boolean;
  potholes: boolean;
  waterlogging: boolean;
  congestion: boolean;
  incidents: boolean;
}

// Phase 4: GIS Intelligence Integration - UrbanEvent types
export type UrbanEventTypeString =
  | 'ROAD_POTHOLE'
  | 'ROAD_CRACK'
  | 'TRAFFIC_CONGESTION'
  | 'VEHICLE_DETECTED'
  | 'PEDESTRIAN_RISK'
  | 'ANPR_DETECTION'
  | 'HIT_AND_RUN';

export type UrbanSeverityString = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UrbanEventGPS {
  latitude: number;
  longitude: number;
  is_simulated: boolean;
  provider_source: string;
}

export interface UrbanEventEvidence {
  image_path?: string | null;
  video_path?: string | null;
  crop_path?: string | null;
}

// Phase 5: Observation Reliability Intelligence
export interface UrbanEventReliability {
  score: number;
  raw_confidence: number;
  operational_confidence: number;
  factors: Record<string, number>;
  unavailable_factors: string[];
  reasons: string[];
  is_measured: boolean;
}

export interface UrbanEvent {
  event_id: string;
  event_type: UrbanEventTypeString;
  bus_id: string;
  camera_id: string;
  timestamp: string;
  gps: UrbanEventGPS;
  confidence: number; // Raw AI model detection confidence
  operational_confidence?: number; // Reliability-adjusted operational confidence
  severity: UrbanSeverityString;
  status: string;
  evidence: UrbanEventEvidence;
  detection: Record<string, any>;
  reliability?: UrbanEventReliability;
  frame_index?: number | null;
  notes?: string | null;
}

// Phase 6: Incident Intelligence & Hit-and-Run Workflow
export type IncidentTypeString =
  | 'POTENTIAL_COLLISION'
  | 'SUSPICIOUS_PROXIMITY'
  | 'SUDDEN_DEVIATION'
  | 'HIT_AND_RUN_SUSPECT';

export type IncidentStatusString = 'NEW' | 'REVIEW' | 'ACTIONED' | 'CLOSED';

export interface IncidentTrigger {
  trigger_type: IncidentTypeString;
  track_id?: number | null;
  timestamp: number;
  frame_index: number;
  confidence: number;
  description: string;
  trajectory_deviation?: number | null;
  proximity_distance_px?: number | null;
  persistence_frames: number;
  metadata?: Record<string, any>;
}

export interface IncidentRecord {
  incident_id: string;
  incident_type: IncidentTypeString;
  status: IncidentStatusString;
  severity: UrbanSeverityString;
  bus_id: string;
  camera_id: string;
  timestamp: number | string;
  gps: UrbanEventGPS;
  track_id?: number | null;
  vehicle_class: string;
  plate_text?: string | null;
  plate_confidence?: number | null;
  anpr_status: string;
  confidence: number; // Raw AI confidence
  operational_confidence: number; // Reliability-adjusted confidence
  reliability?: UrbanEventReliability | null;
  evidence: UrbanEventEvidence;
  detection_metadata?: Record<string, any>;
  trigger_info?: IncidentTrigger | null;
  notes: string;
  is_demo: boolean;
}

// Phase 7: Fleet & Traffic Intelligence Analytics
export interface FleetMetrics {
  total_buses: number;
  active_buses: number;
  reporting_buses: number;
  active_routes_count: number;
  fleet_utilization_pct: number;
}

export interface EventMetrics {
  total_events: number;
  road_defects: number;
  traffic_events: number;
  incidents: number;
  anpr_detections: number;
  high_critical_count: number;
  low_reliability_count: number;
}

export interface VehicleClassDistribution {
  class_name: string;
  count: number;
  percentage: number;
}

export interface TrafficMetrics {
  total_vehicles_observed: number;
  vehicle_distribution: VehicleClassDistribution[];
  average_density_level: string;
  peak_corridor: string;
  high_congestion_zones_count: number;
}

export interface CorridorMetric {
  corridor_id: string;
  corridor_name: string;
  event_count: number;
  road_defects: number;
  traffic_events: number;
  incidents: number;
  observed_congestion: string;
  congestion_factor: number;
  baseline_transit_time_min: number;
  estimated_delay_min: number;
  low_reliability_count: number;
  average_reliability: number;
  is_demo_estimate: boolean;
}

export interface ReliabilitySummary {
  total_observations: number;
  low_reliability_count: number;
  average_reliability_score: number;
  high_severity_low_reliability_count: number;
}

export interface AnalyticsSummary {
  generated_at: string;
  data_source: 'live_backend' | 'demo_simulation' | 'mixed' | string;
  fleet: FleetMetrics;
  events: EventMetrics;
  traffic: TrafficMetrics;
  corridors: CorridorMetric[];
  reliability: ReliabilitySummary;
  disclaimer: string;
}

// Final Phase: Urban Digital Twin Layer
export type FreshnessStateString = 'FRESH' | 'AGING' | 'STALE';
export type ConditionStateString = 'EXCELLENT' | 'GOOD' | 'DEGRADED' | 'CRITICAL';
export type DigitalTwinAssetTypeString =
  | 'ROAD'
  | 'TRAFFIC_SIGNAL'
  | 'DIVIDER'
  | 'ZEBRA_CROSSING'
  | 'TRAFFIC_SIGN'
  | 'STREETLIGHT'
  | 'OTHER';

export interface TwinRoadSegment {
  id: string;
  name: string;
  corridor_id: string;
  coordinates: [number, number][]; // [lat, lng]
  condition_state: ConditionStateString;
  defect_count: number;
  latest_observation_id?: string | null;
  latest_event_type?: string | null;
  observation_confidence: number;
  operational_confidence: number;
  reliability_score: number;
  freshness: FreshnessStateString;
  last_updated: string;
  observation_source: string;
  is_simulated: boolean;
}

export interface TwinTrafficZone {
  id: string;
  name: string;
  center_coord: [number, number]; // [lat, lng]
  radius_km: number;
  current_density: string;
  congestion_level: 'LOW' | 'MEDIUM' | 'HIGH';
  vehicle_count: number;
  average_observed_speed_kmh: number;
  estimated_delay_min: number;
  freshness: FreshnessStateString;
  last_updated: string;
  is_simulated: boolean;
}

export interface TwinUrbanAsset {
  id: string;
  asset_type: DigitalTwinAssetTypeString;
  name: string;
  location: [number, number]; // [lat, lng]
  condition: string;
  defect_count: number;
  confidence: number;
  operational_confidence: number;
  freshness: FreshnessStateString;
  last_inspected: string;
  is_simulated: boolean;
}

export interface TwinObservation {
  observation_id: string;
  entity_id: string;
  entity_type: string;
  event_type: string;
  timestamp: string;
  gps: { latitude: number; longitude: number; is_simulated: boolean };
  raw_confidence: number;
  operational_confidence: number;
  reliability?: Record<string, any>;
  source_bus: string;
  source_camera: string;
  evidence_reference?: string | null;
}

export interface StateTimelineEntry {
  timestamp: string;
  title: string;
  description: string;
  entity_id: string;
  event_type: string;
  severity: string;
  is_simulated: boolean;
}

export interface DigitalTwinSummary {
  generated_at: string;
  data_source: 'live_backend' | 'demo_simulation' | 'mixed' | string;
  testbed: string;
  disclaimer: string;
  active_buses: number;
  roads_observed: number;
  active_defects: number;
  congested_zones: number;
  recent_incidents: number;
  observations_count: number;
  timeline: StateTimelineEntry[];
  roads: TwinRoadSegment[];
  traffic_zones: TwinTrafficZone[];
  assets: TwinUrbanAsset[];
}

export interface SimulationResult {
  scenario_type: string;
  target_id: string;
  target_name: string;
  baseline_metrics: Record<string, any>;
  simulated_metrics: Record<string, any>;
  impact_summary: string;
  delta: Record<string, any>;
  formula_used: string;
  disclaimer: string;
}




