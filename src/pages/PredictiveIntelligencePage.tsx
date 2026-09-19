import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
  Car,
  Users,
  Activity,
  ChevronRight,
  Info,
  CheckCircle2,
  Wrench,
  TrafficCone,
  Compass,
  AlertOctagon,
  Sparkles,
  ExternalLink,
  History,
  Radio,
  Sliders,
  Maximize2
} from 'lucide-react';
import { api } from '@/services/api';
import type {
  PredictiveForecast,
  ForecastSummary,
  ForecastHistoryEntry,
  ForecastTargetType,
  TrendDirectionType,
  ForecastRiskLevel,
  ForecastWarningLevel
} from '@/types';
import { MapComponent } from '@/components/Map/MapComponent';

export const PredictiveIntelligencePage: React.FC = () => {
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [forecasts, setForecasts] = useState<PredictiveForecast[]>([]);
  const [selectedForecast, setSelectedForecast] = useState<PredictiveForecast | null>(null);
  const [history, setHistory] = useState<ForecastHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRecomputing, setIsRecomputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>('ALL');
  const [trendFilter, setTrendFilter] = useState<string>('ALL');
  const [warningFilter, setWarningFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Action modal
  const [isActionModalOpen, setIsActionModalOpen] = useState<boolean>(false);
  const [operatorNotes, setOperatorNotes] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, queueRes] = await Promise.all([
        api.getPredictiveSummary(),
        api.getPredictiveForecasts({
          target_type: targetTypeFilter,
          risk_level: riskLevelFilter,
          trend_direction: trendFilter,
          warning_level: warningFilter,
          search: searchTerm,
        }),
      ]);
      setSummary(sumRes);
      setForecasts(queueRes.items);
      if (queueRes.items.length > 0 && !selectedForecast) {
        setSelectedForecast(queueRes.items[0]);
      } else if (selectedForecast) {
        const found = queueRes.items.find((f) => f.forecast_id === selectedForecast.forecast_id);
        if (found) setSelectedForecast(found);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading predictive intelligence data:', err);
      setError('Failed to load predictive forecasting data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetTypeFilter, riskLevelFilter, trendFilter, warningFilter, searchTerm]);

  useEffect(() => {
    if (!selectedForecast) {
      setHistory([]);
      return;
    }
    api.getPredictiveHistory(selectedForecast.forecast_id)
      .then((hist) => setHistory(hist))
      .catch((err) => console.warn('Could not load forecast history:', err));
  }, [selectedForecast?.forecast_id]);

  const handleSelectForecast = (fcst: PredictiveForecast) => {
    setSelectedForecast(fcst);
    setActionSuccessMsg(null);
  };

  const handleRecompute = async () => {
    try {
      setIsRecomputing(true);
      await api.recomputePredictiveForecasts();
      await loadData();
    } catch (err: any) {
      alert(`Recompute failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRecomputing(false);
    }
  };

  const handleCreateAction = async () => {
    if (!selectedForecast) return;
    try {
      setIsSubmittingAction(true);
      const res = await api.createAuthorityActionFromForecast(selectedForecast.forecast_id, {
        operator: 'Console Operator',
        custom_notes: operatorNotes.trim() || `Preventive action generated from ${selectedForecast.trend_direction} forecast.`,
      });
      setActionSuccessMsg(`Created action ticket: ${res.authority_action_id}`);
      setIsActionModalOpen(false);
      setOperatorNotes('');
      // Reload history
      const updatedHist = await api.getPredictiveHistory(selectedForecast.forecast_id);
      setHistory(updatedHist);
    } catch (err: any) {
      alert(`Action creation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper Badges
  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'DETERIORATING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-rose-950/80 text-rose-300 border border-rose-500/40">
            <TrendingUp className="h-3 w-3 text-rose-400" /> DETERIORATING
          </span>
        );
      case 'IMPROVING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/40">
            <TrendingDown className="h-3 w-3 text-emerald-400" /> IMPROVING
          </span>
        );
      case 'STABLE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-blue-950/80 text-blue-300 border border-blue-500/40">
            <Minus className="h-3 w-3 text-blue-400" /> STABLE
          </span>
        );
      case 'VOLATILE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Activity className="h-3 w-3 text-amber-400" /> VOLATILE
          </span>
        );
      case 'INSUFFICIENT_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded bg-slate-800 text-slate-400 border border-slate-700">
            <Info className="h-3 w-3" /> INSUFFICIENT DATA
          </span>
        );
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950 text-red-400 border border-red-500/50">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-950 text-orange-400 border border-orange-500/50">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      case 'LOW':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">LOW</span>;
    }
  };

  const getWarningBadge = (warning: string) => {
    switch (warning) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-600 text-white animate-pulse">ALERT: CRITICAL</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-950 text-rose-300 border border-rose-500/50">WARNING</span>;
      case 'WATCH':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-950 text-amber-300 border border-amber-500/40">WATCH</span>;
      case 'INFO':
      default:
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-300 border border-slate-700">INFO</span>;
    }
  };

  const getTargetTypeBadge = (type: string) => {
    switch (type) {
      case 'ROAD_DETERIORATION':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-950/70 text-amber-300 border border-amber-500/30">ROAD DETERIORATION</span>;
      case 'TRAFFIC_CONGESTION':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-950/70 text-blue-300 border border-blue-500/30">TRAFFIC CONGESTION</span>;
      case 'PEDESTRIAN_RISK':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-950/70 text-rose-300 border border-rose-500/30">PEDESTRIAN RISK</span>;
      case 'PERSISTENT_HOTSPOT':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-950/70 text-purple-300 border border-purple-500/30">PERSISTENT HOTSPOT</span>;
      case 'MAINTENANCE_PRIORITY':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">MAINTENANCE PRIORITY</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-indigo-400" />
              PREDICTIVE URBAN INTELLIGENCE &amp; RISK FORECASTING
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-500/40 rounded-full">
              PROTOTYPE FORECASTING
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Deterministic spatial and temporal trend forecasting evaluating road surface degradation, traffic bottlenecks, pedestrian conflict points, and maintenance priorities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRecompute}
            disabled={isRecomputing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isRecomputing ? 'animate-spin' : ''}`} />
            {isRecomputing ? 'Recomputing...' : 'Recompute Forecasts'}
          </button>
        </div>
      </div>

      {/* Mandatory Honesty Disclosure Banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-indigo-500/30 text-xs text-slate-300 flex items-start gap-3 shadow-sm">
        <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-slate-100">
            Prototype Decision Support Disclosure
          </p>
          <p className="text-slate-400 leading-relaxed">
            Prototype forecasting: outlooks are derived from available testbed observations and are not guaranteed future events. Forecast confidence reflects evidence quality, not probability of occurrence. Simulated GPS (Deterministic) testbed data used for prototype evaluation.
          </p>
        </div>
      </div>

      {/* Top 6 KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Active Forecasts</span>
          <div className="text-2xl font-bold font-mono text-white">
            {summary?.active_forecasts ?? 6}
          </div>
          <p className="text-[10px] text-slate-500">Monitored corridors</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 bg-rose-950/10 space-y-1">
          <span className="text-xs font-semibold uppercase text-rose-300">Early Warnings</span>
          <div className="text-2xl font-bold font-mono text-rose-400">
            {summary?.warnings ?? 4}
          </div>
          <p className="text-[10px] text-rose-400/70">Warning / Watch alerts</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/30 bg-amber-950/10 space-y-1">
          <span className="text-xs font-semibold uppercase text-amber-300">Deteriorating</span>
          <div className="text-2xl font-bold font-mono text-amber-400">
            {summary?.deteriorating_areas ?? 5}
          </div>
          <p className="text-[10px] text-amber-400/70">Upward risk drift</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-purple-500/30 bg-purple-950/10 space-y-1">
          <span className="text-xs font-semibold uppercase text-purple-300">Persistent Hotspots</span>
          <div className="text-2xl font-bold font-mono text-purple-400">
            {summary?.persistent_hotspots ?? 3}
          </div>
          <p className="text-[10px] text-purple-400/70">Recurring conflict nodes</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 bg-indigo-950/10 space-y-1">
          <span className="text-xs font-semibold uppercase text-indigo-300">Action Triggers</span>
          <div className="text-2xl font-bold font-mono text-indigo-400">
            {summary?.forecast_actions ?? 5}
          </div>
          <p className="text-[10px] text-indigo-400/70">Preventive recommendations</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-xs font-semibold uppercase text-slate-400">Insufficient Data</span>
          <div className="text-2xl font-bold font-mono text-slate-400">
            {summary?.insufficient_data ?? 1}
          </div>
          <p className="text-[10px] text-slate-500">Need fleet passes</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search forecast ID, location, target, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={targetTypeFilter}
          onChange={(e) => setTargetTypeFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Forecast Targets</option>
          <option value="ROAD_DETERIORATION">Road Deterioration</option>
          <option value="TRAFFIC_CONGESTION">Traffic Congestion</option>
          <option value="PEDESTRIAN_RISK">Pedestrian Risk</option>
          <option value="PERSISTENT_HOTSPOT">Persistent Hotspot</option>
          <option value="MAINTENANCE_PRIORITY">Maintenance Priority</option>
        </select>

        <select
          value={riskLevelFilter}
          onChange={(e) => setRiskLevelFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical Risk</option>
          <option value="HIGH">High Risk</option>
          <option value="MEDIUM">Medium Risk</option>
          <option value="LOW">Low Risk</option>
        </select>

        <select
          value={trendFilter}
          onChange={(e) => setTrendFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Trend Directions</option>
          <option value="DETERIORATING">Deteriorating</option>
          <option value="IMPROVING">Improving</option>
          <option value="STABLE">Stable</option>
          <option value="VOLATILE">Volatile</option>
          <option value="INSUFFICIENT_DATA">Insufficient Data</option>
        </select>

        <select
          value={warningFilter}
          onChange={(e) => setWarningFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 px-3 py-1.5 focus:outline-none focus:border-indigo-500"
        >
          <option value="ALL">All Warning Levels</option>
          <option value="CRITICAL">Critical Alert</option>
          <option value="WARNING">Warning</option>
          <option value="WATCH">Watch</option>
          <option value="INFO">Info</option>
        </select>

        {(targetTypeFilter !== 'ALL' || riskLevelFilter !== 'ALL' || trendFilter !== 'ALL' || warningFilter !== 'ALL' || searchTerm) && (
          <button
            onClick={() => {
              setTargetTypeFilter('ALL');
              setRiskLevelFilter('ALL');
              setTrendFilter('ALL');
              setWarningFilter('ALL');
              setSearchTerm('');
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold px-2 py-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main 2-Column Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT: Forecast Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Forecast Outlook Queue ({forecasts.length})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Simulated GPS</span>
          </div>

          <div className="space-y-2.5 max-h-[820px] overflow-y-auto pr-1">
            {forecasts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs rounded-xl bg-slate-900 border border-slate-800">
                No forecasts match the selected filter criteria.
              </div>
            ) : (
              forecasts.map((fcst) => {
                const isSelected = selectedForecast?.forecast_id === fcst.forecast_id;
                return (
                  <div
                    key={fcst.forecast_id}
                    onClick={() => handleSelectForecast(fcst)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2.5 ${
                      isSelected
                        ? 'bg-slate-900 border-indigo-500 shadow-md ring-1 ring-indigo-500/20'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            {fcst.forecast_id}
                          </span>
                          {getTargetTypeBadge(fcst.target_type)}
                        </div>
                        <p className="text-xs font-medium text-slate-300 mt-1 line-clamp-1">
                          {fcst.location_name}
                        </p>
                      </div>
                      {getWarningBadge(fcst.early_warning)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800/80 text-[11px]">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Current</span>
                        <span className="font-mono font-bold text-slate-300">{fcst.current_display_label}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Trend</span>
                        <div>{getTrendBadge(fcst.trend_direction)}</div>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Forecast ({fcst.forecast_horizon})</span>
                        <span className="font-mono font-bold text-indigo-300">{fcst.forecast_display_label}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[10.5px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Radio className="h-3 w-3 text-sky-400" />
                        {fcst.historical_observation_count} obs ({fcst.independent_bus_count} buses)
                      </span>
                      <span className="font-mono font-semibold text-slate-300">
                        Evidence Confidence: {Math.round(fcst.confidence)}%
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT: Forecast Inspector (7 cols) */}
        <div className="lg:col-span-7">
          {selectedForecast ? (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
              {/* Header Inspector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-lg font-bold font-mono text-white">
                      {selectedForecast.forecast_id}
                    </h2>
                    {getTargetTypeBadge(selectedForecast.target_type)}
                    {getRiskBadge(selectedForecast.risk_level)}
                  </div>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                    <strong>{selectedForecast.location_name}</strong>
                    <span className="text-slate-500 font-mono text-[11px]">
                      ({selectedForecast.latitude.toFixed(4)}, {selectedForecast.longitude.toFixed(4)})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsActionModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-sm"
                  >
                    <Wrench className="h-3.5 w-3.5" />
                    CREATE AUTHORITY ACTION
                  </button>
                </div>
              </div>

              {actionSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
                  <span>{actionSuccessMsg}</span>
                  <a href="#/authority-actions" className="font-bold underline text-emerald-200">
                    Open in Action Center &rarr;
                  </a>
                </div>
              )}

              {/* Side-by-Side: Current Observed vs Forecast Outlook */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Current State */}
                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    CURRENT OBSERVED STATE
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono text-slate-100">
                      {selectedForecast.current_display_label}
                    </span>
                    <span className="text-xs text-slate-500">Baseline: {selectedForecast.baseline_value}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800/80">
                    <div className="flex justify-between">
                      <span>Observation Count:</span>
                      <span className="font-mono text-slate-200">{selectedForecast.historical_observation_count} passes</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Independent Buses:</span>
                      <span className="font-mono text-slate-200">{selectedForecast.independent_bus_count} distinct buses</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Window Span:</span>
                      <span className="font-mono text-slate-200">{selectedForecast.observation_window_days.toFixed(1)} days</span>
                    </div>
                  </div>
                </div>

                {/* Forecast Outlook */}
                <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 block">
                      FORECAST OUTLOOK
                    </span>
                    {getTrendBadge(selectedForecast.trend_direction)}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold font-mono text-indigo-300">
                      {selectedForecast.forecast_display_label}
                    </span>
                    <span className="text-xs text-indigo-400/80 font-semibold">
                      Horizon: {selectedForecast.forecast_horizon}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-indigo-500/20">
                    <div className="flex justify-between">
                      <span>Evidence Sufficiency:</span>
                      <span className="font-semibold text-indigo-300">{selectedForecast.evidence_sufficiency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Trend Strength:</span>
                      <span className="font-mono text-slate-200">{Math.round(selectedForecast.trend_strength * 100)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Early Warning:</span>
                      <span className="font-semibold">{selectedForecast.early_warning}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence Quality & Confidence Meter */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Forecast Evidence Confidence:</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {Math.round(selectedForecast.confidence)} / 100
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-sky-400 rounded-full"
                    style={{ width: `${Math.round(selectedForecast.confidence)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Sensor Reliability: {Math.round(selectedForecast.reliability * 100)}%</span>
                  <span>* Evidence index, not statistical probability</span>
                </div>
              </div>

              {/* Auditable Explanations Card */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <Info className="h-4 w-4 text-indigo-400" />
                  <span>Why This Forecast?</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80 font-sans">
                  {selectedForecast.explanation}
                </p>
              </div>

              {/* Early Warning Alert & Recommended Action */}
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                    <ShieldAlert className="h-4 w-4 text-indigo-400" />
                    <span>Early Warning &amp; Recommended Preventive Action</span>
                  </div>
                  {getWarningBadge(selectedForecast.early_warning)}
                </div>
                {selectedForecast.warning_message && (
                  <p className="text-xs font-semibold text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30">
                    {selectedForecast.warning_message}
                  </p>
                )}
                <div className="flex items-start gap-2 text-xs text-slate-300 pt-1">
                  <strong className="text-indigo-300 shrink-0">Recommendation:</strong>
                  <span>{selectedForecast.recommended_action_details}</span>
                </div>
              </div>

              {/* Deterministic Timeseries Visual Projection Chart */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                    <Activity className="h-4 w-4 text-indigo-400" />
                    <span>Temporal Trend &amp; Outlook Progression</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-slate-300">
                      <span className="h-2 w-2 rounded-full bg-sky-400" /> Observed
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="h-0.5 w-3 bg-slate-500" /> Baseline ({selectedForecast.baseline_value})
                    </span>
                    <span className="flex items-center gap-1 text-indigo-300 font-bold">
                      <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" /> Forecast Outlook
                    </span>
                  </div>
                </div>

                {/* SVG Trend Line Chart */}
                <div className="h-44 w-full bg-slate-900/80 rounded-lg p-3 border border-slate-800/80 flex flex-col justify-end">
                  <div className="flex-1 flex items-end justify-between gap-2 px-2 pb-2">
                    {selectedForecast.timeseries_points.map((pt, i) => {
                      const isForecastPoint = pt.forecast !== null && pt.forecast !== undefined;
                      const val = isForecastPoint ? pt.forecast! : (pt.observed || 0);
                      const maxVal = Math.max(
                        ...selectedForecast.timeseries_points.map((p) => Math.max(p.observed || 0, p.forecast || 0, p.baseline || 0)),
                        10
                      );
                      const heightPct = Math.min(100, Math.max(15, (val / maxVal) * 100));

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                          <span className="font-mono text-[10px] font-bold text-slate-300">
                            {val.toFixed(1)}
                          </span>
                          <div
                            className={`w-full max-w-[28px] rounded-t-md transition-all ${
                              isForecastPoint
                                ? 'bg-gradient-to-t from-indigo-600 to-indigo-400 border-t-2 border-indigo-300'
                                : 'bg-slate-700 hover:bg-slate-600 border-t-2 border-sky-400'
                            }`}
                            style={{ height: `${heightPct}%` }}
                          />
                          <span className={`text-[9.5px] truncate max-w-[50px] text-center ${isForecastPoint ? 'text-indigo-300 font-bold' : 'text-slate-500'}`}>
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Map GIS Corridor Location Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sky-400" />
                    Spatial Context on GIS
                  </span>
                  <a
                    href="#/map"
                    className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                  >
                    Open Live GIS <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="h-44 rounded-xl overflow-hidden border border-slate-800">
                  <MapComponent
                    events={[]}
                    defects={[]}
                    congestion={[]}
                    incidents={[]}
                    buses={[]}
                    center={{ lat: selectedForecast.latitude, lng: selectedForecast.longitude }}
                    zoom={14}
                  />
                </div>
              </div>

              {/* Audit & Recomputation History Timeline */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <History className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Forecast History Timeline</span>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No history records logged.</div>
                  ) : (
                    history.map((h) => (
                      <div key={h.entry_id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-indigo-300 font-bold">
                            {h.action_type}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(h.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Operator: <span className="text-slate-300 font-semibold">{h.operator}</span>
                        </div>
                        {h.notes && <p className="text-[11px] text-slate-300 italic">{h.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs rounded-xl bg-slate-900 border border-slate-800">
              Select a forecast record from the queue to inspect trends, evidence quality, and early warnings.
            </div>
          )}
        </div>
      </div>

      {/* CREATE AUTHORITY ACTION MODAL */}
      {isActionModalOpen && selectedForecast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Wrench className="h-5 w-5 text-indigo-400" />
                  Create Authority Action from Forecast
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Connects this predictive outlook to the operational response dispatch queue.
                </p>
              </div>
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="text-slate-500 hover:text-slate-300 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Location:</span>
                <span className="font-semibold text-slate-200">{selectedForecast.location_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Target Type:</span>
                <span className="font-mono text-indigo-300">{selectedForecast.target_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recommended Action:</span>
                <span className="font-bold text-emerald-400">{selectedForecast.recommended_action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Risk Severity:</span>
                <span className="font-bold text-rose-400">{selectedForecast.risk_level}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Operator Dispatch Notes:</label>
              <textarea
                rows={3}
                placeholder="Enter operational response instructions or preventative maintenance notes..."
                value={operatorNotes}
                onChange={(e) => setOperatorNotes(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsActionModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAction}
                disabled={isSubmittingAction}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 shadow-sm"
              >
                {isSubmittingAction ? 'Creating Action...' : 'Create Action Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
