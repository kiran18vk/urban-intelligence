import type {
  Bus,
  DetectionEvent,
  RoadDefect,
  TrafficCongestion,
  Incident,
  UrbanEvent,
  IncidentRecord,
  AnalyticsSummary,
} from '@/types';
import {
  buses,
  detectionEvents,
  roadDefects,
  trafficCongestion,
  incidents,
  hourlyEventTrend,
  weeklyDefectTrend,
  areaDistribution,
  eventTypeBreakdown,
  overviewStats,
  mockUrbanEvents,
  mockIncidentRecords,
  mockAnalyticsSummary,
  mockDigitalTwinSummary,
  mockLiveMonitorStatus,
  mockCorrelatedEvents,
  mockCorrelationSummary,
  mockReviewQueue,
  mockReviewSummary,
  mockFeedbackRecords,
  mockAuthorityActions,
  mockAuthorityActionSummary,
  mockActionHistory,
  mockReObservations,
  mockReObservationSummary,
  mockReObservationHistory,
  mockPedestrianHotspots,
  mockPedestrianSummary,
  mockPedestrianTimeseries,
  mockQueuedEvents,
  mockQueueStatusSummary,
  mockPredictiveForecasts,
  mockForecastSummary,
  mockForecastHistory,
} from '@/data/mockData';

/**
 * The backend URL is configurable via environment variable.
 * Default is '/api' for same-origin single-URL production operation.
 * Set VITE_API_BASE_URL in development if connecting to an external backend host.
 * If backend is unreachable, the service layer gracefully falls back to mock data.
 */
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (envApiUrl !== undefined && envApiUrl.trim() !== '') ? envApiUrl : '/api';

