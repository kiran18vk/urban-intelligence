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
  IndianRupee,
  Wrench,
  AlertOctagon,
  TrendingDown,
  Minus,
  Users,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type {
  DigitalTwinSummary,
  TwinRoadSegment,
  TwinTrafficZone,
  TwinUrbanAsset,
  SimulationResult,
  PedestrianHotspot,
} from '@/types';
import { MapComponent } from '@/components/Map/MapComponent';
import { mockDigitalTwinSummary, mockPedestrianHotspots } from '@/data/mockData';

export function DigitalTwinPage() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<DigitalTwinSummary>(mockDigitalTwinSummary);
  const [pedestrianHotspots, setPedestrianHotspots] = useState<PedestrianHotspot[]>(mockPedestrianHotspots);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'road' | 'traffic_zone' | 'asset';
    data: TwinRoadSegment | TwinTrafficZone | TwinUrbanAsset;
  }>({
    type: 'road',
    data: mockDigitalTwinSummary.roads[0],
  });

  const loadTwinData = async () => {
    try {
      const [twinData, hotspotsData] = await Promise.all([
        apiService.getDigitalTwinSummary().catch(() => mockDigitalTwinSummary),
        apiService.getPedestrianHotspots().catch(() => mockPedestrianHotspots),
      ]);
      setSummary(twinData);
      setPedestrianHotspots(hotspotsData);
    } catch {
      // fallback to mock
    }
  };

  useEffect(() => {
    loadTwinData();
  }, []);

  // Scenario Simulator state
  const [scenarioType, setScenarioType] = useState<
    'MAINTENANCE_INTERVENTION' | 'DEFECT_ESCALATION' | 'ROAD_DEFECT' | 'CONGESTION_SURGE' | 'ROAD_CLOSURE'
  >('MAINTENANCE_INTERVENTION');
  const [targetId, setTargetId] = useState<string>('ROAD-01');
  const [simParams, setSimParams] = useState<Record<string, any>>({ defects_to_repair: 2, unit_cost_inr: 12500 });
  const [simLoading, setSimLoading] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const activeRoad = summary.roads.find((r) => r.id === targetId);
  const activeZone = summary.traffic_zones.find((z) => z.id === targetId);

  const handleScenarioChange = (newScenario: typeof scenarioType) => {
    setScenarioType(newScenario);

    if (newScenario === 'CONGESTION_SURGE') {
      const isValidZone = summary.traffic_zones.some((z) => z.id === targetId);
      if (!isValidZone) {
        setTargetId(summary.traffic_zones[0]?.id || 'ZONE-01');
      }
      setSimParams((prev) => ({ target_congestion_level: prev.target_congestion_level || 'HIGH' }));
    } else {
      const isValidRoad = summary.roads.some((r) => r.id === targetId);
      let currentRoadId = targetId;
      if (!isValidRoad) {
        currentRoadId = selectedEntity.type === 'road' ? selectedEntity.data.id : (summary.roads[0]?.id || 'ROAD-01');
        setTargetId(currentRoadId);
      }
      const roadObj = summary.roads.find((r) => r.id === currentRoadId);
      const defects = roadObj?.defect_count || 2;

      if (newScenario === 'MAINTENANCE_INTERVENTION') {
        setSimParams({ defects_to_repair: Math.min(Math.max(1, defects), 10), unit_cost_inr: 12500 });
      } else if (newScenario === 'DEFECT_ESCALATION') {
        setSimParams({ delay_days: 60 });
      } else if (newScenario === 'ROAD_CLOSURE') {
        setSimParams({ detour_multiplier: 1.55 });
      } else if (newScenario === 'ROAD_DEFECT') {
        setSimParams({ additional_defects: 3 });
      }
    }
  };

  const handleLoadIntoSimulator = () => {
    if (!selectedEntity) return;

    if (selectedEntity.type === 'road') {
      const road = selectedEntity.data as TwinRoadSegment;
      setTargetId(road.id);

      const nextScenario = scenarioType === 'CONGESTION_SURGE' ? 'MAINTENANCE_INTERVENTION' : scenarioType;
      setScenarioType(nextScenario);

      if (nextScenario === 'MAINTENANCE_INTERVENTION') {
        setSimParams({
          defects_to_repair: Math.min(Math.max(1, road.defect_count || 2), 10),
          unit_cost_inr: 12500,
        });
      } else if (nextScenario === 'DEFECT_ESCALATION') {
        setSimParams({ delay_days: 60 });
      } else if (nextScenario === 'ROAD_CLOSURE') {
        setSimParams({ detour_multiplier: 1.55 });
      } else if (nextScenario === 'ROAD_DEFECT') {
        setSimParams({ additional_defects: 3 });
      }
    } else if (selectedEntity.type === 'traffic_zone') {
      const zone = selectedEntity.data as TwinTrafficZone;
      setScenarioType('CONGESTION_SURGE');
      setTargetId(zone.id);
      setSimParams({ target_congestion_level: 'HIGH' });
    }

    const simElement = document.getElementById('what-if-simulator');
    if (simElement) {
      simElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleTargetChange = (newId: string) => {
    setTargetId(newId);
    if (scenarioType === 'MAINTENANCE_INTERVENTION') {
      const roadObj = summary.roads.find((r) => r.id === newId);
      if (roadObj) {
        setSimParams((prev) => ({
          ...prev,
          defects_to_repair: Math.min(Math.max(1, roadObj.defect_count || 2), 10),
        }));
      }
    }
  };

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

  const getPriorityColor = (level?: string) => {
    switch ((level || '').toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
    }
  };

  const getFreshnessBadge = (freshness: string) => {
    switch (freshness) {
      case 'FRESH':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> FRESH (&le;15m)
          </span>
        );
      case 'AGING':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span> AGING (15-60m)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-500/10 px-2 py-0.5 text-[10px] font-semibold text-slate-400 border border-slate-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span> STALE (&gt;60m)
          </span>
        );
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
              {isBackend ? 'Live Backend Twin' : 'Simulated Digital Twin'}
            </span>
            <span className="rounded bg-ink-800 px-2 py-0.5 text-[10px] font-medium text-slate-400 border border-ink-700">
              Deterministic Spatial Model
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400 sm:text-sm">
            Continuous digital representation of Pune road segments, traffic corridors, and infrastructure integrating Maintenance Priority, Deterioration Index, Cost Estimator & What-If Simulations.
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
            <span className="text-xs font-medium">Road Defects</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.active_defects}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">Active Observed Defects</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Congested Zones</span>
            <Car className="h-4 w-4 text-purple-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-slate-100">{summary.congested_zones}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">High Density Areas</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">High Priority Roads</span>
            <Sparkles className="h-4 w-4 text-rose-400" />
          </div>
          <p className="mt-2 text-xl font-bold tabular-nums text-rose-400">
            {summary.roads.filter((r) => (r.priority_score || 0) >= 65).length}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">Priority Score &ge; 65</p>
        </div>

        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Est. Network Budget</span>
            <IndianRupee className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-base font-bold tabular-nums text-emerald-400">
            ₹{(summary.roads.reduce((acc, r) => acc + (r.estimated_cost_inr || 0), 0) / 100000).toFixed(1)}L
          </p>
          <p className="mt-0.5 text-[10px] text-slate-500">Prototype Planning Est.</p>
        </div>
      </div>

      {/* Main Grid: Spatial View & Entity Inspector */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Spatial Visualization */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent-400" />
                <h3 className="text-sm font-semibold text-slate-200">
                  Spatial Digital Twin Layer — Pune Fleet Perception Network
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">MapLibre GL Vector / Raster Layer</span>
            </div>

            <MapComponent
              center={{ lat: 18.5312, lng: 73.8445 }}
              zoom={12}
              pedestrianHotspots={pedestrianHotspots}
              showPedestrianRisk={true}
              filters={{ buses: true, potholes: true, waterlogging: true, congestion: true, incidents: true }}
              height="450px"
            />
          </div>

          {/* Testbed Road Corridors & Zones Overview */}
          <div className="rounded-xl border border-ink-700 bg-ink-900 p-4 shadow-sm">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Testbed Road Segments (Digital Twin Entities)
            </h4>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                    <span className={`rounded px-1.5 py-0.2 text-[9px] font-semibold border ${getConditionColor(road.condition_state)}`}>
                      {road.condition_state}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-200 line-clamp-1">{road.name}</p>
                  <div className="flex w-full items-center justify-between pt-1 text-[10px] text-slate-400">
                    <span className={`font-mono font-bold rounded px-1 border ${getPriorityColor(road.priority_level)}`}>
                      Prio: {road.priority_score || 45}/100
                    </span>
                    <span className="font-mono text-amber-300">
                      Det: {road.deterioration_index || 3.5}/10
                    </span>
                    <span className="font-mono text-emerald-300">
                      ₹{((road.estimated_cost_inr || 15000) / 1000).toFixed(0)}k
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Col: Entity Digital Inspector */}
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

                {/* Road Segment Comprehensive Intelligence Panel */}
                {selectedEntity.type === 'road' && (
                  <div className="space-y-3">
                    {/* Maintenance Priority Score & Level */}
                    <div className="rounded-lg border border-accent-500/30 bg-accent-500/5 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-accent-300">Maintenance Priority</span>
                        <span className={`font-mono text-xs font-bold px-1.5 py-0.5 rounded border ${getPriorityColor((selectedEntity.data as TwinRoadSegment).priority_level)}`}>
                          {(selectedEntity.data as TwinRoadSegment).priority_score || 55}/100 ({(selectedEntity.data as TwinRoadSegment).priority_level || 'MEDIUM'})
                        </span>
                      </div>
                      <div className="w-full bg-ink-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-accent-400 h-full rounded-full transition-all"
                          style={{ width: `${(selectedEntity.data as TwinRoadSegment).priority_score || 55}%` }}
                        />
                      </div>
                    </div>

                    {/* Deterioration Index & Trend */}
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-amber-300">Deterioration Index</span>
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {(selectedEntity.data as TwinRoadSegment).deterioration_index || 4.2}/10
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>Trend Classification:</span>
                        <span className="font-semibold text-slate-200">
                          {(selectedEntity.data as TwinRoadSegment).deterioration_trend || 'SLOWLY_DETERIORATING'}
                        </span>
                      </div>
                    </div>

                    {/* Estimated Repair Cost & Range */}
                    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-emerald-300">Estimated Repair Cost</span>
                        <span className="font-mono text-sm font-bold text-emerald-300">
                          ₹{((selectedEntity.data as TwinRoadSegment).estimated_cost_inr || 24000).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Estimated cost range (±20% planning range):</span>
                        <span className="font-mono text-emerald-200">
                          ₹{((selectedEntity.data as TwinRoadSegment).cost_range_min_inr || 20000).toLocaleString('en-IN')} – ₹{((selectedEntity.data as TwinRoadSegment).cost_range_max_inr || 30000).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-[9px] text-emerald-400/80 italic pt-0.5">
                        * Prototype estimate — planning support only
                      </p>
                    </div>

                    {/* Defect Lifecycle Counts */}
                    <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-1.5">
                      <span className="text-[10px] font-bold uppercase text-purple-300 block">Defect Lifecycle on Segment</span>
                      <div className="grid grid-cols-3 gap-1.5 text-[10px] text-center">
                        <div className="rounded bg-ink-850 p-1 border border-ink-750">
                          <span className="text-slate-400 block">Detected</span>
                          <span className="font-bold text-sky-400">{(selectedEntity.data as TwinRoadSegment).lifecycle_counts?.DETECTED ?? 1}</span>
                        </div>
                        <div className="rounded bg-ink-850 p-1 border border-ink-750">
                          <span className="text-slate-400 block">Verified</span>
                          <span className="font-bold text-amber-400">{(selectedEntity.data as TwinRoadSegment).lifecycle_counts?.VERIFIED ?? 1}</span>
                        </div>
                        <div className="rounded bg-ink-850 p-1 border border-ink-750">
                          <span className="text-slate-400 block">In Action</span>
                          <span className="font-bold text-purple-400">{(selectedEntity.data as TwinRoadSegment).lifecycle_counts?.REPAIR_ACTION ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* State & Reliability Metrics */}
                <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Condition State:</span>
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

                  {/* Confidence */}
                  <div className="space-y-1 pt-1 border-t border-ink-700">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Operational Reliability:</span>
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

                {/* Correlated Pedestrian Risk Hotspot */}
                {(() => {
                  const correlatedHotspot = pedestrianHotspots.find((h) => {
                    if (!selectedEntity) return false;
                    const name = selectedEntity.data.name.toLowerCase();
                    const hname = h.road_name.toLowerCase();
                    return name.includes(hname.split(' ')[0]) || hname.includes(name.split(' ')[0]);
                  });
                  if (!correlatedHotspot) return null;
                  return (
                    <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-sky-400" />
                          <span className="text-[10px] font-bold uppercase text-sky-300">
                            Pedestrian Risk Hotspot
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
                          {correlatedHotspot.risk_level} ({Math.round(correlatedHotspot.average_risk_score)}/100)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300">
                        <strong>{correlatedHotspot.road_name}:</strong> {correlatedHotspot.observation_count} obs ({correlatedHotspot.unique_bus_count} buses) · <span className="text-sky-300 font-semibold">{correlatedHotspot.consensus_status?.replace(/_/g, ' ') || 'SINGLE BUS OBSERVATION'}</span> · Trend: <span className="font-semibold text-amber-300">{correlatedHotspot.trend}</span>
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-ink-700 text-[10.5px]">
                        <span className="text-slate-400">Peak: {correlatedHotspot.peak_period}</span>
                        <a
                          href={`#/pedestrian-safety?hotspot=${correlatedHotspot.hotspot_id}`}
                          className="text-sky-400 hover:text-sky-300 font-semibold"
                        >
                          Inspect Risk &rarr;
                        </a>
                      </div>
                    </div>
                  );
                })()}

                {/* Authority Action Operational Context */}
                <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldAlert className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-[10px] font-bold uppercase text-purple-300">
                        Active Authority Actions
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/10 text-purple-300">
                      OPERATIONAL LAYER
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Track field inspections, road repairs, and safety interventions linked to this entity in the Action Center.
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-ink-700 text-[10.5px]">
                    <span className="text-slate-400">Prototype workflow</span>
                    <a
                      href="#/authority-actions"
                      className="text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      Open Action Center &rarr;
                    </a>
                  </div>
                </div>

                {/* Outcome Verification (Closed-Loop Feature #8) */}
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold uppercase text-indigo-300">
                        Outcome Verification
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/40 bg-indigo-500/10 text-indigo-300">
                      CLOSED-LOOP
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Verified Outcome:</span>
                      <span className="font-semibold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                        IMPROVED (Score: 88/100)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Persistence State:</span>
                      <span className="text-slate-300 font-mono">RESOLVED (Observed)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Pending Re-Observation:</span>
                      <span className="text-amber-300 font-bold">1 Action</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-ink-700 text-[10.5px]">
                    <span className="text-slate-400 text-[9.5px]">Evidence sufficiency testbed</span>
                    <a
                      href="#/reobservation"
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      Open Re-Observation &rarr;
                    </a>
                  </div>
                </div>

                {/* Predictive Outlook (Feature #9) */}
                <div className="rounded-lg border border-sky-500/30 bg-sky-500/5 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-sky-400" />
                      <span className="text-[10px] font-bold uppercase text-sky-300">
                        Predictive Risk Outlook
                      </span>
                    </div>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
                      WARNING ALERT
                    </span>
                  </div>
                  <div className="space-y-1.5 text-[11px] text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Trend Direction:</span>
                      <span className="font-semibold text-rose-300 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" /> DETERIORATING (+0.8 index/wk)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Forecast Horizon (7d):</span>
                      <span className="font-mono text-sky-300 font-bold">6.6 / 10 Deterioration</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Maintenance Priority:</span>
                      <span className="text-amber-300 font-semibold">HIGH &rarr; Projected CRITICAL</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Evidence Confidence:</span>
                      <span className="font-mono text-slate-200">88.5% (4 buses)</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-ink-700 text-[10.5px]">
                    <span className="text-slate-400 text-[9.5px]">Decision-support forecast</span>
                    <a
                      href="#/predictive"
                      className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                    >
                      Open Predictive Intel &rarr;
                    </a>
                  </div>
                </div>

                {/* Quick Simulator Link Button */}
                <button
                  onClick={handleLoadIntoSimulator}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-ink-800 border border-ink-700 py-2 text-xs font-medium text-accent-400 hover:bg-ink-750 transition-colors"
                >
                  <Sliders className="h-3.5 w-3.5" />
                  Load into What-If Simulator
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Select any entity from the map or list to inspect twin metadata.</p>
            )}
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

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
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

        {/* Right: What-If Scenario Simulator (5 Scenarios) */}
        <div id="what-if-simulator" className="rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-ink-700 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">What-If Scenario Simulator</h3>
            </div>
            <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
              Decision Support Projections
            </span>
          </div>

          {/* 5 Scenario Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => handleScenarioChange('MAINTENANCE_INTERVENTION')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'MAINTENANCE_INTERVENTION'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              1. Maintenance Action
            </button>
            <button
              onClick={() => handleScenarioChange('DEFECT_ESCALATION')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'DEFECT_ESCALATION'
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              2. Defect Escalation
            </button>
            <button
              onClick={() => handleScenarioChange('ROAD_CLOSURE')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'ROAD_CLOSURE'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              3. Road Closure
            </button>
            <button
              onClick={() => handleScenarioChange('CONGESTION_SURGE')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'CONGESTION_SURGE'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-300 ring-1 ring-purple-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              4. Congestion Surge
            </button>
            <button
              onClick={() => handleScenarioChange('ROAD_DEFECT')}
              className={`rounded-lg border p-2 text-center text-xs font-medium transition-all ${
                scenarioType === 'ROAD_DEFECT'
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 ring-1 ring-blue-500/30'
                  : 'border-ink-700 bg-ink-850 text-slate-400 hover:bg-ink-800'
              }`}
            >
              5. Defect Surge
            </button>
          </div>

          {/* Scenario Configuration Controls */}
          <div className="rounded-lg border border-ink-700 bg-ink-850 p-3 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-semibold">Target Entity:</span>
              <select
                value={targetId}
                onChange={(e) => handleTargetChange(e.target.value)}
                className="rounded bg-ink-800 border border-ink-700 px-2.5 py-1 text-slate-200 text-xs font-mono"
              >
                {scenarioType === 'CONGESTION_SURGE'
                  ? summary.traffic_zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name} ({z.id})</option>
                    ))
                  : summary.roads.map((r) => (
                      <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                    ))}
              </select>
            </div>

            {/* Active Entity Current Condition Bar */}
            {scenarioType !== 'CONGESTION_SURGE' && activeRoad && (
              <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-ink-900/90 p-2 border border-ink-750 text-[10px] text-center font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Condition</span>
                  <span className="text-slate-200 font-bold">{activeRoad.condition_state}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Defects</span>
                  <span className="text-rose-400 font-bold">{activeRoad.defect_count ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Priority</span>
                  <span className="text-amber-400 font-bold">{activeRoad.priority_score ?? 50}/100</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Deterioration</span>
                  <span className="text-sky-400 font-bold">{activeRoad.deterioration_index ?? 3.5}/10</span>
                </div>
              </div>
            )}

            {scenarioType === 'CONGESTION_SURGE' && activeZone && (
              <div className="grid grid-cols-3 gap-1.5 rounded-lg bg-ink-900/90 p-2 border border-ink-750 text-[10px] text-center font-mono">
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Congestion</span>
                  <span className="text-purple-300 font-bold">{activeZone.congestion_level}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Avg Speed</span>
                  <span className="text-amber-400 font-bold">{activeZone.average_observed_speed_kmh ?? 24} km/h</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[9px] uppercase font-sans">Est. Delay</span>
                  <span className="text-rose-400 font-bold">+{activeZone.estimated_delay_min ?? 6} min</span>
                </div>
              </div>
            )}

            {scenarioType === 'MAINTENANCE_INTERVENTION' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Potholes / Cracks to Repair:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={simParams.defects_to_repair || 2}
                  onChange={(e) => setSimParams({ ...simParams, defects_to_repair: Number(e.target.value) || 1 })}
                  className="w-20 rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono text-center"
                />
              </div>
            )}

            {scenarioType === 'DEFECT_ESCALATION' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Maintenance Delay Horizon:</span>
                <select
                  value={simParams.delay_days || 60}
                  onChange={(e) => setSimParams({ ...simParams, delay_days: Number(e.target.value) })}
                  className="rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono"
                >
                  <option value={30}>30 Days Inaction (+35% cost)</option>
                  <option value={60}>60 Days Inaction (+65% cost)</option>
                </select>
              </div>
            )}

            {scenarioType === 'ROAD_CLOSURE' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Detour Congestion Multiplier:</span>
                <input
                  type="number"
                  step="0.1"
                  min="1.1"
                  max="3.0"
                  value={simParams.detour_multiplier || 1.55}
                  onChange={(e) => setSimParams({ ...simParams, detour_multiplier: parseFloat(e.target.value) || 1.5 })}
                  className="w-20 rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono text-center"
                />
              </div>
            )}

            {scenarioType === 'CONGESTION_SURGE' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Projected Congestion Level:</span>
                <select
                  value={simParams.target_congestion_level || 'HIGH'}
                  onChange={(e) => setSimParams({ ...simParams, target_congestion_level: e.target.value })}
                  className="rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            )}

            {scenarioType === 'ROAD_DEFECT' && (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Additional Defect Count:</span>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={simParams.additional_defects || 3}
                  onChange={(e) => setSimParams({ ...simParams, additional_defects: Number(e.target.value) || 1 })}
                  className="w-20 rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono text-center"
                />
              </div>
            )}

            <button
              onClick={handleRunSimulation}
              disabled={simLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-accent-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/20 hover:opacity-90 transition-opacity"
            >
              <Play className={`h-3.5 w-3.5 ${simLoading ? 'animate-spin' : ''}`} />
              {simLoading ? 'Projecting Mathematical Model...' : 'Execute What-If Projection'}
            </button>
          </div>

          {/* Simulation Output Card */}
          {simResult && (
            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4 space-y-3 animate-fade-in text-xs">
              <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                <span className="font-bold text-purple-300 uppercase tracking-wide">Projection Output</span>
                <span className="text-[10px] text-purple-400 font-mono">{simResult.target_name}</span>
              </div>

              <p className="text-slate-200 leading-relaxed font-medium">
                {simResult.impact_summary}
              </p>

              {/* Delta Box */}
              <div className="grid grid-cols-2 gap-2 bg-ink-900/80 p-2.5 rounded border border-ink-700 font-mono text-[11px]">
                {Object.entries(simResult.delta).map(([key, val]) => (
                  <div key={key}>
                    <span className="text-slate-400 text-[10px] block capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="text-accent-300 font-bold">{String(val)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 text-[10px] text-slate-400 font-mono">
                <div>Formula: <span className="text-slate-300">{simResult.formula_used}</span></div>
                <div className="text-amber-400/90 font-semibold">{simResult.disclaimer}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
