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

export type DefectLifecycleStatus =
  | 'DETECTED'
  | 'VERIFIED'
  | 'PRIORITIZED'
  | 'REPAIR_ACTION'
  | 'RE_OBSERVED'
  | 'RESOLVED'
  | 'detected'
  | 'verified'
  | 'prioritized'
  | 'repair_action'
  | 're_observed'
  | 'resolved'
  | 'scheduled'
  | 'repaired';

export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'Low Priority' | 'Medium Priority' | 'High Priority' | 'Critical Priority';
export type DeteriorationRateCategory = 'STABLE' | 'SLOWLY_DETERIORATING' | 'RAPIDLY_DETERIORATING' | 'IMPROVING' | 'Stable' | 'Slow Deterioration' | 'Moderate Deterioration' | 'Rapid Deterioration';

export interface DefectPriorityBreakdown {
  score: number; // 0 - 100
  classification: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | 'Low Priority' | 'Medium Priority' | 'High Priority' | 'Critical Priority';
  defectSeverityScore: number; // 0 - 100
  defectDensityScore: number; // 0 - 100
  trafficLoad: number; // 0 - 100
  recurrenceScore: number; // 0 - 100
  roadImportanceScore: number; // 0 - 100
  explanation: string;
}

export interface DefectDeteriorationIndex {
  index: number; // 0.0 - 10.0
  currentCondition: string;
  previousCondition: string;
  deteriorationRatePct: number;
  trend: 'STABLE' | 'SLOWLY_DETERIORATING' | 'RAPIDLY_DETERIORATING' | 'IMPROVING' | 'Stable' | 'Slow Deterioration' | 'Moderate Deterioration' | 'Rapid Deterioration';
  preventiveIndication: string;
  observationHistoryCount: number;
  isDecisionSupportOnly: boolean;
}