export interface SystemHealthResponse {
  platform_status?: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | string;
  status?: 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | string;
  data_mode?: string;
  gps_mode?: string;
  edge_connectivity?: string;
  databases?: Record<string, { status: string; records?: number; error?: string; path?: string }>;
  ai_engines?: Record<string, { status: string; engine?: string }>;
  services?: Record<string, { status: string }>;
  subsystems?: Record<string, { status: string; engine?: string; error?: string; path?: string }>;
  timestamp?: string | number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOrMock<T>(path: string, mockData: T, mockDelay = 100): Promise<T> {
  if (API_BASE_URL) {
    const cleanBase = API_BASE_URL.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    try {
      const res = await fetch(`${cleanBase}${cleanPath}`);
      if (!res.ok) {
        throw new Error(`API error ${res.status}: ${res.statusText}`);
      }
      return await res.json();
    } catch (err) {
      console.warn(`[apiService] Request to ${cleanBase}${cleanPath} failed. Falling back to mock data.`, err);
      return mockData;
    }
  }
  await delay(mockDelay);
  return mockData;
}

export const apiService = {
  // Overview / dashboard aggregate
  getOverviewStats: () => fetchOrMock('/stats/overview', overviewStats),

  // Buses
  getBuses: () => fetchOrMock<Bus[]>('/buses', buses),
  getBus: (id: string) => fetchOrMock<Bus>(`/buses/${id}`, buses.find((b) => b.id === id) ?? buses[0]),

  // Detection events
  getEvents: () => fetchOrMock<DetectionEvent[]>('/events', detectionEvents),
  getEvent: (id: string) => fetchOrMock<DetectionEvent>(`/events/${id}`, detectionEvents.find((e) => e.id === id) ?? detectionEvents[0]),

  createEventFromDetection: async (payload: any) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/events/from-detection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] createEventFromDetection failed on backend.', err);
      }
    }
    return {
      event_id: `EVT-${Math.random().toString(16).slice(2, 10).toUpperCase()}`,
      status: 'STORED',
      ...payload,
    };
  },

  // Phase 4: GIS Urban Events from Perception Engine
  getRecentUrbanEvents: (params?: { limit?: number; event_type?: string; severity?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.event_type) query.set('event_type', params.event_type);
    if (params?.severity) query.set('severity', params.severity);
    const qs = query.toString();
    const path = qs ? `/events/recent?${qs}` : '/events/recent';

    let filteredMock = [...mockUrbanEvents];
    if (params?.event_type) {
      filteredMock = filteredMock.filter(
        (e) => e.event_type.toUpperCase() === params.event_type!.toUpperCase()
      );
    }
    if (params?.severity) {
      filteredMock = filteredMock.filter(
        (e) => e.severity.toUpperCase() === params.severity!.toUpperCase()
      );
    }
    if (params?.limit) {
      filteredMock = filteredMock.slice(0, params.limit);
    }

    return fetchOrMock<UrbanEvent[]>(path, filteredMock);
  },
  getUrbanEvent: (id: string) =>
    fetchOrMock<UrbanEvent>(`/events/${id}`, mockUrbanEvents.find((e) => e.event_id === id) ?? mockUrbanEvents[0]),

  // Road defects & Lifecycle
  getRoadDefects: () => fetchOrMock<RoadDefect[]>('/defects', roadDefects),
  getRoadDefect: (id: string) => fetchOrMock<RoadDefect>(`/defects/${id}`, roadDefects.find((d) => d.id === id) ?? roadDefects[0]),
  updateDefectStatus: async (id: string, status: string, note?: string): Promise<RoadDefect> => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/defects/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status, note }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn(`[apiService] Status update for defect ${id} failed on backend. Updating mock.`, err);
      }
    }
    const found = roadDefects.find((d) => d.id === id);
    if (found) {
      found.status = status as any;
      if (!found.lifecycleHistory) found.lifecycleHistory = [];
      found.lifecycleHistory.push({
        status: status as any,
        timestamp: new Date().toISOString(),
        note: note || `Status transitioned to ${status}`,
        actor: 'Municipal Dispatch Unit',
      });
      return { ...found };
    }
    return roadDefects[0];
  },

  // Traffic congestion
  getTrafficCongestion: () => fetchOrMock<TrafficCongestion[]>('/traffic/congestion', trafficCongestion),

  // Incidents (Legacy & Modern IncidentRecord)
  getIncidents: () => fetchOrMock<Incident[]>('/incidents', incidents),
  getIncident: (id: string) => fetchOrMock<Incident>(`/incidents/${id}`, incidents.find((i) => i.id === id) ?? incidents[0]),

  getRecentIncidents: (params?: { limit?: number; severity?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.severity) searchParams.set('severity', params.severity);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    const path = `/incidents/recent${query ? `?${query}` : ''}`;

    let filteredMock = [...mockIncidentRecords];
    if (params?.severity) {
      filteredMock = filteredMock.filter(
        (i) => i.severity.toUpperCase() === params.severity!.toUpperCase()
      );
    }
    if (params?.status) {
      filteredMock = filteredMock.filter(
        (i) => i.status.toUpperCase() === params.status!.toUpperCase()
      );
    }
    if (params?.limit) {
      filteredMock = filteredMock.slice(0, params.limit);
    }

    return fetchOrMock<IncidentRecord[]>(path, filteredMock);
  },

  getIncidentRecord: (id: string) =>
    fetchOrMock<IncidentRecord>(
      `/incidents/${id}`,
      mockIncidentRecords.find((i) => i.incident_id === id) ?? mockIncidentRecords[0]
    ),

  updateIncidentStatus: async (id: string, status: string): Promise<IncidentRecord> => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/incidents/${id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn(`[apiService] Status update for ${id} failed on backend. Updating mock.`, err);
      }
    }
    const found = mockIncidentRecords.find((i) => i.incident_id === id);
    if (found) {
      found.status = status as any;
      return { ...found };
    }
    return mockIncidentRecords[0];
  },

  // Modern Analytics (Phase 7)
  getAnalyticsSummary: () => fetchOrMock<AnalyticsSummary>('/analytics/summary', mockAnalyticsSummary),
  getFleetAnalytics: () => fetchOrMock('/analytics/fleet', { fleet: mockAnalyticsSummary.fleet, data_source: 'demo_simulation' }),
  getTrafficAnalytics: () => fetchOrMock('/analytics/traffic', { traffic: mockAnalyticsSummary.traffic, data_source: 'demo_simulation' }),
  getRouteAnalytics: () => fetchOrMock('/analytics/routes', mockAnalyticsSummary.corridors),
  getCongestionAnalytics: () => fetchOrMock('/analytics/congestion', { corridors: mockAnalyticsSummary.corridors }),

  // Legacy Analytics
  getHourlyTrend: () => fetchOrMock('/analytics/hourly-trend', hourlyEventTrend),
  getWeeklyDefectTrend: () => fetchOrMock('/analytics/weekly-defects', weeklyDefectTrend),
  getAreaDistribution: () => fetchOrMock('/analytics/area-distribution', areaDistribution),
  getEventTypeBreakdown: () => fetchOrMock('/analytics/event-types', eventTypeBreakdown),

  // Urban Digital Twin Layer (Final Phase)
  getDigitalTwinSummary: () => fetchOrMock<import('@/types').DigitalTwinSummary>('/digital-twin/summary', mockDigitalTwinSummary),
  getDigitalTwinRoads: () => fetchOrMock<import('@/types').TwinRoadSegment[]>('/digital-twin/roads', mockDigitalTwinSummary.roads),
  getDigitalTwinTraffic: () => fetchOrMock<import('@/types').TwinTrafficZone[]>('/digital-twin/traffic', mockDigitalTwinSummary.traffic_zones),
  getDigitalTwinAssets: () => fetchOrMock<import('@/types').TwinUrbanAsset[]>('/digital-twin/assets', mockDigitalTwinSummary.assets),
  getDigitalTwinObservations: (entityId?: string) =>
    fetchOrMock<import('@/types').TwinObservation[]>(
      entityId ? `/digital-twin/observations?entity_id=${entityId}` : '/digital-twin/observations',
      []
    ),
  runDigitalTwinSimulation: async (params: {
    scenario_type: string;
    target_id: string;
    parameters?: Record<string, any>;
  }): Promise<import('@/types').SimulationResult> => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/digital-twin/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Simulation request failed on backend. Falling back to mock calculation.', err);
      }
    }
    // Mock simulation response
    const targetRoad = mockDigitalTwinSummary.roads.find((r) => r.id === params.target_id);
    const targetZone = mockDigitalTwinSummary.traffic_zones.find((z) => z.id === params.target_id);
    const targetName = targetRoad ? targetRoad.name : (targetZone ? targetZone.name : params.target_id);

    const type = params.scenario_type.toUpperCase();
    if (type.includes('MAINTENANCE') || type.includes('REPAIR')) {
      const baselineDefects = targetRoad?.defect_count ?? 3;
      const baselinePriority = targetRoad?.priority_score ?? 78;
      const baselineDet = targetRoad?.deterioration_index ?? 6.8;
      const toRepair = Math.min(baselineDefects, Number(params.parameters?.defects_to_repair || 2));
      const simPriority = Math.max(10, baselinePriority - toRepair * 22);
      const simDet = Math.max(1.0, Number((baselineDet - toRepair * 1.8).toFixed(1)));
      const cost = toRepair * Number(params.parameters?.unit_cost_inr || 12500);

      return {
        scenario_type: 'MAINTENANCE_INTERVENTION',
        target_id: params.target_id,
        target_name: targetName,
        baseline_metrics: {
          defect_count: baselineDefects,
          condition_state: targetRoad?.condition_state || 'DEGRADED',
          priority_score: baselinePriority,
          deterioration_index: baselineDet,
        },
        simulated_metrics: {
          defect_count: Math.max(0, baselineDefects - toRepair),
          condition_state: baselineDefects - toRepair === 0 ? 'EXCELLENT' : 'GOOD',
          priority_score: simPriority,
          deterioration_index: simDet,
          projected_repair_expenditure_inr: cost,
          serviceability_gain_pct: Math.min(60, toRepair * 20),
        },
        impact_summary: `Executing immediate maintenance clears ${toRepair} defect(s) on ${targetName}, dropping priority score from ${baselinePriority} to ${simPriority} and restoring surface condition to ${baselineDefects - toRepair === 0 ? 'EXCELLENT' : 'GOOD'}.`,
        delta: {
          defect_reduction: toRepair,
          condition_improvement: `${targetRoad?.condition_state || 'DEGRADED'} -> ${baselineDefects - toRepair === 0 ? 'EXCELLENT' : 'GOOD'}`,
          priority_reduction: baselinePriority - simPriority,
          projected_cost_inr: cost,
        },
        formula_used: 'sim_priority = max(10, baseline_priority - (defects_repaired * 22)); expenditure = defects_repaired * unit_cost',
        disclaimer: 'SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION',
      };
    }

    if (type.includes('ESCALATION')) {
      const days = Number(params.parameters?.delay_days || 60);
      const multiplier = days >= 60 ? 1.65 : 1.35;
      const baseCost = targetRoad?.estimated_cost_inr || 32000;
      const escalatedCost = Math.round(baseCost * multiplier);
      const penaltyCost = escalatedCost - baseCost;

      return {
        scenario_type: 'DEFECT_ESCALATION',
        target_id: params.target_id,
        target_name: targetName,
        baseline_metrics: {
          delay_days: 0,
          defect_count: targetRoad?.defect_count || 3,
          condition_state: targetRoad?.condition_state || 'DEGRADED',
          priority_score: targetRoad?.priority_score || 65,
          deterioration_index: targetRoad?.deterioration_index || 5.5,
          estimated_repair_cost_inr: baseCost,
        },
        simulated_metrics: {
          delay_days: days,
          defect_count: (targetRoad?.defect_count || 3) + (days >= 60 ? 3 : 1),
          condition_state: 'CRITICAL',
          priority_score: Math.min(100, (targetRoad?.priority_score || 65) + 25),
          deterioration_index: Math.min(10.0, (targetRoad?.deterioration_index || 5.5) + 3.5),
          escalated_repair_cost_inr: escalatedCost,
          cost_penalty_pct: Math.round((multiplier - 1.0) * 100),
        },
        impact_summary: `Delaying road maintenance on ${targetName} by ${days} days causes severe subbase degradation, escalating repair costs by +${Math.round((multiplier - 1.0) * 100)}% (₹${penaltyCost.toLocaleString('en-IN')} INR escalation penalty).`,
        delta: {
          condition_degradation: `${targetRoad?.condition_state || 'DEGRADED'} -> CRITICAL`,
          priority_spike: 25,
          cost_escalation_inr: penaltyCost,
          cost_escalation_pct: Math.round((multiplier - 1.0) * 100),
        },
        formula_used: 'escalated_cost = baseline_cost * (1.65 if days>=60 else 1.35); sim_deterioration = min(10.0, baseline + delta)',
        disclaimer: 'SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION',
      };
    }

    if (type.includes('CLOSURE') || type.includes('OBSTRUCTION')) {
      const detourMult = Number(params.parameters?.detour_multiplier || 1.55);
      const baseTime = 18.0;
      const simTime = Number((baseTime * detourMult).toFixed(1));
      const penaltyTime = Number((simTime - baseTime).toFixed(1));

      return {
        scenario_type: 'ROAD_CLOSURE',
        target_id: params.target_id,
        target_name: targetName,
        baseline_metrics: {
          status: 'OPEN',
          baseline_transit_time_min: baseTime,
          affected_routes: ['Route 12', 'Route 15'],
        },
        simulated_metrics: {
          status: 'CLOSED_DETOUR_ACTIVE',
          detour_transit_time_min: simTime,
          estimated_detour_penalty_min: penaltyTime,
        },
        impact_summary: `Complete closure of ${targetName} requires rerouting via alternate arterials, imposing a +${penaltyTime} min transit penalty (+${Math.round((detourMult - 1.0) * 100)}%) on active bus routes.`,
        delta: {
          status_change: 'OPEN -> CLOSED (Detour)',
          transit_time_penalty_min: penaltyTime,
          transit_time_penalty_pct: Math.round((detourMult - 1.0) * 100),
        },
        formula_used: 'simulated_route_time = baseline_time_min * detour_multiplier',
        disclaimer: 'SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION',
      };
    }

    const isDefect = type.includes('DEFECT');
    return {
      scenario_type: params.scenario_type,
      target_id: params.target_id,
      target_name: targetName,
      baseline_metrics: {
        condition: isDefect ? (targetRoad?.condition_state || 'GOOD') : (targetZone?.congestion_level || 'MEDIUM'),
        transit_time_min: 20.0,
        estimated_delay_min: 6.0,
      },
      simulated_metrics: {
        condition: isDefect ? 'CRITICAL' : (params.parameters?.target_congestion_level || 'HIGH'),
        transit_time_min: isDefect ? 20.0 : 34.0,
        estimated_delay_min: isDefect ? 6.0 : 14.0,
      },
      impact_summary: isDefect
        ? `Projected defect cluster on ${targetName} degrades safety index to 35.0 (CRITICAL). Advisory maintenance recommended.`
        : `Surging corridor congestion on ${targetName} increases estimated route transit delay by +8.0 minutes (+40.0%).`,
      delta: {
        delay_increase_min: 8.0,
        condition_change: isDefect ? `${targetRoad?.condition_state || 'GOOD'} -> CRITICAL` : `${targetZone?.congestion_level || 'MEDIUM'} -> ${params.parameters?.target_congestion_level || 'HIGH'}`,
      },
      formula_used: 'estimated_delay = baseline_time * (congestion_factor - 1.0)',
      disclaimer: 'SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION',
    };
  },

  // Phase 8: Pedestrian Risk Intelligence & Mitigation Engine
  getPedestrianHotspots: (params?: { level?: string; road_id?: string }) => {
    let url = '/pedestrian-risk/hotspots';
    const queryParts: string[] = [];
    if (params?.level && params.level !== 'ALL') queryParts.push(`level=${encodeURIComponent(params.level)}`);
    if (params?.road_id) queryParts.push(`road_id=${encodeURIComponent(params.road_id)}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

    let fallback = mockPedestrianHotspots;
    if (params?.level && params.level !== 'ALL') {
      fallback = fallback.filter((h) => h.risk_level.toUpperCase() === params.level?.toUpperCase());
    }
    if (params?.road_id) {
      fallback = fallback.filter((h) => h.road_id === params.road_id);
    }
    return fetchOrMock<import('@/types').PedestrianHotspot[]>(url, fallback);
  },

  getPedestrianHotspotById: async (hotspotId: string) => {
    const fallback = mockPedestrianHotspots.find((h) => h.hotspot_id === hotspotId) || mockPedestrianHotspots[0];
    return fetchOrMock<import('@/types').PedestrianHotspot>(`/pedestrian-risk/hotspots/${hotspotId}`, fallback);
  },

  getPedestrianSummary: () =>
    fetchOrMock<import('@/types').PedestrianSummary>('/pedestrian-risk/summary', mockPedestrianSummary),

  getPedestrianTimeseries: () =>
    fetchOrMock<typeof mockPedestrianTimeseries>('/pedestrian-risk/timeseries', mockPedestrianTimeseries),

  simulatePedestrianMitigation: async (
    hotspotId: string,
    scenarioType: string
  ): Promise<import('@/types').PedestrianWhatIfResult> => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/pedestrian-risk/simulate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hotspot_id: hotspotId, scenario_type: scenarioType }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Pedestrian simulation request failed on backend. Falling back to mock calculation.', err);
      }
    }
    const target = mockPedestrianHotspots.find((h) => h.hotspot_id === hotspotId) || mockPedestrianHotspots[0];
    const reductions: Record<string, number> = {
      CROSSING_IMPROVEMENT: 18,
      STREET_LIGHTING: 12,
      TRAFFIC_CALMING: 15,
      TARGETED_ENFORCEMENT: 10,
      COMBINED_INTERVENTION: 28,
    };
    const reduction = reductions[scenarioType] || 15;
    const simScore = Math.max(5, target.current_risk_score - reduction);
    const getLevel = (s: number): import('@/types').PedestrianRiskLevel => {
      if (s <= 24) return 'LOW';
      if (s <= 49) return 'MODERATE';
      if (s <= 74) return 'HIGH';
      return 'CRITICAL';
    };

    return {
      hotspot_id: hotspotId,
      scenario_type: scenarioType,
      scenario_name: scenarioType.replace(/_/g, ' '),
      baseline_score: target.current_risk_score,
      baseline_level: target.risk_level,
      simulated_score: simScore,
      simulated_level: getLevel(simScore),
      score_delta: -(target.current_risk_score - simScore),
      factor_changes: {
        safety_impact: `-${reduction} risk points`,
        mode: 'Prototype model projection',
      },
      disclaimer: 'Scenario estimate — decision support only',
    };
  },

  // Edge Store-and-Forward Queue Endpoints
  getEdgeQueueStatus: () => fetchOrMock<import('@/types').QueueStatusSummary>('/edge/queue/status', mockQueueStatusSummary),

  getEdgeQueueEvents: (status?: string) => {
    const query = status ? `?status=${status}` : '';
    return fetchOrMock<import('@/types').QueuedEvent[]>(`/edge/queue/events${query}`, mockQueuedEvents);
  },

  enqueueEdgeEvent: async (payload: Partial<import('@/types').QueuedEvent>) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/edge/queue/enqueue`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Enqueue request failed on backend. Falling back to local mock.', err);
      }
    }
    const mockCreated: import('@/types').QueuedEvent = {
      queue_id: `QEVT-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
      event_id: payload.event_id || `EVT-${Date.now().toString().slice(-6)}`,
      event_type: payload.event_type || 'ROAD_POTHOLE',
      bus_id: payload.bus_id || 'PMP-BUS-001',
      camera_id: payload.camera_id || 'CAM-FRONT-01',
      timestamp: payload.timestamp || Date.now() / 1000,
      latitude: payload.latitude || 18.5204,
      longitude: payload.longitude || 73.8567,
      confidence: payload.confidence || 0.85,
      operational_confidence: payload.operational_confidence || 0.80,
      severity: payload.severity || 'HIGH',
      evidence_reference: payload.evidence_reference || 'EVIDENCE_REFERENCE_UNAVAILABLE',
      created_at: Date.now() / 1000,
      retry_count: 0,
      status: 'PENDING',
    };
    return mockCreated;
  },

  syncEdgeQueue: async (batchSize = 50) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/edge/queue/sync?batch_size=${batchSize}`, {
          method: 'POST',
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Sync request failed on backend.', err);
      }
    }
    return { status: 'SYNCED', synced_count: 1, failed_count: 0, remaining_pending: 0 };
  },

  setEdgeConnectivity: async (state: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'AUTO') => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/edge/queue/connectivity`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Connectivity toggle failed on backend.', err);
      }
    }
    return { status: 'ok', current_connectivity: state === 'AUTO' ? 'ONLINE' : state, is_simulation_active: state !== 'AUTO' };
  },

  retryEdgeEvent: async (queueId: string) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/edge/queue/retry/${queueId}`, {
          method: 'POST',
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Retry failed on backend.', err);
      }
    }
    return { status: 'PENDING' };
  },

  getEdgeHealth: () => fetchOrMock('/edge/queue/health', { status: 'healthy', db_exists: true }),

  getLiveMonitorStatus: (busId = 'PMP-BUS-001', cameraId = 'CAM-FRONT-01') =>
    fetchOrMock<import('@/types').LiveMonitorStatus>(
      `/live-monitor/status?bus_id=${encodeURIComponent(busId)}&camera_id=${encodeURIComponent(cameraId)}`,
      mockLiveMonitorStatus
    ),

  // Phase 10 / Feature 1: Generic Multi-Bus Event Correlation
  getCorrelationSummary: () =>
    fetchOrMock<import('@/types').CorrelationSummary>('/event-correlation/summary', mockCorrelationSummary),

  getCorrelatedEvents: (params?: {
    event_type?: string;
    correlation_level?: string;
    status?: string;
    bus_id?: string;
    severity?: string;
  }) => {
    let url = '/event-correlation/events';
    const queryParts: string[] = [];
    if (params?.event_type && params.event_type !== 'ALL') queryParts.push(`event_type=${encodeURIComponent(params.event_type)}`);
    if (params?.correlation_level && params.correlation_level !== 'ALL') queryParts.push(`correlation_level=${encodeURIComponent(params.correlation_level)}`);
    if (params?.status && params.status !== 'ALL') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.bus_id && params.bus_id.trim()) queryParts.push(`bus_id=${encodeURIComponent(params.bus_id.trim())}`);
    if (params?.severity && params.severity !== 'ALL') queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

    let fallback = mockCorrelatedEvents;
    if (params?.event_type && params.event_type !== 'ALL') {
      fallback = fallback.filter((e) => e.event_type.toUpperCase() === params.event_type?.toUpperCase());
    }
    if (params?.correlation_level && params.correlation_level !== 'ALL') {
      fallback = fallback.filter((e) => e.correlation_level.toUpperCase() === params.correlation_level?.toUpperCase());
    }
    if (params?.status && params.status !== 'ALL') {
      fallback = fallback.filter((e) => e.status.toUpperCase() === params.status?.toUpperCase());
    }
    if (params?.bus_id && params.bus_id.trim()) {
      const bTarget = params.bus_id.trim().toUpperCase();
      fallback = fallback.filter((e) => e.bus_ids.some((b) => b.toUpperCase() === bTarget));
    }
    if (params?.severity && params.severity !== 'ALL') {
      fallback = fallback.filter((e) => e.severity.toUpperCase() === params.severity?.toUpperCase());
    }
    return fetchOrMock<import('@/types').CorrelatedEvent[]>(url, fallback);
  },

  getCorrelatedEventById: (correlationId: string) => {
    const fallback = mockCorrelatedEvents.find((e) => e.correlation_id === correlationId) || mockCorrelatedEvents[0];
    return fetchOrMock<import('@/types').CorrelatedEvent>(`/event-correlation/events/${correlationId}`, fallback);
  },

  getSourceEventsForCorrelation: (correlationId: string) => {
    const fallbackTarget = mockCorrelatedEvents.find((e) => e.correlation_id === correlationId) || mockCorrelatedEvents[0];
    const fallbackAudit: import('@/types').CorrelationSourceAudit = {
      correlation_id: fallbackTarget.correlation_id,
      event_type: fallbackTarget.event_type,
      correlation_level: fallbackTarget.correlation_level,
      independent_bus_count: fallbackTarget.independent_bus_count,
      bus_ids: fallbackTarget.bus_ids,
      observation_count: fallbackTarget.observation_count,
      source_events: fallbackTarget.source_event_ids.map((id, idx) => ({
        event_id: id,
        bus_id: fallbackTarget.bus_ids[idx % fallbackTarget.bus_ids.length] || 'PMP-BUS-001',
        event_type: fallbackTarget.event_type,
        timestamp: new Date(Date.now() - (idx + 1) * 1800 * 1000).toISOString(),
        confidence: fallbackTarget.max_raw_confidence,
        operational_confidence: fallbackTarget.max_operational_confidence,
        severity: fallbackTarget.severity,
        reliability: { score: fallbackTarget.average_reliability },
      })),
      explanation: fallbackTarget.explanation,
    };
    return fetchOrMock<import('@/types').CorrelationSourceAudit>(
      `/event-correlation/source-events/${correlationId}`,
      fallbackAudit
    );
  },

  recomputeCorrelations: async () => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/event-correlation/recompute`, {
          method: 'POST',
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Recompute failed on backend.', err);
      }
    }
    return { status: 'ok', summary: mockCorrelationSummary };
  },

  // Feature 6: Human Review & Model Feedback Workflow Endpoints
  getReviewSummary: () =>
    fetchOrMock<import('@/types').ReviewSummary>('/reviews/summary', mockReviewSummary),

  getReviewQueue: (params?: {
    status?: string;
    severity?: string;
    target_type?: string;
    decision?: string;
    event_type?: string;
    bus_id?: string;
    correlation_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    let url = '/reviews/queue';
    const queryParts: string[] = [];
    if (params?.status && params.status !== 'ALL') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.severity && params.severity !== 'ALL') queryParts.push(`severity=${encodeURIComponent(params.severity)}`);
    if (params?.target_type && params.target_type !== 'ALL') queryParts.push(`target_type=${encodeURIComponent(params.target_type)}`);
    if (params?.decision && params.decision !== 'ALL') queryParts.push(`decision=${encodeURIComponent(params.decision)}`);
    if (params?.event_type && params.event_type !== 'ALL') queryParts.push(`event_type=${encodeURIComponent(params.event_type)}`);
    if (params?.bus_id && params.bus_id.trim()) queryParts.push(`bus_id=${encodeURIComponent(params.bus_id.trim())}`);
    if (params?.correlation_id && params.correlation_id.trim()) queryParts.push(`correlation_id=${encodeURIComponent(params.correlation_id.trim())}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.page_size) queryParts.push(`page_size=${params.page_size}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

    let filtered = [...mockReviewQueue];
    if (params?.status && params.status !== 'ALL') {
      filtered = filtered.filter((r) => r.status.toUpperCase() === params.status?.toUpperCase());
    }
    if (params?.severity && params.severity !== 'ALL') {
      filtered = filtered.filter((r) => r.severity.toUpperCase() === params.severity?.toUpperCase());
    }
    if (params?.target_type && params.target_type !== 'ALL') {
      filtered = filtered.filter((r) => r.target_type.toUpperCase() === params.target_type?.toUpperCase());
    }
    if (params?.decision && params.decision !== 'ALL') {
      filtered = filtered.filter((r) => (r.decision || '').toUpperCase() === params.decision?.toUpperCase());
    }
    if (params?.event_type && params.event_type !== 'ALL') {
      filtered = filtered.filter((r) => r.original_event_type.toUpperCase() === params.event_type?.toUpperCase());
    }
    if (params?.bus_id && params.bus_id.trim()) {
      const bTarget = params.bus_id.trim().toUpperCase();
      filtered = filtered.filter((r) => (r.source_bus_id || '').toUpperCase() === bTarget);
    }
    if (params?.correlation_id && params.correlation_id.trim()) {
      const cTarget = params.correlation_id.trim().toUpperCase();
      filtered = filtered.filter((r) => (r.correlation_id || '').toUpperCase() === cTarget);
    }
    if (params?.search && params.search.trim()) {
      const s = params.search.trim().toLowerCase();
      filtered = filtered.filter((r) =>
        r.review_id.toLowerCase().includes(s) ||
        r.target_id.toLowerCase().includes(s) ||
        r.original_event_type.toLowerCase().includes(s) ||
        (r.notes || '').toLowerCase().includes(s)
      );
    }

    const page = params?.page || 1;
    const pageSize = params?.page_size || 50;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    const fallbackResponse: import('@/types').ReviewQueueResponse = {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      has_next: page < totalPages,
    };

    return fetchOrMock<import('@/types').ReviewQueueResponse>(url, fallbackResponse);
  },

  getReviewById: (reviewId: string) => {
    const fallback = mockReviewQueue.find((r) => r.review_id === reviewId) || mockReviewQueue[0];
    return fetchOrMock<import('@/types').ReviewRecord>(`/reviews/${reviewId}`, fallback);
  },

  startReview: async (reviewId: string, reviewerId = 'operator-01') => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reviews/${reviewId}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reviewer_id: reviewerId }),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Start review failed on backend.', err);
      }
    }
    const item = mockReviewQueue.find((r) => r.review_id === reviewId);
    if (item) {
      item.status = 'IN_REVIEW';
      item.reviewer_id = reviewerId;
      return item;
    }
    return { status: 'IN_REVIEW', reviewer_id: reviewerId, review_id: reviewId };
  },

  submitReviewDecision: async (
    reviewId: string,
    decisionPayload: {
      decision: string;
      reason?: string | null;
      notes?: string | null;
      corrected_event_type?: string | null;
      reviewer_id?: string;
    }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reviews/${reviewId}/decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(decisionPayload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Submit decision failed on backend.', err);
      }
    }
    const item = mockReviewQueue.find((r) => r.review_id === reviewId);
    if (item) {
      item.decision = decisionPayload.decision;
      item.reason = decisionPayload.reason || null;
      item.notes = decisionPayload.notes || null;
      item.corrected_event_type = decisionPayload.corrected_event_type || null;
      item.reviewer_id = decisionPayload.reviewer_id || 'operator-01';
      item.reviewed_at = new Date().toISOString();
      item.status = decisionPayload.decision === 'NEEDS_REVIEW' ? 'PENDING' : 'COMPLETED';
      return item;
    }
    return { status: 'COMPLETED', decision: decisionPayload.decision };
  },

  createReview: async (payload: Partial<import('@/types').ReviewRecord>) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reviews`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Create review failed on backend.', err);
      }
    }
    const created: import('@/types').ReviewRecord = {
      review_id: `REV-${Math.floor(Math.random() * 90000 + 10000)}`,
      target_type: payload.target_type || 'URBAN_EVENT',
      target_id: payload.target_id || `EVT-${Date.now().toString().slice(-6)}`,
      event_id: payload.event_id || null,
      correlation_id: payload.correlation_id || null,
      original_event_type: payload.original_event_type || 'ROAD_POTHOLE',
      original_confidence: payload.original_confidence || 0.85,
      original_operational_confidence: payload.original_operational_confidence || 0.80,
      original_reliability: payload.original_reliability || 0.88,
      severity: payload.severity || 'HIGH',
      created_at: new Date().toISOString(),
      status: 'PENDING',
      is_simulated: true,
      evidence_reference: payload.evidence_reference || null,
      source_bus_id: payload.source_bus_id || 'PMP-BUS-001',
    };
    return created;
  },

  getFeedbackRecords: (params?: {
    decision?: string;
    event_type?: string;
    target_type?: string;
    reviewer?: string;
  }) => {
    let url = '/reviews/feedback';
    const queryParts: string[] = [];
    if (params?.decision && params.decision !== 'ALL') queryParts.push(`decision=${encodeURIComponent(params.decision)}`);
    if (params?.event_type && params.event_type !== 'ALL') queryParts.push(`event_type=${encodeURIComponent(params.event_type)}`);
    if (params?.target_type && params.target_type !== 'ALL') queryParts.push(`target_type=${encodeURIComponent(params.target_type)}`);
    if (params?.reviewer && params.reviewer.trim()) queryParts.push(`reviewer=${encodeURIComponent(params.reviewer.trim())}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

    let fallback = mockFeedbackRecords;
    if (params?.decision && params.decision !== 'ALL') {
      fallback = fallback.filter((f) => f.decision.toUpperCase() === params.decision?.toUpperCase());
    }
    if (params?.event_type && params.event_type !== 'ALL') {
      fallback = fallback.filter((f) => f.event_type.toUpperCase() === params.event_type?.toUpperCase());
    }
    if (params?.target_type && params.target_type !== 'ALL') {
      fallback = fallback.filter((f) => f.target_type.toUpperCase() === params.target_type?.toUpperCase());
    }
    if (params?.reviewer && params.reviewer.trim()) {
      fallback = fallback.filter((f) => f.reviewer_id.toLowerCase().includes(params.reviewer!.toLowerCase()));
    }
    return fetchOrMock<import('@/types').FeedbackRecord[]>(url, fallback);
  },

  getReviewHealth: () => fetchOrMock('/reviews/health', { status: 'healthy', db_exists: true }),

  // Feature #7: Authority Alert & Action Center Endpoints
  getAuthorityActionsSummary: () =>
    fetchOrMock<import('@/types').AuthorityActionSummary>(
      '/authority-actions/summary',
      mockAuthorityActionSummary
    ),
  getAuthorityActionSummary: () =>
    fetchOrMock<import('@/types').AuthorityActionSummary>(
      '/authority-actions/summary',
      mockAuthorityActionSummary
    ),

  getAuthorityActionsQueue: (params?: {
    status?: string;
    priority?: string;
    action_type?: string;
    target_type?: string;
    assigned_team?: string;
    bus_id?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    let url = '/authority-actions/queue';
    const queryParts: string[] = [];
    if (params?.status && params.status !== 'ALL') queryParts.push(`status=${encodeURIComponent(params.status)}`);
    if (params?.priority && params.priority !== 'ALL') queryParts.push(`priority=${encodeURIComponent(params.priority)}`);
    if (params?.action_type && params.action_type !== 'ALL') queryParts.push(`action_type=${encodeURIComponent(params.action_type)}`);
    if (params?.target_type && params.target_type !== 'ALL') queryParts.push(`target_type=${encodeURIComponent(params.target_type)}`);
    if (params?.assigned_team && params.assigned_team !== 'ALL') queryParts.push(`assigned_team=${encodeURIComponent(params.assigned_team)}`);
    if (params?.bus_id && params.bus_id.trim()) queryParts.push(`bus_id=${encodeURIComponent(params.bus_id.trim())}`);
    if (params?.search && params.search.trim()) queryParts.push(`search=${encodeURIComponent(params.search.trim())}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.page_size) queryParts.push(`page_size=${params.page_size}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

    let filtered = [...mockAuthorityActions];
    if (params?.status && params.status !== 'ALL') {
      filtered = filtered.filter((a) => a.status.toUpperCase() === params.status?.toUpperCase());
    }
    if (params?.priority && params.priority !== 'ALL') {
      filtered = filtered.filter((a) => a.priority.toUpperCase() === params.priority?.toUpperCase());
    }
    if (params?.action_type && params.action_type !== 'ALL') {
      filtered = filtered.filter((a) => a.action_type.toUpperCase() === params.action_type?.toUpperCase());
    }
    if (params?.target_type && params.target_type !== 'ALL') {
      filtered = filtered.filter((a) => a.target_type.toUpperCase() === params.target_type?.toUpperCase());
    }
    if (params?.assigned_team && params.assigned_team !== 'ALL') {
      filtered = filtered.filter((a) => (a.assigned_team || 'Unassigned').toUpperCase() === params.assigned_team?.toUpperCase());
    }
    if (params?.bus_id && params.bus_id.trim()) {
      const bTarget = params.bus_id.trim().toUpperCase();
      filtered = filtered.filter((a) => a.source_bus_ids.some((b) => b.toUpperCase() === bTarget));
    }
    if (params?.search && params.search.trim()) {
      const s = params.search.trim().toLowerCase();
      filtered = filtered.filter((a) =>
        a.action_id.toLowerCase().includes(s) ||
        a.target_id.toLowerCase().includes(s) ||
        a.title.toLowerCase().includes(s) ||
        a.description.toLowerCase().includes(s)
      );
    }

    const page = params?.page || 1;
    const pageSize = params?.page_size || 50;
    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    const fallbackResponse: import('@/types').AuthorityActionQueueResponse = {
      items,
      total,
      page,
      page_size: pageSize,
      total_pages: totalPages,
      has_next: page < totalPages,
    };

    return fetchOrMock<import('@/types').AuthorityActionQueueResponse>(url, fallbackResponse);
  },

  getAuthorityActionById: (actionId: string) => {
    const fallback = mockAuthorityActions.find((a) => a.action_id === actionId) || mockAuthorityActions[0];
    return fetchOrMock<import('@/types').AuthorityAction>(`/authority-actions/${actionId}`, fallback);
  },

  getAuthorityActionHistory: (actionId: string) => {
    const fallback = mockActionHistory.filter((h) => h.action_id === actionId);
    return fetchOrMock<import('@/types').ActionHistoryEntry[]>(
      `/authority-actions/${actionId}/history`,
      fallback.length > 0 ? fallback : mockActionHistory
    );
  },

  createAuthorityAction: async (payload: Partial<import('@/types').AuthorityAction>) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/authority-actions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Create action failed on backend.', err);
      }
    }
    const created: import('@/types').AuthorityAction = {
      action_id: `ACT-${Math.floor(Math.random() * 90000 + 10000)}`,
      target_id: payload.target_id || `DEF-${Date.now().toString().slice(-4)}`,
      target_type: payload.target_type || 'ROAD_DEFECT',
      event_type: payload.event_type || 'ROAD_POTHOLE',
      title: payload.title || 'Municipal Action',
      description: payload.description || 'Action triggered from urban event.',
      severity: payload.severity || 'HIGH',
      priority: payload.priority || 'HIGH',
      status: payload.assigned_team ? 'ASSIGNED' : 'NEW',
      action_type: payload.action_type || 'INSPECT',
      assigned_team: payload.assigned_team || null,
      assigned_operator: payload.assigned_operator || null,
      source_bus_ids: payload.source_bus_ids || ['PMP-BUS-001'],
      correlation_id: payload.correlation_id || null,
      review_id: payload.review_id || null,
      latitude: payload.latitude || 18.5204,
      longitude: payload.longitude || 73.8567,
      simulated_gps: true,
      evidence_refs: payload.evidence_refs || [],
      created_at: Date.now() / 1000,
      assigned_at: payload.assigned_team ? Date.now() / 1000 : null,
      due_at: Date.now() / 1000 + 86400 * 3,
      created_by: payload.created_by || 'operator-01',
      updated_at: Date.now() / 1000,
      operational_confidence: payload.operational_confidence || 0.80,
      reliability: payload.reliability || 0.85,
      priority_explanation: 'HIGH priority assigned based on event severity and verification status.',
      recommended_response: 'Inspect and proceed with standard decision support protocol.',
    };
    mockAuthorityActions.unshift(created);
    return created;
  },

  assignAuthorityAction: async (
    actionId: string,
    payload: { assigned_team: string; assigned_operator?: string; notes?: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/authority-actions/${actionId}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Assign action failed on backend.', err);
      }
    }
    const item = mockAuthorityActions.find((a) => a.action_id === actionId);
    if (item) {
      item.status = 'ASSIGNED';
      item.assigned_team = payload.assigned_team;
      item.assigned_operator = payload.assigned_operator || 'field-crew-01';
      item.assigned_at = Date.now() / 1000;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'ASSIGNED', action_id: actionId };
  },

  markAuthorityActionActioned: async (
    actionId: string,
    payload: { action_notes: string; operator?: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/authority-actions/${actionId}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Mark actioned failed on backend.', err);
      }
    }
    const item = mockAuthorityActions.find((a) => a.action_id === actionId);
    if (item) {
      item.status = 'ACTIONED';
      item.action_notes = payload.action_notes;
      item.actioned_at = Date.now() / 1000;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'ACTIONED', action_id: actionId };
  },

  markAuthorityActionReobserve: async (
    actionId: string,
    payload: { notes?: string; operator?: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/authority-actions/${actionId}/reobserve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Reobserve failed on backend.', err);
      }
    }
    const item = mockAuthorityActions.find((a) => a.action_id === actionId);
    if (item) {
      item.status = 'REOBSERVE';
      item.reobserve_at = Date.now() / 1000;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'REOBSERVE', action_id: actionId };
  },

  closeAuthorityAction: async (
    actionId: string,
    payload: { closure_notes: string; operator?: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/authority-actions/${actionId}/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Close action failed on backend.', err);
      }
    }
    const item = mockAuthorityActions.find((a) => a.action_id === actionId);
    if (item) {
      item.status = 'CLOSED';
      item.closure_notes = payload.closure_notes;
      item.closed_at = Date.now() / 1000;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'CLOSED', action_id: actionId };
  },

  cancelAuthorityAction: async (
    actionId: string,
    payload: { cancellation_reason: string; operator?: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/authority-actions/${actionId}/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Cancel action failed on backend.', err);
      }
    }
    const item = mockAuthorityActions.find((a) => a.action_id === actionId);
    if (item) {
      item.status = 'CANCELLED';
      item.closure_notes = `CANCELLED: ${payload.cancellation_reason}`;
      item.closed_at = Date.now() / 1000;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'CANCELLED', action_id: actionId };
  },

  getAuthorityActionsHealth: () =>
    fetchOrMock('/authority-actions/health', { status: 'healthy', db_exists: true }),

  // Feature #8: Closed-Loop Re-Observation & Outcome Verification
  getReObservationSummary: () =>
    fetchOrMock<import('@/types').ReObservationSummary>('/reobservation/summary', mockReObservationSummary),

  getReObservationQueue: (params?: {
    outcome?: string;
    target_type?: string;
    authority_action_id?: string;
    bus_id?: string;
    verification_status?: string;
    search?: string;
    page?: number;
    page_size?: number;
  }) => {
    let url = '/reobservation/queue';
    const queryParts: string[] = [];
    if (params?.outcome && params.outcome !== 'ALL') queryParts.push(`outcome=${encodeURIComponent(params.outcome)}`);
    if (params?.target_type && params.target_type !== 'ALL') queryParts.push(`target_type=${encodeURIComponent(params.target_type)}`);
    if (params?.authority_action_id) queryParts.push(`authority_action_id=${encodeURIComponent(params.authority_action_id)}`);
    if (params?.bus_id) queryParts.push(`bus_id=${encodeURIComponent(params.bus_id)}`);
    if (params?.verification_status && params.verification_status !== 'ALL') queryParts.push(`verification_status=${encodeURIComponent(params.verification_status)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.page) queryParts.push(`page=${params.page}`);
    if (params?.page_size) queryParts.push(`page_size=${params.page_size}`);

    if (queryParts.length > 0) {
      url += `?${queryParts.join('&')}`;
    }

    const fallback: import('@/types').ReObservationQueueResponse = {
      items: mockReObservations,
      total: mockReObservations.length,
      page: params?.page || 1,
      page_size: params?.page_size || 20,
      total_pages: 1,
    };

    return fetchOrMock<import('@/types').ReObservationQueueResponse>(url, fallback);
  },

  getReObservation: (reobservationId: string) => {
    const fallback = mockReObservations.find((r) => r.reobservation_id === reobservationId) || mockReObservations[0];
    return fetchOrMock<import('@/types').ReObservation>(`/reobservation/${reobservationId}`, fallback);
  },

  createReObservation: async (payload: Partial<import('@/types').ReObservation>) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reobservation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Create re-observation failed on backend.', err);
      }
    }
    const newRecord: import('@/types').ReObservation = {
      reobservation_id: `ROBS-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      authority_action_id: payload.authority_action_id || 'ACT-DEFAULT',
      target_id: payload.target_id || 'ROAD-01',
      target_type: payload.target_type || 'ROAD_DEFECT',
      source_bus_id: payload.source_bus_id || 'PMP-BUS-007',
      source_bus_ids: payload.source_bus_ids || ['PMP-BUS-007'],
      observation_timestamp: Date.now() / 1000,
      latitude: payload.latitude || 18.5204,
      longitude: payload.longitude || 73.8567,
      simulated_gps: true,
      evidence_refs: payload.evidence_refs || [],
      raw_confidence: payload.raw_confidence || 0.85,
      operational_confidence: payload.operational_confidence || 0.80,
      reliability: payload.reliability || 0.85,
      observed_condition: payload.observed_condition || 'Condition re-observed',
      defect_count: payload.defect_count,
      severity: payload.severity || 'LOW',
      outcome: payload.outcome || 'IMPROVED',
      verification_status: 'VERIFIED',
      verification_score: 88.0,
      evidence_sufficiency: 'GOOD',
      spatial_distance_m: 18.2,
      spatial_match: true,
      temporal_delta_hours: 24.0,
      corroboration_level: 'SINGLE_BUS_OBSERVATION',
      independent_bus_count: 1,
      explanation: 'Re-observation recorded improvement within 20m.',
      recommended_action: 'Verify outcome and update road lifecycle.',
      before_observation: payload.before_observation || {},
      after_observation: payload.after_observation || {},
      created_at: Date.now() / 1000,
      updated_at: Date.now() / 1000,
    };
    mockReObservations.unshift(newRecord);
    return newRecord;
  },

  verifyReObservationOutcome: async (
    reobservationId: string,
    payload: { operator?: string; notes: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reobservation/${reobservationId}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Verify outcome failed on backend.', err);
      }
    }
    const item = mockReObservations.find((r) => r.reobservation_id === reobservationId);
    if (item) {
      item.verification_status = 'VERIFIED';
      item.verification_notes = payload.notes;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'VERIFIED', reobservation_id: reobservationId };
  },

  escalateReObservation: async (
    reobservationId: string,
    payload: { operator?: string; escalation_notes: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reobservation/${reobservationId}/escalate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Escalate re-observation failed on backend.', err);
      }
    }
    const item = mockReObservations.find((r) => r.reobservation_id === reobservationId);
    if (item) {
      item.verification_status = 'ESCALATED';
      item.escalation_notes = payload.escalation_notes;
      item.updated_at = Date.now() / 1000;
      return { status: 'ESCALATED', reobservation_id: reobservationId, recommended_priority: 'HIGH' };
    }
    return { status: 'ESCALATED', reobservation_id: reobservationId };
  },

  requestAnotherObservation: async (
    reobservationId: string,
    payload: { operator?: string; notes: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/reobservation/${reobservationId}/request-another`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Request another observation failed on backend.', err);
      }
    }
    const item = mockReObservations.find((r) => r.reobservation_id === reobservationId);
    if (item) {
      item.verification_status = 'PENDING_REOBSERVATION';
      item.verification_notes = payload.notes;
      item.updated_at = Date.now() / 1000;
      return item;
    }
    return { status: 'PENDING_REOBSERVATION', reobservation_id: reobservationId };
  },

  getReObservationHistory: (reobservationId: string) => {
    const fallback = mockReObservationHistory.filter((h) => h.reobservation_id === reobservationId);
    return fetchOrMock<import('@/types').ReObservationHistoryEntry[]>(
      `/reobservation/${reobservationId}/history`,
      fallback.length > 0 ? fallback : mockReObservationHistory
    );
  },

  compareAuthorityActionReObservation: (authorityActionId: string) =>
    fetchOrMock<any>(`/reobservation/compare/${authorityActionId}`, {
      authority_action_id: authorityActionId,
      status: 'AWAITING_REOBSERVATION',
      message: 'Action ready for transit pass re-observation.',
    }),

  getReObservationHealth: () =>
    fetchOrMock('/reobservation/health', { status: 'healthy', db_exists: true }),

  // Feature #9: Predictive Urban Intelligence & Risk Forecasting
  getPredictiveSummary: () =>
    fetchOrMock<import('@/types').ForecastSummary>('/predictive/summary', mockForecastSummary),

  getPredictiveForecasts: (params?: {
    target_type?: string;
    risk_level?: string;
    trend_direction?: string;
    warning_level?: string;
    bus_id?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    let url = '/predictive/forecasts';
    const queryParts: string[] = [];
    if (params?.target_type && params.target_type !== 'ALL') queryParts.push(`target_type=${encodeURIComponent(params.target_type)}`);
    if (params?.risk_level && params.risk_level !== 'ALL') queryParts.push(`risk_level=${encodeURIComponent(params.risk_level)}`);
    if (params?.trend_direction && params.trend_direction !== 'ALL') queryParts.push(`trend_direction=${encodeURIComponent(params.trend_direction)}`);
    if (params?.warning_level && params.warning_level !== 'ALL') queryParts.push(`warning_level=${encodeURIComponent(params.warning_level)}`);
    if (params?.bus_id) queryParts.push(`bus_id=${encodeURIComponent(params.bus_id)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.limit) queryParts.push(`limit=${params.limit}`);
    if (params?.offset !== undefined) queryParts.push(`offset=${params.offset}`);
    if (queryParts.length > 0) url += `?${queryParts.join('&')}`;

    let fallbackItems = [...mockPredictiveForecasts];
    if (params?.target_type && params.target_type !== 'ALL') {
      fallbackItems = fallbackItems.filter((f) => f.target_type === params.target_type);
    }
    if (params?.risk_level && params.risk_level !== 'ALL') {
      fallbackItems = fallbackItems.filter((f) => f.risk_level === params.risk_level);
    }
    if (params?.trend_direction && params.trend_direction !== 'ALL') {
      fallbackItems = fallbackItems.filter((f) => f.trend_direction === params.trend_direction);
    }
    if (params?.warning_level && params.warning_level !== 'ALL') {
      fallbackItems = fallbackItems.filter((f) => f.early_warning === params.warning_level);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      fallbackItems = fallbackItems.filter(
        (f) =>
          f.forecast_id.toLowerCase().includes(q) ||
          f.target_id.toLowerCase().includes(q) ||
          f.location_name.toLowerCase().includes(q) ||
          f.explanation.toLowerCase().includes(q)
      );
    }

    const fallback: import('@/types').ForecastQueueResponse = {
      items: fallbackItems,
      total: fallbackItems.length,
      limit: params?.limit || 50,
      offset: params?.offset || 0,
      disclaimer: 'Prototype forecasting: outlooks are derived from available testbed observations and are not guaranteed future events.',
    };

    return fetchOrMock<import('@/types').ForecastQueueResponse>(url, fallback);
  },

  getPredictiveForecast: (forecastId: string) => {
    const fallback = mockPredictiveForecasts.find((f) => f.forecast_id === forecastId) || mockPredictiveForecasts[0];
    return fetchOrMock<import('@/types').PredictiveForecast>(`/predictive/forecasts/${forecastId}`, fallback);
  },

  getPredictiveWarnings: () => {
    const warnings = mockPredictiveForecasts.filter((f) => ['WARNING', 'CRITICAL', 'WATCH'].includes(f.early_warning));
    return fetchOrMock<{ total: number; items: import('@/types').PredictiveForecast[] }>('/predictive/warnings', {
      total: warnings.length,
      items: warnings,
    });
  },

  getPredictiveHotspots: () => {
    const hotspots = mockPredictiveForecasts.filter((f) => f.target_type === 'PERSISTENT_HOTSPOT');
    return fetchOrMock<{ total: number; items: import('@/types').PredictiveForecast[] }>('/predictive/hotspots', {
      total: hotspots.length,
      items: hotspots,
    });
  },

  getPredictiveTrend: (targetType: string, targetId: string) => {
    const fallback = mockPredictiveForecasts.find((f) => f.target_type === targetType && f.target_id === targetId) || mockPredictiveForecasts[0];
    return fetchOrMock<import('@/types').PredictiveForecast>(`/predictive/trends/${targetType}/${targetId}`, fallback);
  },

  recomputePredictiveForecasts: async () => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/predictive/recompute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Recompute forecasts failed on backend.', err);
      }
    }
    return { status: 'SUCCESS', recomputed_count: mockPredictiveForecasts.length, timestamp: Date.now() / 1000 };
  },

  createAuthorityActionFromForecast: async (
    forecastId: string,
    payload: { operator?: string; custom_notes?: string }
  ) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/predictive/${forecastId}/create-action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Create authority action from forecast failed on backend.', err);
      }
    }
    return {
      status: 'SUCCESS',
      forecast_id: forecastId,
      authority_action_id: `ACT-FCST-${Math.floor(Math.random() * 10000)}`,
      message: 'Authority action created with forecast basis.',
    };
  },

  getPredictiveHistory: (forecastId: string) => {
    const fallback = mockForecastHistory.filter((h) => h.forecast_id === forecastId);
    return fetchOrMock<import('@/types').ForecastHistoryEntry[]>(
      `/predictive/${forecastId}/history`,
      fallback.length > 0 ? fallback : mockForecastHistory
    );
  },

  getPredictiveHealth: () =>
    fetchOrMock('/predictive/health', { status: 'HEALTHY', active_forecasts: 6 }),

  // Feature #10: System Health & Testbed Management
  getSystemHealth: () =>
    fetchOrMock('/system/health', {
      platform_status: 'HEALTHY',
      data_mode: 'SYNTHETIC_TESTBED',
      gps_mode: 'SIMULATED_DETERMINISTIC',
      edge_connectivity: 'ONLINE',
      subsystems: {
        db_authority_actions: { status: 'HEALTHY' },
        db_reobservation: { status: 'HEALTHY' },
        db_predictive: { status: 'HEALTHY' },
        db_human_review: { status: 'HEALTHY' },
        db_edge_queue: { status: 'HEALTHY' },
        ai_traffic: { status: 'HEALTHY' },
        ai_road_damage: { status: 'HEALTHY' },
        event_correlation: { status: 'HEALTHY' },
        human_review: { status: 'HEALTHY' },
        authority_actions: { status: 'HEALTHY' },
        reobservation: { status: 'HEALTHY' },
        predictive_intelligence: { status: 'HEALTHY' },
        digital_twin: { status: 'HEALTHY' },
      },
    }),

  resetTestbedData: async (payload: { confirm_reset: boolean; operator?: string }) => {
    if (API_BASE_URL) {
      const cleanBase = API_BASE_URL.replace(/\/+$/, '');
      try {
        const res = await fetch(`${cleanBase}/system/reset-testbed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          return await res.json();
        }
      } catch (err) {
        console.warn('[apiService] Reset testbed failed on backend.', err);
      }
    }
    return { status: 'SUCCESS', message: 'Deterministic testbed dataset refreshed.' };
  },
};

export const api = apiService;

export function createEventSocket(): WebSocket | null {
  const wsUrl = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (!wsUrl) return null;
  return new WebSocket(wsUrl);
}
