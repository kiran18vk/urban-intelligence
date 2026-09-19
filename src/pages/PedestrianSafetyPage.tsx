import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  MapPin,
  Bus,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2,
  ArrowRight,
  Filter,
  Car,
  Activity,
  Lightbulb,
  Crosshair,
  Layers,
  ChevronRight,
  Eye,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { MapComponent } from '@/components/Map/MapComponent';
import { apiService } from '@/services/api';
import type {
  PedestrianHotspot,
  PedestrianSummary,
  PedestrianRiskLevel,
  PedestrianTrendDirection,
  PedestrianDataSufficiency,
  PedestrianWhatIfResult,
} from '@/types';

export function PedestrianSafetyPage() {
  const [searchParams] = useSearchParams();
  const initialHotspotId = searchParams.get('hotspot');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<PedestrianHotspot[]>([]);
  const [summary, setSummary] = useState<PedestrianSummary | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<PedestrianHotspot | null>(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState<string>('ALL');
  const [trendFilter, setTrendFilter] = useState<string>('ALL');

  // What-If Simulation State
  const [selectedScenario, setSelectedScenario] = useState<string>('CROSSING_IMPROVEMENT');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<PedestrianWhatIfResult | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [hotspotList, summaryData] = await Promise.all([
        apiService.getPedestrianHotspots(),
        apiService.getPedestrianSummary(),
      ]);
      setHotspots(hotspotList);
      setSummary(summaryData);

      if (hotspotList.length > 0) {
        if (initialHotspotId) {
          const match = hotspotList.find((h) => h.hotspot_id === initialHotspotId);
          setSelectedHotspot(match || hotspotList[0]);
        } else {
          setSelectedHotspot(hotspotList[0]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pedestrian safety data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Sync initial param if loaded
  useEffect(() => {
    if (initialHotspotId && hotspots.length > 0) {
      const match = hotspots.find((h) => h.hotspot_id === initialHotspotId);
      if (match) {
        setSelectedHotspot(match);
      }
    }
  }, [initialHotspotId, hotspots]);

  // Reset simulation when selected hotspot changes
  useEffect(() => {
    setSimulationResult(null);
  }, [selectedHotspot?.hotspot_id]);

  const [isCreatingAction, setIsCreatingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    if (!selectedHotspot) return;
    setIsSimulating(true);
    try {
      const res = await apiService.simulatePedestrianMitigation(
        selectedHotspot.hotspot_id,
        selectedScenario
      );
      setSimulationResult(res);
    } catch (err) {
      console.error('Simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCreateSafetyAction = async () => {
    if (!selectedHotspot) return;
    setIsCreatingAction(true);
    try {
      const created = await apiService.createAuthorityAction({
        target_id: selectedHotspot.hotspot_id,
        target_type: 'PEDESTRIAN_HOTSPOT',
        event_type: 'PEDESTRIAN_RISK',
        title: `Pedestrian Safety Action: ${selectedHotspot.name} (${selectedHotspot.road_name})`,
        description: `Observed risk score ${selectedHotspot.current_risk_score}/100 (${selectedHotspot.risk_level}). Corroborated by ${selectedHotspot.unique_bus_count} buses with ${selectedHotspot.total_proximity_events} proximity conflicts. Recommended: ${selectedHotspot.recommendations[0]?.title || 'Safety evaluation'}.`,
        severity: selectedHotspot.risk_level === 'CRITICAL' ? 'CRITICAL' : selectedHotspot.risk_level === 'HIGH' ? 'HIGH' : 'MEDIUM',
        latitude: selectedHotspot.latitude,
        longitude: selectedHotspot.longitude,
        source_bus_ids: ['PMP-BUS-001', 'PMP-BUS-007'],
        operational_confidence: 0.85,
        reliability: 0.88,
        simulated_gps: true,
        action_type: 'SAFETY_INTERVENTION',
        assigned_team: 'Public Safety',
      });
      setActionSuccess(`Safety Action ${created.action_id} created. Redirecting to Action Center...`);
      setTimeout(() => {
        window.location.hash = '#/authority-actions';
      }, 1000);
    } catch (err: any) {
      alert(`Failed to create safety action: ${err.message || 'Error'}`);
    } finally {
      setIsCreatingAction(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  // Filtered Hotspots
  const filteredHotspots = hotspots.filter((h) => {
    if (levelFilter !== 'ALL' && h.risk_level.toUpperCase() !== levelFilter) return false;
    if (trendFilter !== 'ALL' && h.trend.toUpperCase() !== trendFilter) return false;
    return true;
  });

  const getRiskBadgeClass = (level: PedestrianRiskLevel | string) => {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MODERATE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  const getTrendIcon = (trend: PedestrianTrendDirection | string) => {
    switch (trend) {
      case 'INCREASING':
        return <TrendingUp className="h-3.5 w-3.5 text-rose-400" />;
      case 'DECREASING':
        return <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />;
      case 'STABLE':
        return <Minus className="h-3.5 w-3.5 text-slate-400" />;
      default:
        return <span className="text-[10px] text-slate-500 font-mono">N/A</span>;
    }
  };

  const getSufficiencyBadge = (s: PedestrianDataSufficiency | string) => {
    switch (s) {
      case 'GOOD':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9.5px] font-semibold text-emerald-300">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            GOOD DATA
          </span>
        );
      case 'LIMITED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-300">
            <span className="h-1 w-1 rounded-full bg-amber-400" />
            LIMITED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-slate-500/15 border border-slate-500/30 px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-400">
            <span className="h-1 w-1 rounded-full bg-slate-400" />
            INSUFFICIENT
          </span>
        );
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent-400" />
              <h2 className="text-lg font-bold text-slate-100">
                PEDestrian Risk Intelligence & Mitigation Engine
              </h2>
              <span className="rounded bg-accent-500/20 border border-accent-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-accent-300 uppercase">
                Decision Support
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 max-w-4xl">
              Spatial & temporal risk correlation from mobile fleet perceptions, explainable factor attribution, trend tracking, and What-If mitigation modeling.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 rounded-lg border border-ink-750 text-[11px] text-slate-400">
            <Info className="h-3.5 w-3.5 text-accent-400 flex-shrink-0" />
            <span>Prototype risk score based on observed indicators. Requires authority review.</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Risk Hotspots</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-slate-100">{summary.total_hotspots}</span>
              <span className="text-[10px] text-slate-500">Correlated</span>
            </div>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-300 block">High / Critical</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-rose-400">{summary.high_critical_count}</span>
              <span className="text-[10px] text-rose-300/80">Priority Focus</span>
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Observations</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-sky-400">{summary.total_risk_observations}</span>
              <span className="text-[10px] text-slate-500">Fleet Passes</span>
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Average Risk Score</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-amber-300">{summary.average_risk_score}</span>
              <span className="text-[10px] text-slate-500">/ 100</span>
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Peak Observed Period</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold font-mono text-purple-300 truncate">{summary.peak_observed_period}</span>
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Increasing Trend</span>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xl font-bold font-mono text-rose-400">{summary.increasing_hotspots_count}</span>
              <span className="text-[10px] text-slate-500">Hotspots</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Layout: Left Table List, Right Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Hotspot List (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-ink-850 p-2.5 rounded-xl border border-ink-700 text-xs">
            <div className="flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-slate-400 font-semibold text-[11px]">Level:</span>
              <div className="flex gap-1">
                {['ALL', 'CRITICAL', 'HIGH', 'MODERATE'].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition ${
                      levelFilter === lvl
                        ? 'bg-accent-500 text-white shadow'
                        : 'bg-ink-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px]">Trend:</span>
              <select
                value={trendFilter}
                onChange={(e) => setTrendFilter(e.target.value)}
                className="bg-ink-900 border border-ink-750 text-slate-300 text-[10.5px] rounded px-2 py-0.5"
              >
                <option value="ALL">All Trends</option>
                <option value="INCREASING">Increasing</option>
                <option value="STABLE">Stable</option>
                <option value="DECREASING">Decreasing</option>
              </select>
            </div>
          </div>

          {/* Hotspots Card List */}
          <div className="space-y-2 max-h-[780px] overflow-y-auto pr-1">
            {filteredHotspots.length === 0 ? (
              <EmptyState title="No hotspots match filter" message="Adjust risk level or trend filters above." />
            ) : (
              filteredHotspots.map((h) => {
                const isSelected = selectedHotspot?.hotspot_id === h.hotspot_id;
                return (
                  <div
                    key={h.hotspot_id}
                    onClick={() => setSelectedHotspot(h)}
                    className={`cursor-pointer rounded-xl border p-3 transition ${
                      isSelected
                        ? 'border-accent-500 bg-ink-800 shadow-md ring-1 ring-accent-500/40'
                        : 'border-ink-750 bg-ink-850 hover:bg-ink-800/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] text-slate-500">{h.hotspot_id}</span>
                          {getSufficiencyBadge(h.data_sufficiency)}
                        </div>
                        <h4 className="font-bold text-sm text-slate-100 mt-0.5">{h.name}</h4>
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-500" />
                          {h.road_name}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`inline-block rounded-md border px-2 py-0.5 text-xs font-mono font-bold ${getRiskBadgeClass(h.risk_level)}`}>
                          {h.current_risk_score} · {h.risk_level}
                        </span>
                        <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-slate-400">
                          {getTrendIcon(h.trend)}
                          <span className="font-mono text-[10px]">{h.trend}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-ink-750 flex items-center justify-between text-[11px] text-slate-400">
                      <div className="flex items-center gap-2">
                        <span><strong>{h.unique_bus_count}</strong> buses</span>
                        <span>·</span>
                        <span>{h.observation_count} obs</span>
                      </div>
                      <span className={`text-[9.5px] font-mono font-semibold px-1.5 py-0.2 rounded border ${
                        h.consensus_status === 'MULTI_BUS_CONSENSUS'
                          ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10'
                          : h.consensus_status === 'MULTI_BUS_CORROBORATION'
                          ? 'border-sky-500/40 text-sky-300 bg-sky-500/10'
                          : 'border-slate-600 text-slate-400 bg-ink-900'
                      }`}>
                        {h.consensus_status === 'MULTI_BUS_CONSENSUS' ? 'CONSENSUS' : h.consensus_status === 'MULTI_BUS_CORROBORATION' ? 'CORROBORATED' : '1 BUS'}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Hotspot Inspector & Mitigation What-If (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-3">
          {selectedHotspot ? (
            <>
              {/* Main Hotspot Detail Card */}
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-ink-700 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent-400">
                        {selectedHotspot.hotspot_id}
                      </span>
                      {getSufficiencyBadge(selectedHotspot.data_sufficiency)}
                      <span className="text-[10px] font-mono text-slate-500">
                        {selectedHotspot.road_id}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-100 mt-1">{selectedHotspot.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 text-accent-400" />
                      <span>{selectedHotspot.road_name} ({selectedHotspot.latitude?.toFixed(4) || 0}, {selectedHotspot.longitude?.toFixed(4) || 0})</span>
                    </p>
                  </div>

                  {/* Primary 0-100 Score Gauge */}
                  <div className="rounded-xl bg-ink-900 border border-ink-750 p-3 text-center sm:min-w-[170px]">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                      Composite Risk Score
                    </span>
                    <div className="mt-1 flex items-baseline justify-center gap-1.5">
                      <span className="text-3xl font-extrabold font-mono text-slate-100">
                        {selectedHotspot.current_risk_score}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">/ 100</span>
                    </div>
                    <div className="mt-1 flex items-center justify-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getRiskBadgeClass(selectedHotspot.risk_level)}`}>
                        {selectedHotspot.risk_level}
                      </span>
                    </div>
                    <span className="mt-1.5 block text-[9.5px] text-amber-300/90 font-medium">
                      Prototype risk score based on observed indicators
                    </span>
                  </div>
                </div>

                {/* Key Intelligence Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="rounded-lg bg-ink-900 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Unique Bus Coverage</span>
                    <span className="text-base font-bold font-mono text-slate-200">
                      {selectedHotspot.unique_bus_count} <span className="text-xs text-slate-500 font-normal">buses</span>
                    </span>
                  </div>
                  <div className="rounded-lg bg-ink-900 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Pedestrians Detected</span>
                    <span className="text-base font-bold font-mono text-sky-300">
                      {selectedHotspot.total_pedestrians_observed} <span className="text-xs text-slate-500 font-normal">observed</span>
                    </span>
                  </div>
                  <div className="rounded-lg bg-ink-900 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Proximity Events</span>
                    <span className="text-base font-bold font-mono text-rose-400">
                      {selectedHotspot.total_proximity_events} <span className="text-xs text-slate-500 font-normal">conflicts</span>
                    </span>
                  </div>
                  <div className="rounded-lg bg-ink-900 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Trend Pattern</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {getTrendIcon(selectedHotspot.trend)}
                      <span className="text-xs font-bold font-mono text-slate-200">{selectedHotspot.trend}</span>
                    </div>
                  </div>
                </div>

                {/* 7-Point Trend History Progression */}
                <div className="rounded-lg bg-ink-900/80 p-2.5 border border-ink-750 flex items-center justify-between text-xs">
                  <span className="text-[10.5px] font-semibold text-slate-400">Pass-by Risk Progression:</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-slate-300 text-xs">
                    {selectedHotspot.trend_history.map((pt, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded ${pt >= 75 ? 'bg-rose-500/20 text-rose-300' : pt >= 50 ? 'bg-amber-500/20 text-amber-300' : 'bg-ink-800 text-slate-300'}`}>
                          {pt}
                        </span>
                        {idx < selectedHotspot.trend_history.length - 1 && <span className="text-slate-600">→</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* INDEPENDENT BUS CORROBORATION SECTION */}
              <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-sky-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-sky-300">
                      Independent Bus Corroboration
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                    selectedHotspot.consensus_status === 'MULTI_BUS_CONSENSUS'
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : selectedHotspot.consensus_status === 'MULTI_BUS_CORROBORATION'
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  }`}>
                    {selectedHotspot.consensus_status?.replace(/_/g, ' ') || 'SINGLE BUS OBSERVATION'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="rounded-lg bg-ink-900/90 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Confirming Buses</span>
                    <span className="text-lg font-bold font-mono text-sky-300 mt-0.5 block">
                      {selectedHotspot.unique_bus_count} <span className="text-xs text-slate-400 font-normal">independent</span>
                    </span>
                  </div>

                  <div className="rounded-lg bg-ink-900/90 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Total Observations</span>
                    <span className="text-lg font-bold font-mono text-slate-200 mt-0.5 block">
                      {selectedHotspot.observation_count} <span className="text-xs text-slate-400 font-normal">passes</span>
                    </span>
                  </div>

                  <div className="rounded-lg bg-ink-900/90 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Corroboration Strength</span>
                    <span className={`text-sm font-bold font-mono mt-0.5 block ${
                      (selectedHotspot.consensus_strength ?? 0.33) >= 1.0
                        ? 'text-emerald-400'
                        : (selectedHotspot.consensus_strength ?? 0.33) >= 0.6
                        ? 'text-sky-400'
                        : 'text-amber-400'
                    }`}>
                      {(selectedHotspot.consensus_strength ?? 0.33) >= 1.0 ? 'HIGH' : (selectedHotspot.consensus_strength ?? 0.33) >= 0.6 ? 'MODERATE' : 'LOW'} ({( (selectedHotspot.consensus_strength ?? 0.33) * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <div className="rounded-lg bg-ink-900/90 p-2.5 border border-ink-750">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">Corroboration Freshness</span>
                    <span className="text-xs font-bold font-mono text-slate-300 mt-1 block">
                      {selectedHotspot.consensus_freshness || 'FRESH'}
                    </span>
                  </div>
                </div>

                {/* Confirming Bus IDs Tag list */}
                {selectedHotspot.confirming_bus_ids && selectedHotspot.confirming_bus_ids.length > 0 && (
                  <div className="flex items-center gap-2 pt-1 border-t border-sky-500/20 text-xs">
                    <span className="text-[10.5px] text-slate-400 font-semibold">Confirming Fleet:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedHotspot.confirming_bus_ids.map((bid) => (
                        <span key={bid} className="rounded bg-ink-900 border border-sky-500/30 px-2 py-0.5 font-mono text-[10.5px] text-sky-300">
                          {bid}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic">
                  * Consensus represents independent bus corroboration across fleet journeys, not statistical or legal proof.
                </p>
              </div>

              {/* WHY THIS LOCATION IS FLAGGED (Explainability Layer) */}
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-accent-300">
                      Why This Location Is Flagged
                    </h4>
                  </div>
                  <span className="text-[10px] font-mono text-accent-400/90 font-semibold">
                    Explainable Factor Attribution
                  </span>
                </div>

                {/* Grounded reasons bullet list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {selectedHotspot.risk_factors.map((reason, idx) => (
                    <div key={idx} className="flex items-center gap-2 rounded bg-ink-900/90 p-2 border border-ink-750">
                      <span className="text-accent-400 font-bold">✓</span>
                      <span className="text-slate-300 leading-snug">{reason}</span>
                    </div>
                  ))}
                </div>

                {/* Factor Contribution Grid */}
                <div className="pt-2 border-t border-accent-500/20 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
                  {selectedHotspot.factor_breakdown.map((f) => (
                    <div key={f.key} className="rounded bg-ink-900/70 p-2 border border-ink-750">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span className="truncate">{f.name}</span>
                        <span className="text-accent-400 font-bold">{(f.weight * 100).toFixed(0)}%</span>
                      </div>
                      <span className="text-slate-200 font-bold mt-0.5 block">{f.score.toFixed(0)} / 100</span>
                      <p className="text-[9.5px] text-slate-500 truncate mt-0.5">{f.evidence_text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observed Time-of-Day Pattern */}
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Time-of-Day Risk Distribution
                    </h4>
                  </div>
                  <span className="text-xs font-mono font-bold text-purple-300">
                    Peak: {selectedHotspot.peak_period}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {selectedHotspot.time_distribution.map((slot) => (
                    <div
                      key={slot.time_window}
                      className={`rounded-lg p-2.5 border ${
                        slot.time_window === selectedHotspot.peak_period
                          ? 'border-purple-500/40 bg-purple-500/10'
                          : 'border-ink-750 bg-ink-900'
                      }`}
                    >
                      <span className="text-[10px] text-slate-400 font-semibold block">{slot.time_window}</span>
                      <div className="flex items-baseline justify-between mt-1">
                        <span className="font-mono text-base font-bold text-slate-200">{slot.average_risk_score}</span>
                        <span className={`text-[10px] font-semibold ${slot.risk_level === 'CRITICAL' ? 'text-rose-400' : slot.risk_level === 'HIGH' ? 'text-amber-400' : 'text-slate-400'}`}>
                          {slot.risk_level}
                        </span>
                      </div>
                      <span className="text-[9.5px] text-slate-500 font-mono block mt-0.5">
                        {slot.observation_count} obs
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* RECOMMENDED MITIGATION ACTIONS (Authority Review) */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Recommended Mitigation Actions
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCreateSafetyAction}
                      disabled={isCreatingAction}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition flex items-center gap-1 disabled:opacity-50"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      CREATE SAFETY ACTION
                    </button>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                      For Authority Review
                    </span>
                  </div>
                </div>
                {actionSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 font-medium">
                    {actionSuccess}
                  </div>
                )}

                <div className="space-y-2 text-xs">
                  {selectedHotspot.recommendations.map((rec) => (
                    <div
                      key={rec.priority}
                      className="rounded-lg bg-ink-900/90 p-3 border border-ink-750 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                            {rec.priority}
                          </span>
                          <h5 className="font-bold text-slate-100">{rec.title}</h5>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
                          ~ -{rec.estimated_score_reduction_points} pts
                        </span>
                      </div>
                      <p className="text-slate-300 leading-relaxed pl-7">{rec.description}</p>
                      <p className="text-[10.5px] text-slate-500 pl-7 italic">Rationale: {rec.rationale}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded bg-ink-900/80 p-2 border border-ink-750 text-[10.5px] text-slate-400 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <span>
                    Prototype decision-support recommendation based on observed indicators. All interventions require formal traffic authority review and engineering validation.
                  </span>
                </div>
              </div>

              {/* WHAT-IF MITIGATION SCENARIO SIMULATOR */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="h-4 w-4 text-purple-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      What-If Mitigation Scenario Simulator
                    </h4>
                  </div>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-purple-300 border border-purple-500/30">
                    Scenario Model
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] uppercase text-slate-400 font-semibold block mb-1">
                      Select Safety Intervention Scenario:
                    </label>
                    <select
                      value={selectedScenario}
                      onChange={(e) => setSelectedScenario(e.target.value)}
                      className="w-full rounded-lg bg-ink-900 border border-ink-750 px-3 py-2 text-xs text-slate-200 font-medium"
                    >
                      <option value="CROSSING_IMPROVEMENT">Pedestrian Crossing Improvement (-18 pts)</option>
                      <option value="STREET_LIGHTING">Street Lighting & Visibility Enhancement (-12 pts)</option>
                      <option value="TRAFFIC_CALMING">Traffic Calming & Speed Reduction (-15 pts)</option>
                      <option value="TARGETED_ENFORCEMENT">Targeted Peak-Period Traffic Management (-10 pts)</option>
                      <option value="COMBINED_INTERVENTION">Combined Comprehensive Safety Intervention (-28 pts)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleRunSimulation}
                      disabled={isSimulating}
                      className="w-full rounded-lg bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 disabled:opacity-50"
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                      {isSimulating ? 'Simulating...' : 'Run What-If'}
                    </button>
                  </div>
                </div>

                {/* Simulation Output Card */}
                {simulationResult && (
                  <div className="rounded-xl border border-purple-500/40 bg-ink-900 p-3.5 space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-purple-300">{simulationResult.scenario_name}</span>
                      <span className="text-[10px] font-mono text-slate-400 italic">
                        {simulationResult.disclaimer}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-ink-750 font-mono">
                      <div className="rounded bg-ink-850 p-2 border border-ink-750">
                        <span className="text-[9.5px] text-slate-500 block uppercase">Current Risk</span>
                        <span className="text-base font-bold text-rose-400">{simulationResult.baseline_score}</span>
                        <span className="text-[9px] text-slate-400 block font-sans font-semibold">{simulationResult.baseline_level}</span>
                      </div>

                      <div className="rounded bg-emerald-950/30 p-2 border border-emerald-500/30">
                        <span className="text-[9.5px] text-emerald-400 block uppercase">Projected Score</span>
                        <span className="text-base font-bold text-emerald-300">{simulationResult.simulated_score}</span>
                        <span className="text-[9px] text-emerald-300 block font-sans font-semibold">{simulationResult.simulated_level}</span>
                      </div>

                      <div className="rounded bg-purple-950/30 p-2 border border-purple-500/30">
                        <span className="text-[9.5px] text-purple-300 block uppercase">Modelled Delta</span>
                        <span className="text-base font-bold text-purple-300">{simulationResult.score_delta} pts</span>
                        <span className="text-[9px] text-purple-400 block font-sans font-semibold">Risk Reduction</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Location Geolocation GIS Map */}
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Hotspot Geolocation & Corridor Context
                    </h4>
                  </div>
                  <span className="text-[10.5px] font-semibold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                    Simulated GPS (Deterministic)
                  </span>
                </div>

                <div className="rounded-lg overflow-hidden border border-ink-750">
                  <MapComponent
                    center={{ lat: selectedHotspot.latitude, lng: selectedHotspot.longitude }}
                    zoom={15}
                    height="240px"
                  />
                </div>
              </div>
            </>
          ) : (
            <EmptyState title="No Hotspot Selected" message="Select a pedestrian risk hotspot from the list to view intelligence and mitigations." />
          )}
        </div>
      </div>
    </div>
  );
}