export interface DefectCostEstimate {
  affectedLengthMeters: number;
  affectedAreaSqM: number;
  repairCategory: 'Minor Patch' | 'Crack Seal' | 'Moderate Repair' | 'Major Overlay' | 'Full Reconstruction' | 'Minor Repair' | 'Major Repair' | 'Full Rehabilitation';
  estimatedQuantity: string;
  estimatedCostINR: number;
  costRangeMinINR: number;
  costRangeMaxINR: number;
  unitRateINR: number;
  potholePatchRatePerSqM: number;
  crackSealRatePerM: number;
  disclaimer: string;
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
  status: DefectLifecycleStatus;
  sizeEstimate: string;
  repairCost?: number;
  costRangeMin?: number;
  costRangeMax?: number;
  reports: number;
  lifecycleHistory?: Array<{
    status: DefectLifecycleStatus;
    timestamp: string;
    note?: string;
    actor?: string;
  }>;
  maintenancePriority?: DefectPriorityBreakdown;
  deteriorationIndex?: DefectDeteriorationIndex;
  costEstimate?: DefectCostEstimate;
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
  priority_score?: number; // 0 - 100
  priority_level?: PriorityLevel;
  deterioration_index?: number; // 0.0 - 10.0
  deterioration_trend?: DeteriorationRateCategory;
  estimated_cost_inr?: number;
  cost_range_min_inr?: number;
  cost_range_max_inr?: number;
  lifecycle_counts?: Record<string, number>;
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

// Phase 8: Pedestrian Risk Intelligence & Mitigation Engine Models
export type PedestrianRiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type PedestrianTrendDirection = 'INCREASING' | 'STABLE' | 'DECREASING' | 'INSUFFICIENT_DATA';
export type PedestrianDataSufficiency = 'GOOD' | 'LIMITED' | 'INSUFFICIENT';
export type PedestrianConsensusStatus = 'SINGLE_BUS_OBSERVATION' | 'MULTI_BUS_CORROBORATION' | 'MULTI_BUS_CONSENSUS' | 'INSUFFICIENT';

export interface PedestrianRiskFactor {
  name: string;
  key: string;
  score: number;
  weight: number;
  weighted_contribution: number;
  evidence_text: string;
}

export interface MitigationRecommendation {
  priority: number;
  title: string;
  description: string;
  rationale: string;
  target_scenario: string;
  estimated_score_reduction_points: number;
  requires_authority_review: boolean;
}

export interface TimeRiskSlot {
  time_window: string;
  average_risk_score: number;
  risk_level: PedestrianRiskLevel;
  observation_count: number;
}

export interface PedestrianHotspot {
  hotspot_id: string;
  name: string;
  road_id: string;
  road_name: string;
  latitude: number;
  longitude: number;
  observation_count: number;
  unique_bus_count: number;
  confirming_bus_ids?: string[];
  consensus_status?: PedestrianConsensusStatus;
  consensus_strength?: number;
  consensus_freshness?: string;
  total_pedestrians_observed: number;
  total_vehicles_observed: number;
  total_proximity_events: number;
  average_risk_score: number;
  maximum_risk_score: number;
  current_risk_score: number;
  risk_level: PedestrianRiskLevel;
  operational_reliability: number;
  data_sufficiency: PedestrianDataSufficiency;
  trend: PedestrianTrendDirection;
  trend_history: number[];
  peak_period: string;
  time_distribution: TimeRiskSlot[];
  risk_factors: string[];
  factor_breakdown: PedestrianRiskFactor[];
  recommendations: MitigationRecommendation[];
  first_observed: number;
  latest_observed: number;
  freshness_seconds: number;
  source: string;
  is_simulated_gps: boolean;
  disclaimer: string;
}

export interface PedestrianWhatIfResult {
  hotspot_id: string;
  scenario_type: string;
  scenario_name: string;
  baseline_score: number;
  baseline_level: PedestrianRiskLevel;
  simulated_score: number;
  simulated_level: PedestrianRiskLevel;
  score_delta: number;
  factor_changes: Record<string, string>;
  disclaimer: string;
}

export interface PedestrianSummary {
  total_hotspots: number;
  high_critical_count: number;
  total_risk_observations: number;
  average_risk_score: number;
  peak_observed_period: string;
  increasing_hotspots_count: number;
  generated_at: string;
  single_bus_count?: number;
  multi_bus_corroborated_count?: number;
  multi_bus_consensus_count?: number;
  average_independent_buses?: number;
}

// Edge Store-and-Forward Queue Types
export type EdgeConnectivityState = 'ONLINE' | 'OFFLINE' | 'SYNCING' | 'DEGRADED';
export type EdgeQueueStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'EXPIRED';

export interface QueuedEvent {
  queue_id: string;
  event_id: string;
  event_type: string;
  bus_id: string;
  camera_id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  confidence: number;
  operational_confidence?: number | null;
  reliability?: Record<string, any> | null;
  severity: string;
  payload_reference?: string | null;
  evidence_reference: string;
  created_at: number;
  retry_count: number;
  status: EdgeQueueStatus;
  last_attempt_at?: number | null;
  synced_at?: number | null;
  error_message?: string | null;
}

export interface QueueStatusSummary {
  connectivity: EdgeConnectivityState;
  pending: number;
  syncing: number;
  failed: number;
  synced: number;
  total_queued: number;
  oldest_pending?: number | null;
  last_sync?: number | null;
  queue_capacity: number;
  active_simulation: boolean;
  disclaimer: string;
}

export interface EdgeDeliveryMetrics {
  total_generated: number;
  total_synced: number;
  total_queued: number;
  total_failed: number;
  avg_retry_count: number;
}

// Live AI Fleet Monitor Types
export interface LiveMonitorStream {
  status: 'TEST_STREAM';
  label: string;
  source_type: string;
  media_url: string;
  annotated_url?: string;
  bus_id: string;
  camera_id: string;
  camera_view: string;
  fps_label: string;
  fps_value: number;
  resolution: string;
  disclaimer: string;
}

export interface LiveMonitorAIStatus {
  object_detection: boolean;
  traffic_analysis: boolean;
  road_damage_analysis: boolean;
  pedestrian_risk: boolean;
  reliability_scoring: boolean;
  event_intelligence: boolean;
}

export interface LiveMonitorTrafficObs {
  traffic_density: string;
  vehicles_detected: number;
  crossings_count?: number;
  calibrated_speed: string | null;
  classes: Record<string, number>;
}

export interface LiveMonitorRoadDamageObs {
  defects_count: number;
  detected_classes: string[];
  operational_confidence: number;
  reliability_score: number;
  status_note: string;
  observations: Array<{
    type: string;
    confidence: number;
    operational_confidence: number;
    reliability: number;
  }>;
}

export interface LiveMonitorPedestrianObs {
  risk_level: string;
  risk_score: number;
  factors: string[];
  consensus_level: string;
  independent_buses: number;
  observation_count: number;
  recommendation: string;
}

export interface LiveMonitorReliabilityObs {
  overall_score: number;
  raw_confidence: number;
  operational_confidence: number;
  factors: {
    lighting: number;
    blur: number;
    visibility: number;
    temporal_stability: number;
  };
}

export interface LiveMonitorAnprObs {
  plate_text: string;
  ocr_confidence: number;
  operational_confidence: number;
  track_id: number;
  timestamp: string;
  disclaimer: string;
}

export interface LiveFleetBusStatus {
  bus_id: string;
  connectivity: EdgeConnectivityState;
  events_count: number;
  queued_count: number;
  is_active: boolean;
}

export interface LiveMonitorStatus {
  timestamp: string;
  stream: LiveMonitorStream;
  ai_status: LiveMonitorAIStatus;
  connectivity: {
    state: EdgeConnectivityState;
    pending: number;
    last_sync: string | null;
  };
  current_observations: {
    traffic: LiveMonitorTrafficObs;
    road_damage: LiveMonitorRoadDamageObs;
    pedestrian_risk: LiveMonitorPedestrianObs;
    reliability: LiveMonitorReliabilityObs;
    anpr: LiveMonitorAnprObs;
  };
  fleet_overview: LiveFleetBusStatus[];
  latest_events: Array<{
    event_id: string;
    event_type: string;
    severity: string;
    confidence: number;
    operational_confidence: number;
    reliability: number;
    bus_id: string;
    camera_id: string;
    timestamp: string;
    gps: { latitude: number; longitude: number; is_simulated: boolean };
    description?: string;
  }>;
  summary: {
    buses_monitored: number;
    streams_active: number;
    events_today: number;
    queued_events: number;
  };
}

// Generic Multi-Bus Event Correlation Types
export type CorrelationLevel =
  | 'INSUFFICIENT'
  | 'SINGLE_BUS_OBSERVATION'
  | 'MULTI_BUS_CORROBORATION'
  | 'MULTI_BUS_CONSENSUS';

export type CorrelationStatus = 'ACTIVE' | 'AGING' | 'STALE' | 'RESOLVED';
export type CorrelationFreshness = 'FRESH' | 'AGING' | 'STALE';

export interface CorrelationExplanation {
  event_type: string;
  statement: string;
  spatial_proximity: string;
  temporal_window: string;
  independent_bus_count: number;
  observation_count: number;
  bus_ids: string[];
  correlation_level: string;
  pedestrian_note?: string | null;
  incident_note?: string | null;
  reasoning: string[];
}

export interface CorrelatedEvent {
  correlation_id: string;
  event_type: string;
  canonical_location: {
    latitude: number;
    longitude: number;
    is_simulated: boolean;
    max_spread_meters?: number;
  };
  latitude: number;
  longitude: number;
  first_observed_at: string;
  last_observed_at: string;
  observation_count: number;
  independent_bus_count: number;
  bus_ids: string[];
  source_event_ids: string[];
  severity: string;
  max_raw_confidence: number;
  max_operational_confidence: number;
  average_operational_confidence: number;
  average_reliability: number;
  correlation_strength: number;
  correlation_level: CorrelationLevel;
  freshness: string;
  evidence_references: string[];
  status: CorrelationStatus | string;
  explanation: CorrelationExplanation;
  is_simulated: boolean;
  road_id?: string | null;
  zone_id?: string | null;
}

export interface CorrelationSummary {
  total_correlated_events: number;
  single_bus_events: number;
  multi_bus_corroborated: number;
  multi_bus_consensus: number;
  average_independent_buses: number;
  active_correlations: number;
  aging_correlations: number;
  stale_correlations: number;
  event_type_breakdown: Record<string, number>;
  generated_at: string;
  disclaimer: string;
}

export interface CorrelationSourceAudit {
  correlation_id: string;
  event_type: string;
  correlation_level: string;
  independent_bus_count: number;
  bus_ids: string[];
  observation_count: number;
  source_events: any[];
  explanation: CorrelationExplanation;
}

// Human Review + Model Feedback Workflow Types
export type ReviewDecision = 'CONFIRMED' | 'REJECTED' | 'NEEDS_REVIEW' | 'LABEL_CORRECTED';
export type ReviewStatus = 'PENDING' | 'IN_REVIEW' | 'COMPLETED';
export type ReviewReason =
  | 'TRUE_POSITIVE'
  | 'FALSE_POSITIVE'
  | 'WRONG_EVENT_TYPE'
  | 'LOW_IMAGE_QUALITY'
  | 'OCCLUSION'
  | 'DUPLICATE_EVENT'
  | 'INSUFFICIENT_EVIDENCE'
  | 'LOCATION_MISMATCH'
  | 'TEMPORAL_MISMATCH'
  | 'OTHER';

export type ReviewTargetType =
  | 'URBAN_EVENT'
  | 'ROAD_DEFECT'
  | 'TRAFFIC'
  | 'PEDESTRIAN_RISK'
  | 'INCIDENT'
  | 'ANPR'
  | 'CORRELATED_EVENT';

export interface ReviewRecord {
  review_id: string;
  target_type: ReviewTargetType | string;
  target_id: string;
  event_id?: string | null;
  correlation_id?: string | null;
  reviewer_id?: string | null;
  decision?: ReviewDecision | string | null;
  original_event_type: string;
  corrected_event_type?: string | null;
  original_confidence: number;
  original_operational_confidence: number;
  original_reliability: number;
  severity: string;
  reason?: ReviewReason | string | null;
  notes?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  status: ReviewStatus | string;
  evidence_reference?: string | null;
  source_bus_id?: string | null;
  is_simulated: boolean;
  priority_score?: number;
  priority_rank?: string;
  metadata?: Record<string, any>;
}

export interface FeedbackRecord {
  feedback_id: string;
  review_id: string;
  target_type: string;
  target_id: string;
  event_type: string;
  original_confidence: number;
  operational_confidence: number;
  reliability: number;
  decision: string;
  reason?: string | null;
  corrected_event_type?: string | null;
  reviewer_id: string;
  reviewed_at: string;
  notes?: string | null;
  is_simulated: boolean;
}

export interface ReviewSummary {
  total: number;
  pending: number;
  in_review: number;
  completed: number;
  confirmed: number;
  rejected: number;
  needs_review: number;
  label_corrected: number;
  confirmation_rate: number;
  avg_confidence_confirmed: number;
  avg_confidence_rejected: number;
  avg_reliability_confirmed: number;
  avg_reliability_rejected: number;
  total_feedback_records: number;
  rejection_reasons: Record<string, number>;
  event_type_breakdown: Record<string, number>;
  disclaimer: string;
  generated_at: string;
}

export interface ReviewQueueResponse {
  items: ReviewRecord[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
}

// Feature #7: Authority Alert & Action Center Types
export type AuthorityActionType =
  | 'INSPECT'
  | 'REPAIR'
  | 'TRAFFIC_CONTROL'
  | 'SAFETY_INTERVENTION'
  | 'DISPATCH'
  | 'REOBSERVE';

export type AuthorityActionStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'ACTIONED'
  | 'REOBSERVE'
  | 'CLOSED'
  | 'CANCELLED';

export type AuthorityActionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface ActionHistoryEntry {
  entry_id: string;
  action_id: string;
  from_status: string;
  to_status: string;
  operator: string;
  notes?: string | null;
  timestamp: number;
}

export interface AuthorityAction {
  action_id: string;
  target_id: string;
  target_type: string;
  event_type: string;
  title: string;
  description: string;
  severity: string;
  priority: AuthorityActionPriority | string;
  status: AuthorityActionStatus | string;
  action_type: AuthorityActionType | string;
  assigned_team?: string | null;
  assigned_operator?: string | null;
  source_bus_ids: string[];
  correlation_id?: string | null;
  review_id?: string | null;
  latitude: number;
  longitude: number;
  simulated_gps: boolean;
  evidence_refs: string[];
  created_at: number;
  assigned_at?: number | null;
  actioned_at?: number | null;
  reobserve_at?: number | null;
  closed_at?: number | null;
  due_at?: number | null;
  action_notes?: string | null;
  closure_notes?: string | null;
  created_by: string;
  updated_at: number;
  operational_confidence: number;
  reliability: number;
  priority_explanation?: string | null;
  recommended_response?: string | null;
  metadata?: Record<string, any>;
}

export interface AuthorityActionSummary {
  total: number;
  open_count: number;
  critical_count: number;
  assigned_count: number;
  actioned_count: number;
  reobserve_count: number;
  closed_count: number;
  cancelled_count: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
  by_target_type: Record<string, number>;
  by_assigned_team: Record<string, number>;
  disclaimer: string;
  generated_at: number;
}

export interface AuthorityActionQueueResponse {
  items: AuthorityAction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
}

// Feature #8: Closed-Loop Re-Observation & Outcome Verification Types
export type ReObservationOutcome = 'IMPROVED' | 'UNCHANGED' | 'WORSENED' | 'INSUFFICIENT_DATA';
export type ReObservationVerificationStatus = 'PENDING_REOBSERVATION' | 'VERIFIED' | 'ESCALATED' | 'REQUIRES_REVIEW';
export type EvidenceSufficiencyLevel = 'GOOD' | 'LIMITED' | 'INSUFFICIENT';

export interface ReObservationHistoryEntry {
  entry_id: string;
  reobservation_id: string;
  action_type: string;
  operator: string;
  from_status: string;
  to_status: string;
  notes?: string | null;
  timestamp: number;
}

export interface ReObservation {
  reobservation_id: string;
  authority_action_id: string;
  target_id: string;
  target_type: string;
  original_event_id?: string | null;
  original_correlation_id?: string | null;
  source_bus_id: string;
  source_bus_ids: string[];
  observation_timestamp: number;
  latitude: number;
  longitude: number;
  simulated_gps: boolean;
  evidence_refs: string[];
  raw_confidence: number;
  operational_confidence: number;
  reliability: number;
  observed_condition: string;
  defect_count?: number | null;
  severity: string;
  outcome: ReObservationOutcome | string;
  verification_status: ReObservationVerificationStatus | string;
  verification_score: number;
  evidence_sufficiency: EvidenceSufficiencyLevel | string;
  spatial_distance_m: number;
  spatial_match: boolean;
  temporal_delta_hours: number;
  corroboration_level: string;
  independent_bus_count: number;
  explanation?: string | null;
  recommended_action?: string | null;
  before_observation: Record<string, any>;
  after_observation: Record<string, any>;
  verification_notes?: string | null;
  escalation_notes?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ReObservationSummary {
  total_reobservations: number;
  pending_reobservation: number;
  verified_improved: number;
  unchanged: number;
  worsened: number;
  insufficient_data: number;
  escalated: number;
  avg_verification_score: number;
  outcomes_by_target: Record<string, number>;
  outcomes_by_type: Record<string, number>;
  disclaimer: string;
}

export interface ReObservationQueueResponse {
  items: ReObservation[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Feature #9: Predictive Urban Intelligence & Risk Forecasting Types
export type ForecastTargetType =
  | 'ROAD_DETERIORATION'
  | 'TRAFFIC_CONGESTION'
  | 'PEDESTRIAN_RISK'
  | 'PERSISTENT_HOTSPOT'
  | 'MAINTENANCE_PRIORITY';

export type TrendDirectionType = 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE' | 'INSUFFICIENT_DATA';
export type ForecastRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ForecastWarningLevel = 'INFO' | 'WATCH' | 'WARNING' | 'CRITICAL';

export interface ForecastTimeseriesPoint {
  label: string;
  observed?: number | null;
  baseline: number;
  forecast?: number | null;
  timestamp: number;
}

export interface ForecastHistoryEntry {
  entry_id: string;
  forecast_id: string;
  action_type: string;
  operator: string;
  from_value?: string | null;
  to_value?: string | null;
  notes?: string | null;
  timestamp: number;
}

export interface PredictiveForecast {
  forecast_id: string;
  target_id: string;
  target_type: ForecastTargetType | string;
  location_name: string;
  latitude: number;
  longitude: number;
  simulated_gps: boolean;
  observation_window_days: number;
  historical_observation_count: number;
  independent_bus_count: number;
  source_bus_ids: string[];
  source_event_ids: string[];
  trend_direction: TrendDirectionType | string;
  trend_strength: number;
  current_value: number;
  baseline_value: number;
  forecast_value: number;
  unit: string;
  current_display_label: string;
  forecast_display_label: string;
  forecast_horizon: string;
  risk_level: ForecastRiskLevel | string;
  confidence: number;
  reliability: number;
  evidence_sufficiency: EvidenceSufficiencyLevel | string;
  early_warning: ForecastWarningLevel | string;
  warning_message?: string | null;
  explanation: string;
  recommended_action: string;
  recommended_action_details: string;
  timeseries_points: ForecastTimeseriesPoint[];
  created_at: number;
  updated_at: number;
}

export interface ForecastSummary {
  active_forecasts: number;
  warnings: number;
  deteriorating_areas: number;
  persistent_hotspots: number;
  forecast_actions: number;
  insufficient_data: number;
  average_confidence: number;
  target_distribution: Record<string, number>;
  trend_distribution: Record<string, number>;
  warning_distribution: Record<string, number>;
  disclaimer: string;
}

export interface ForecastQueueResponse {
  items: PredictiveForecast[];
  total: number;
  limit: number;
  offset: number;
  disclaimer: string;
}












