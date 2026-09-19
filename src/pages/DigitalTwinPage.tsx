import { useState, useEffect } from 'react';
import {
  Boxes,
  Activity,
  AlertTriangle,
  Bus,
  ShieldCheck,
  TrendingUp,
  Clock,
  MapPin,
  RefreshCw,
  Eye,
  Sliders,
  Play,
  CheckCircle2,
  Info,
  Car,
  Layers,
  Sparkles,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type {
  DigitalTwinSummary,
  TwinRoadSegment,
  TwinTrafficZone,
  TwinUrbanAsset,
  SimulationResult,
} from '@/types';
import { MapComponent } from '@/components/Map/MapComponent';

import { mockDigitalTwinSummary } from '@/data/mockData';

export function DigitalTwinPage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DigitalTwinSummary>(mockDigitalTwinSummary);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'road' | 'traffic_zone' | 'asset';
    data: TwinRoadSegment | TwinTrafficZone | TwinUrbanAsset;
  }>({
    type: 'road',
    data: mockDigitalTwinSummary.roads[0],
  });

  // Scenario Simulator state
  const [scenarioType, setScenarioType] = useState<'ROAD_DEFECT' | 'CONGESTION_SURGE' | 'ROAD_CLOSURE'>('CONGESTION_SURGE');
  const [targetId, setTargetId] = useState<string>('ZONE-02');
  const [simParams, setSimParams] = useState<Record<string, any>>({ target_congestion_level: 'HIGH' });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const fetchTwinState = async () => {
    try {
      const data = await apiService.getDigitalTwinSummary();
      if (data && data.roads) {
        setSummary(data);
      }
    } catch (err) {
      console.error('Failed to load Digital Twin summary:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTwinState();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTwinState();
  };

  const handleRunSimulation = async () => {
    setSimLoading(true);
    try {
      const res = await apiService.runDigitalTwinSimulation({
        scenario_type: scenarioType,
        target_id: targetId,
        parameters: simParams,
      });
      setSimResult(res);
    } catch (err) {
      console.error('Simulation execution failed:', err);
    } finally {
      setSimLoading(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-accent-500" />
        <p className="text-sm font-medium text-slate-400">Loading Urban Digital Twin State Engine...</p>
      </div>
    );
  }

  const isBackend = summary.data_source === 'live_backend';

  const getConditionColor = (cond: string) => {
    switch (cond) {
      case 'EXCELLENT':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'GOOD':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'DEGRADED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'FRESH':
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> FRESH (&le;15m)</span>;
      case 'AGING':
        return <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20"><span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> AGING (15-60m)</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-500/20"><span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> STALE (&gt;60m)</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20 text-accent-400 ring-1 ring-accent-500/30">
              <Boxes className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              URBAN DIGITAL TWIN — PUNE TESTBED
            </h1>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isBackend
                  ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${isBackend ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {isBackend ? 'Live Backend Twin' : 'Demo / Simulated Digital Twin'}
            </span>
            <span className="rounded bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-ink-700">
              Deterministic Spatial Model
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Continuous digital representation of Pune road segments, traffic corridors, and urban infrastructure mapped from mobile bus sensing.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-850 px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-ink-800 hover:text-white"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-accent-400' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Sync Twin State'}
        </button>
      </div>

      {/* Top Disclaimer Alert */}
      <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        <div className="space-y-0.5">
          <p className="font-semibold text-amber-300">Prototype Urban Digital Twin for Mobile Sensing</p>
          <p className="text-[11px] text-amber-300/80">
            {summary.disclaimer} Geometries, GPS waypoints, and scenario projections reflect the PMPML testbed corridor network and do not represent a full municipal city twin.
          </p>
        </div>
      </div>

      {/* City State KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Fleet</span>
            <Bus className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.active_buses}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Sensing Buses Online</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Roads Monitored</span>
            <MapPin className="h-4 w-4 text-blue-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.roads_observed}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Active Testbed Corridors</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Defects</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.active_defects}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Potholes & Cracks</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Congested Zones</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.congested_zones}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Medium/High Density</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Logged Incidents</span>
            <Activity className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.recent_incidents}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Potential Road Events</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Twin Observations</span>
            <Eye className="h-4 w-4 text-accent-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.observations_count}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Traceable Perceptions</p>
        </div>
      </div>

      {/* Main Grid: GIS Twin Map & Entity Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Digital Twin Map & Entity Switcher */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-400" />
                <h3 className="text-sm font-semibold text-slate-200">GIS Digital Twin View — Pune Corridors</h3>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400"></span> Excellent/Good</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400"></span> Degraded</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400"></span> Critical</span>
              </div>
            </div>

            {/* Reusable GIS Map */}
            <div className="relative overflow-hidden rounded-lg border border-ink-700">
              <MapComponent
                height="440px"
                center={
                  selectedEntity?.data && 'coordinates' in selectedEntity.data && selectedEntity.data.coordinates?.[0]
                    ? { lat: selectedEntity.data.coordinates[0][0], lng: selectedEntity.data.coordinates[0][1] }
                    : selectedEntity?.data && 'center_coord' in selectedEntity.data
                    ? { lat: (selectedEntity.data as any).center_coord[0], lng: (selectedEntity.data as any).center_coord[1] }
                    : undefined
                }
              />
            </div>
          </div>

          {/* Testbed Entity Selection Grid */}
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 shadow-sm">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Monitored Testbed Corridors & Assets (Click to Inspect)
            </h4>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summary.roads.map((road) => (
                <button
                  key={road.id}
                  onClick={() => setSelectedEntity({ type: 'road', data: road })}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                    selectedEntity?.data.id === road.id
                      ? 'border-accent-500/50 bg-accent-500/10 ring-1 ring-accent-500/30'
                      : 'border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-accent-400">{road.id}</span>
                    <span className={`rounded border px-1.5 py-0.2 text-[9px] font-semibold ${getConditionColor(road.condition_state)}`}>
                      {road.condition_state}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 line-clamp-1">{road.name}</p>
                  <div className="flex w-full items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>{road.defect_count} defects</span>
                    {getFreshnessBadge(road.freshness)}
                  </div>
                </button>
              ))}

              {summary.traffic_zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => setSelectedEntity({ type: 'traffic_zone', data: zone })}
                  className={`flex flex-col items-start gap-1 rounded-lg border p-2.5 text-left transition-all ${
                    selectedEntity?.data.id === zone.id
                      ? 'border-accent-500/50 bg-accent-500/10 ring-1 ring-accent-500/30'
                      : 'border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400">{zone.id}</span>
                    <span className="rounded bg-purple-500/10 px-1.5 py-0.2 text-[9px] font-semibold text-purple-400 border border-purple-500/20">
                      {zone.congestion_level} CONGESTION
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 line-clamp-1">{zone.name}</p>
                  <div className="flex w-full items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span>+{zone.estimated_delay_min}m delay</span>
                    {getFreshnessBadge(zone.freshness)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Entity Inspector */}
        <div className="space-y-4">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-ink-700 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-accent-400" />
                <h3 className="text-sm font-semibold text-slate-200">Entity Digital Inspector</h3>
              </div>
              {selectedEntity && getFreshnessBadge((selectedEntity.data as any).freshness)}
            </div>

            {selectedEntity ? (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-accent-400">{selectedEntity.data.id}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                      {selectedEntity.type.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="mt-1 text-sm font-bold text-slate-100">{selectedEntity.data.name}</h4>
                </div>

                {/* State & Reliability Metrics */}
                <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Current State:</span>
                    <span className={`font-semibold rounded px-1.5 py-0.5 border text-[10px] ${
                      selectedEntity.type === 'road'
                        ? getConditionColor((selectedEntity.data as TwinRoadSegment).condition_state)
                        : selectedEntity.type === 'traffic_zone'
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                        : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    }`}>
                      {selectedEntity.type === 'road'
                        ? (selectedEntity.data as TwinRoadSegment).condition_state
                        : selectedEntity.type === 'traffic_zone'
                        ? `${(selectedEntity.data as TwinTrafficZone).congestion_level} CONGESTION`
                        : (selectedEntity.data as TwinUrbanAsset).condition}
                    </span>
                  </div>

                  {selectedEntity.type === 'road' && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Total Defects:</span>
                      <span className="font-mono font-bold text-slate-200">{(selectedEntity.data as TwinRoadSegment).defect_count}</span>
                    </div>
                  )}

                  {selectedEntity.type === 'traffic_zone' && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Estimated Delay:</span>
                        <span className="font-mono font-bold text-amber-400">+{(selectedEntity.data as TwinTrafficZone).estimated_delay_min} min</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Observed Speed:</span>
                        <span className="font-mono text-slate-200">{(selectedEntity.data as TwinTrafficZone).average_observed_speed_kmh} km/h</span>
                      </div>
                    </>
                  )}

                  {/* Confidence Propagation */}
                  <div className="space-y-1.5 pt-1 border-t border-ink-700">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">AI Raw Confidence:</span>
                      <span className="font-mono text-slate-200">
                        {Math.round(((selectedEntity.data as any).observation_confidence || (selectedEntity.data as any).confidence || 0.85) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Operational Confidence:</span>
                      <span className="font-mono font-bold text-accent-400">
                        {Math.round(((selectedEntity.data as any).operational_confidence || 0.80) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700">
                      <div
                        className="h-full bg-accent-500 rounded-full"
                        style={{
                          width: `${Math.round(((selectedEntity.data as any).operational_confidence || 0.80) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Observation Source Metadata */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Last Updated:</span>
                    <span className="text-slate-300 font-mono text-[10px]">
                      {(selectedEntity.data as any).last_updated
                        ? new Date((selectedEntity.data as any).last_updated).toLocaleTimeString()
                        : 'Simulated baseline'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Observation Source:</span>
                    <span className="text-slate-300 font-mono text-[10px]">
                      {(selectedEntity.data as any).observation_source || 'PMP-BUS-001 (CAM-01)'}
                    </span>
                  </div>
                </div>

                {/* Quick Simulation Trigger */}
                <button
                  onClick={() => {
                    if (selectedEntity.type === 'road') {
                      setScenarioType('ROAD_DEFECT');
                      setTargetId(selectedEntity.data.id);
                      setSimParams({ additional_defects: 3 });
                    } else if (selectedEntity.type === 'traffic_zone') {
                      setScenarioType('CONGESTION_SURGE');
                      setTargetId(selectedEntity.data.id);
                      setSimParams({ target_congestion_level: 'HIGH' });
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink-800 border border-ink-700 py-2 text-xs font-medium text-accent-400 hover:bg-ink-750 transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Load into What-If Simulator
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select any entity from the map or list to view digital twin metadata.</p>
            )}
          </div>

          {/* Infrastructure Assets Mini-Panel */}
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 shadow-sm">
            <h4 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Detected Infrastructure Assets
            </h4>
            <div className="space-y-2">
              {summary.assets.map((asset) => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedEntity({ type: 'asset', data: asset })}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-ink-700 bg-ink-850 p-2.5 hover:bg-ink-800 transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-slate-200">{asset.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{asset.asset_type}</p>
                  </div>
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    {asset.condition}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Urban State Timeline & What-If Scenario Simulator */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Urban State Timeline */}
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between border-b border-ink-700 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-semibold text-slate-200">Urban State Timeline (Change Log)</h3>
            </div>
            <span className="text-[10px] text-slate-400">Chronological State Updates</span>
          </div>

          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
            {summary.timeline.map((entry, idx) => (
              <div key={idx} className="relative flex gap-3 border-l-2 border-ink-700 pl-4 py-1">
                <div className="absolute -left-[5px] top-2 h-2 w-2 rounded-full bg-accent-400" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="rounded bg-ink-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-300 border border-ink-700">
                      {entry.event_type}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200">{entry.title}</p>
                  <p className="text-[11px] text-slate-400">{entry.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: What-If Scenario Simulator */}
        <div className="rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-ink-700 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">What-If Scenario Simulator</h3>
            </div>
            <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
              Deterministic Decision Support
            </span>
          </div>

          {/* Scenario Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setScenarioType('CONGESTION_SURGE');
                setTargetId('ZONE-02');
                setSimParams({ target_congestion_level: 'HIGH' });
              }}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'CONGESTION_SURGE'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              Congestion Surge
            </button>
            <button
              onClick={() => {
                setScenarioType('ROAD_DEFECT');
                setTargetId('ROAD-02');
                setSimParams({ additional_defects: 3 });
              }}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'ROAD_DEFECT'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              Defect Cluster
            </button>
            <button
              onClick={() => {
                setScenarioType('ROAD_CLOSURE');
                setTargetId('ROAD-04');
                setSimParams({ detour_multiplier: 1.55 });
              }}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'ROAD_CLOSURE'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              Road Closure
            </button>
          </div>

          {/* Controls */}
          <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 space-y-3">
            <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-slate-400">Target Entity:</span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="rounded bg-ink-800 border border-ink-700 px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                {scenarioType === 'CONGESTION_SURGE' ? (
                  summary.traffic_zones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
                  ))
                ) : (
                  summary.roads.map((r) => (
                    <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                  ))
                )}
              </select>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={simLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-accent-600 py-2 text-xs font-bold text-white hover:from-purple-500 hover:to-accent-500 transition-all shadow-md shadow-purple-500/20"
            >
              <Play className={`h-3.5 w-3.5 ${simLoading ? 'animate-spin' : ''}`} />
              {simLoading ? 'Projecting Impact...' : 'Project Scenario Impact'}
            </button>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-300">Simulation Projection Result</span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[9px] font-bold text-purple-300 border border-purple-500/30">
                  {simResult.disclaimer}
                </span>
              </div>

              <p className="text-xs font-medium text-slate-200">{simResult.impact_summary}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-ink-850 p-2 border border-ink-700">
                  <span className="text-[10px] text-slate-400">Baseline Metrics</span>
                  <p className="font-mono text-xs font-semibold text-slate-200 mt-0.5">
                    {JSON.stringify(simResult.baseline_metrics)}
                  </p>
                </div>
                <div className="rounded bg-ink-850 p-2 border border-ink-700">
                  <span className="text-[10px] text-purple-400">Simulated Metrics</span>
                  <p className="font-mono text-xs font-semibold text-purple-300 mt-0.5">
                    {JSON.stringify(simResult.simulated_metrics)}
                  </p>
                </div>
              </div>

              <p className="text-[10px] font-mono text-slate-500">Formula: {simResult.formula_used}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
