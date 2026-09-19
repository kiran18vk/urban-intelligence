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
} from '@/data/mockData';

/**
 * The backend URL is configurable via environment variable.
 * Default is '/api' for same-origin single-URL production operation.
 * Set VITE_API_BASE_URL in development if connecting to an external backend host.
 * If backend is unreachable, the service layer gracefully falls back to mock data.
 */
const envApiUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL = (envApiUrl !== undefined && envApiUrl.trim() !== '') ? envApiUrl : '/api';

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
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

  // Road defects
  getRoadDefects: () => fetchOrMock<RoadDefect[]>('/defects', roadDefects),
  getRoadDefect: (id: string) => fetchOrMock<RoadDefect>(`/defects/${id}`, roadDefects.find((d) => d.id === id) ?? roadDefects[0]),

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
    const isCongestion = params.scenario_type.includes('CONGESTION');
    const isDefect = params.scenario_type.includes('DEFECT');
    return {
      scenario_type: params.scenario_type,
      target_id: params.target_id,
      target_name: isDefect ? 'Fergusson College (FC) Road' : isCongestion ? 'FC Road Commercial Zone' : 'Old Pune-Mumbai Hwy',
      baseline_metrics: {
        condition: isDefect ? 'GOOD' : 'MEDIUM',
        transit_time_min: 20.0,
        estimated_delay_min: 6.0,
      },
      simulated_metrics: {
        condition: isDefect ? 'CRITICAL' : 'HIGH',
        transit_time_min: isDefect ? 20.0 : 34.0,
        estimated_delay_min: isDefect ? 6.0 : 14.0,
      },
      impact_summary: isDefect
        ? 'Projected defect cluster degrades safety index to 35.0 (CRITICAL). Advisory maintenance recommended.'
        : 'Surging corridor congestion increases estimated route transit delay by +8.0 minutes (+40.0%).',
      delta: {
        delay_increase_min: 8.0,
        condition_change: isDefect ? 'GOOD -> CRITICAL' : 'MEDIUM -> HIGH',
      },
      formula_used: 'estimated_delay = baseline_time * (congestion_factor - 1.0)',
      disclaimer: 'SIMULATION / ESTIMATE — NOT A REAL-TIME PREDICTION',
    };
  },
};

/**
 * WebSocket helper for real-time event streams.
 * When the backend is available, connect via VITE_WS_BASE_URL.
 * Returns null if no WebSocket URL is configured.
 */
export function createEventSocket(): WebSocket | null {
  const wsUrl = import.meta.env.VITE_WS_BASE_URL as string | undefined;
  if (!wsUrl) return null;
  return new WebSocket(wsUrl);
}
