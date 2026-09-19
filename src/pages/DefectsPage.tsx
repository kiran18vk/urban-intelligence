import { useState, useEffect } from 'react';
import {
  CircleAlert,
  MapPin,
  Clock,
  Bus,
  Wrench,
  IndianRupee,
  FileSearch,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Calculator,
  ShieldAlert,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  ArrowRight,
  Sliders,
  RotateCcw,
  Check,
  AlertOctagon,
  Camera,
} from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { SeverityBadge } from '@/components/ui/Badges';
import { ConfidenceBar } from '@/components/ui/StateWrappers';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';
import { MapComponent } from '@/components/Map/MapComponent';
import { apiService } from '@/services/api';
import type { RoadDefect, DefectLifecycleStatus } from '@/types';
import { formatTimestamp, formatFullTimestamp } from '@/lib/eventMeta';
import {
  calculateDefectIntelligence,
  LIFECYCLE_STAGES,
  normalizeLifecycleStatus,
  getLifecycleStageIndex,
  getNextLifecycleStatus,
  DEFAULT_COST_RATES,
  type RepairCostRates,
} from '@/lib/defectIntelligence';

const DEFECT_TYPE_LABELS: Record<RoadDefect['type'], string> = {
  pothole: 'Pothole',
  crack: 'Surface Crack',
  waterlogging: 'Waterlogging',
  sinkhole: 'Sinkhole',
  surface_raveling: 'Surface Raveling',
};

export function DefectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RoadDefect[]>([]);
  const [selected, setSelected] = useState<RoadDefect | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Configurable cost assumptions state
  const [showCostConfig, setShowCostConfig] = useState(false);
  const [costRates, setCostRates] = useState<RepairCostRates>(DEFAULT_COST_RATES);

  // Photographic evidence modal state
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    attribution?: string;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const defects = await apiService.getRoadDefects();
      setData(defects);
      setSelected(defects[0] ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdvanceLifecycle = async (newStatus: string) => {
    if (!selected) return;
    setIsUpdatingStatus(true);
    try {
      const updated = await apiService.updateDefectStatus(
        selected.id,
        newStatus,
        `Progressed to ${newStatus} via municipal decision console`
      );
      // Update local state
      const updatedData = data.map((d) => (d.id === selected.id ? { ...d, status: updated.status as any } : d));
      setData(updatedData);
      setSelected({ ...selected, status: updated.status as any });
    } catch (err) {
      console.error('Failed to advance lifecycle status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const filtered =
    filter === 'all'
      ? data
      : data.filter((d) => normalizeLifecycleStatus(d.status) === filter.toUpperCase());

  const filterTabs = [
    { key: 'all', label: 'All Defects', count: data.length },
    { key: 'DETECTED', label: '1. Detected', count: data.filter((d) => normalizeLifecycleStatus(d.status) === 'DETECTED').length },
    { key: 'VERIFIED', label: '2. Verified', count: data.filter((d) => normalizeLifecycleStatus(d.status) === 'VERIFIED').length },
    { key: 'PRIORITIZED', label: '3. Prioritized', count: data.filter((d) => normalizeLifecycleStatus(d.status) === 'PRIORITIZED').length },
    { key: 'REPAIR_ACTION', label: '4. Action', count: data.filter((d) => normalizeLifecycleStatus(d.status) === 'REPAIR_ACTION').length },
    { key: 'RE_OBSERVED', label: '5. Re-Observed', count: data.filter((d) => normalizeLifecycleStatus(d.status) === 'RE_OBSERVED').length },
    { key: 'RESOLVED', label: '6. Resolved', count: data.filter((d) => normalizeLifecycleStatus(d.status) === 'RESOLVED').length },
  ];

  const selectedIntel = selected ? calculateDefectIntelligence(selected, costRates) : null;
  const currentStageIdx = selected ? getLifecycleStageIndex(selected.status) : 1;
  const currentStageNorm = selected ? normalizeLifecycleStatus(selected.status) : 'DETECTED';
  const nextStage = selected ? getNextLifecycleStatus(selected.status) : 'VERIFIED';

  const getPriorityBadgeClass = (classification: string) => {
    switch (classification.toUpperCase()) {
      case 'CRITICAL':
      case 'CRITICAL PRIORITY':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'HIGH':
      case 'HIGH PRIORITY':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'MEDIUM':
      case 'MEDIUM PRIORITY':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  const getDeteriorationBadgeClass = (category: string) => {
    switch (category.toUpperCase()) {
      case 'RAPIDLY_DETERIORATING':
      case 'RAPID DETERIORATION':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'SLOWLY_DETERIORATING':
      case 'SLOW DETERIORATION':
      case 'MODERATE DETERIORATION':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'IMPROVING':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      default:
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend.toUpperCase().includes('RAPID')) return <TrendingUp className="h-3.5 w-3.5 text-rose-400" />;
    if (trend.toUpperCase().includes('SLOW') || trend.toUpperCase().includes('MODERATE')) return <TrendingUp className="h-3.5 w-3.5 text-amber-400" />;
    if (trend.toUpperCase().includes('IMPROVING')) return <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />;
    return <Minus className="h-3.5 w-3.5 text-sky-400" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Defects', value: data.length, color: 'text-amber-400', sub: 'In testbed corridors' },
          { label: 'Critical / High Priority', value: data.filter((d) => d.severity === 'critical' || d.severity === 'high').length, color: 'text-rose-400', sub: 'Score > 65/100' },
          { label: 'In Repair Workflow', value: data.filter((d) => ['DETECTED', 'VERIFIED', 'PRIORITIZED', 'REPAIR_ACTION'].includes(normalizeLifecycleStatus(d.status))).length, color: 'text-orange-400', sub: 'Stages 1 through 4' },
          { label: 'Resolved / Repaired', value: data.filter((d) => normalizeLifecycleStatus(d.status) === 'RESOLVED').length, color: 'text-emerald-400', sub: 'Restored segments' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink-700 bg-ink-850 p-4">
            <p className={`text-2xl font-bold tabular ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-xs font-semibold text-slate-300">{stat.label}</p>
            <p className="text-[10px] text-slate-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Map */}
        <div className="xl:col-span-2">
          <MapComponent
            defects={data}
            center={selected ? selected.location : undefined}
            filters={{ buses: false, potholes: true, waterlogging: false, congestion: false, incidents: false }}
            height="620px"
          />
        </div>

        {/* Detail panel */}
        <div className="rounded-xl border border-ink-700 bg-ink-850 p-5 space-y-4 max-h-[620px] overflow-y-auto pr-2">
          {selected && selectedIntel ? (
            <>
              {/* Header & Basic Meta */}
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-100">{DEFECT_TYPE_LABELS[selected.type]}</h3>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">{selected.id}</p>
                  </div>
                  <SeverityBadge severity={selected.severity} />
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-accent-400" />
                    {selected.address}
                  </span>
                </div>
              </div>

              {/* 4. DEFECT LIFECYCLE PROGRESSION (6 STAGES) */}
              <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Defect Lifecycle Tracker
                    </span>
                  </div>
                  <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-purple-300 border border-purple-500/30">
                    Stage {currentStageIdx} of 6
                  </span>
                </div>

                {/* 6-step progress bar */}
                <div className="grid grid-cols-6 gap-1 pt-1">
                  {LIFECYCLE_STAGES.map((st) => {
                    const isPassed = st.step <= currentStageIdx;
                    const isCurrent = st.step === currentStageIdx;
                    return (
                      <div key={st.key} className="flex flex-col items-center">
                        <div
                          className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                            isCurrent
                              ? 'bg-purple-400 shadow-sm shadow-purple-500'
                              : isPassed
                              ? 'bg-purple-500/60'
                              : 'bg-ink-750'
                          }`}
                        />
                        <span
                          className={`mt-1 text-[8.5px] font-semibold text-center leading-tight truncate w-full ${
                            isCurrent ? 'text-purple-300 font-bold' : isPassed ? 'text-slate-300' : 'text-slate-600'
                          }`}
                        >
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded bg-ink-900/80 p-2.5 border border-ink-750 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Current Status</span>
                    <span className="font-bold text-purple-300">{LIFECYCLE_STAGES[currentStageIdx - 1]?.label}</span>
                    <p className="text-[10px] text-slate-500">{LIFECYCLE_STAGES[currentStageIdx - 1]?.description}</p>
                  </div>
                  {currentStageNorm !== 'RESOLVED' && (
                    <button
                      onClick={() => handleAdvanceLifecycle(nextStage)}
                      disabled={isUpdatingStatus}
                      className="inline-flex items-center gap-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 px-2.5 py-1.5 text-xs font-semibold text-purple-300 transition shrink-0"
                    >
                      {isUpdatingStatus ? 'Advancing...' : `Advance to ${nextStage}`}
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  )}
                  {currentStageNorm === 'RESOLVED' && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      <Check className="h-3.5 w-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>

              {/* 1. ROAD MAINTENANCE PRIORITY ENGINE CARD */}
              <div className="rounded-xl border border-accent-500/30 bg-accent-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-accent-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-accent-300">
                      Road Maintenance Priority Engine
                    </span>
                  </div>
                  <span className="rounded bg-accent-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-accent-300 border border-accent-500/30">
                    0–100 Explainable Score
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Priority Level</span>
                    <span className={`inline-block mt-0.5 rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wide ${getPriorityBadgeClass(selectedIntel.priority.level)}`}>
                      {selectedIntel.priority.level} PRIORITY
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Composite Priority Score</span>
                    <span className="font-mono text-2xl font-bold text-accent-300 tabular-nums">
                      {selectedIntel.priority.score}<span className="text-xs font-normal text-slate-500"> / 100</span>
                    </span>
                  </div>
                </div>

                {/* Explainable Factor Breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-accent-500/20 text-xs">
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Defect Severity</span>
                      <span className="text-[9px] text-accent-400 font-bold">35% wt</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.defectSeverityScore} / 100</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Defect Density</span>
                      <span className="text-[9px] text-accent-400 font-bold">20% wt</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.defectDensityScore} / 100</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Traffic / Congestion</span>
                      <span className="text-[9px] text-accent-400 font-bold">25% wt</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.trafficLoad} / 100</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>Recurrence</span>
                      <span className="text-[9px] text-accent-400 font-bold">20% wt</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.recurrenceScore} / 100 ({selected.reports} obs)</span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 bg-ink-900/60 p-2 rounded border border-ink-750 leading-relaxed">
                  {selectedIntel.priority.explanation}
                </p>
              </div>

              {/* 2. ROAD QUALITY DETERIORATION INDEX CARD */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Road Quality Deterioration Index
                    </span>
                  </div>
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-amber-300 border border-amber-500/30">
                    0.0–10.0 Index
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Deterioration Rate</span>
                    <span className={`inline-block mt-0.5 rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wide ${getDeteriorationBadgeClass(selectedIntel.deterioration.category)}`}>
                      {selectedIntel.deterioration.category}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Deterioration Index</span>
                    <span className="font-mono text-2xl font-bold text-amber-300 tabular-nums">
                      {selectedIntel.deterioration.index}<span className="text-xs font-normal text-slate-500"> / 10</span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Current Surface State</span>
                    <span className="font-semibold text-amber-200">{selectedIntel.deterioration.currentCondition}</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Observation History</span>
                    <span className="font-semibold text-slate-300">{selectedIntel.deterioration.observationHistoryCount} pass-by records</span>
                  </div>
                </div>

                <div className="rounded bg-ink-900/90 p-2.5 border border-ink-750 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Preventive Maintenance Indication</span>
                  <p className="text-amber-200/90 font-medium text-[11px] leading-relaxed">
                    {selectedIntel.deterioration.preventiveIndication}
                  </p>
                </div>

                <div className="text-[9.5px] text-amber-400/80 italic">
                  * {selectedIntel.deterioration.disclaimer}
                </div>
              </div>

              {/* 3. MAINTENANCE COST ESTIMATOR */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Maintenance Cost Estimator
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCostConfig(!showCostConfig)}
                    className="flex items-center gap-1 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30"
                  >
                    <Sliders className="h-2.5 w-2.5" />
                    {showCostConfig ? 'Hide Rates' : 'Config Rates'}
                  </button>
                </div>

                {showCostConfig && (
                  <div className="rounded-lg border border-emerald-500/30 bg-ink-900 p-2.5 space-y-2 text-xs animate-fade-in">
                    <span className="text-[10px] font-bold uppercase text-emerald-400 block">Repair Unit Rate Assumptions (INR)</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9.5px] text-slate-400 block">Pothole/Patch (₹/m²)</label>
                        <input
                          type="number"
                          value={costRates.potholePatchRatePerSqM}
                          onChange={(e) => setCostRates({ ...costRates, potholePatchRatePerSqM: Number(e.target.value) || 0 })}
                          className="w-full rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] text-slate-400 block">Crack Seal (₹/m)</label>
                        <input
                          type="number"
                          value={costRates.crackSealRatePerM}
                          onChange={(e) => setCostRates({ ...costRates, crackSealRatePerM: Number(e.target.value) || 0 })}
                          className="w-full rounded bg-ink-800 border border-ink-700 px-2 py-1 text-slate-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Affected Geometry</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {selectedIntel.costEstimate.affectedLengthMeters}m ({selectedIntel.costEstimate.affectedAreaSqM} m²)
                    </span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Repair Category</span>
                    <span className="font-semibold text-emerald-300">{selectedIntel.costEstimate.repairCategory}</span>
                  </div>
                </div>

                {/* Primary Cost Range Display */}
                <div className="rounded bg-emerald-950/40 p-3 border border-emerald-500/30 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-emerald-400">Estimated Cost</span>
                    <span className="font-mono text-xl font-bold text-emerald-300 tabular-nums">
                      ₹{selectedIntel.costEstimate.estimatedCostINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-emerald-500/20 font-mono">
                    <span>Estimated cost range (±20% planning range):</span>
                    <span className="text-emerald-300 font-semibold">
                      ₹{selectedIntel.costEstimate.costRangeMinINR.toLocaleString('en-IN')} – ₹{selectedIntel.costEstimate.costRangeMaxINR.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="text-[9.5px] text-emerald-400/80 italic">
                  * {selectedIntel.costEstimate.disclaimer}
                </div>
              </div>

              {/* Technical Inspection Info */}
              <div className="space-y-2 text-xs border-t border-ink-750 pt-3">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-500" /> Detected</span>
                  <span className="text-slate-300">{formatFullTimestamp(selected.detectedAt)}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><Bus className="h-3.5 w-3.5 text-slate-500" /> Bus ID</span>
                  <span className="font-mono text-slate-300">{selected.busId}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5"><FileSearch className="h-3.5 w-3.5 text-slate-500" /> Size Estimate</span>
                  <span className="font-mono text-slate-300">~{selected.sizeEstimate}</span>
                </div>
              </div>

              {/* Road Defect Photographic Evidence Section */}
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Camera className="h-4 w-4 text-sky-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                      Road Defect Evidence
                    </span>
                  </div>
                  <span className="rounded bg-sky-500/15 px-2 py-0.5 text-[9.5px] font-semibold text-sky-300 border border-sky-500/30">
                    Real-world reference
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Pothole Photo Card */}
                  <div
                    onClick={() =>
                      setPreviewImage({
                        url: '/assets/road-defects/pothole-real-01.jpg',
                        title: 'Road Pothole Surface Distress',
                        subtitle: `Defect ID: ${selected.id} · AI Conf: ${(selected.confidence * 100).toFixed(0)}% · Location: ${selected.address}`,
                        attribution: 'Wikimedia Commons (Public Domain dedication by Uncl3dad)',
                      })
                    }
                    className="group relative cursor-pointer rounded-lg overflow-hidden border border-ink-750 bg-ink-900 transition hover:border-accent-500/50"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-black/40">
                      <img
                        src="/assets/road-defects/pothole-real-01.jpg"
                        alt="Road Pothole Reference"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                    </div>
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-100">Pothole</span>
                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-black/60 px-1.5 py-0.5 rounded">
                        {(selected.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                  </div>

                  {/* Road Crack Photo Card */}
                  <div
                    onClick={() =>
                      setPreviewImage({
                        url: '/assets/road-defects/road-crack-real-01.jpg',
                        title: 'Asphalt Deterioration & Cracking',
                        subtitle: `Defect ID: ${selected.id} · AI Conf: ${(selected.confidence * 100).toFixed(0)}% · Location: ${selected.address}`,
                        attribution: 'Wikimedia Commons (CC BY-SA 3.0 by Bidgee)',
                      })
                    }
                    className="group relative cursor-pointer rounded-lg overflow-hidden border border-ink-750 bg-ink-900 transition hover:border-accent-500/50"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-black/40">
                      <img
                        src="/assets/road-defects/road-crack-real-01.jpg"
                        alt="Road Crack Reference"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-90" />
                    </div>
                    <div className="absolute bottom-1.5 left-2 right-2 flex items-center justify-between">
                      <span className="text-[10.5px] font-bold text-slate-100">Road Crack</span>
                      <span className="text-[9px] font-mono font-semibold text-amber-300 bg-black/60 px-1.5 py-0.5 rounded">
                        {(selected.confidence * 100).toFixed(0)}% Conf
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                  <span className="italic">Click photograph to enlarge preview</span>
                  <span className="font-semibold text-slate-500">Real-world reference</span>
                </div>
              </div>

              <div className="pt-2 border-t border-ink-700">
                <ConfidenceBar value={selected.confidence} label="AI Detection Confidence" />
              </div>
            </>
          ) : (
            <EmptyState title="No defect selected" message="Select a defect from the list or map to view details." />
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              filter === f.key ? 'bg-ink-800 text-slate-200 ring-1 ring-inset ring-ink-600' : 'bg-ink-900 text-slate-500 hover:text-slate-300'
            }`}
          >
            {f.label}
            <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-semibold tabular text-slate-400">{f.count}</span>
          </button>
        ))}
      </div>

      {/* Defects table with Priority, Deterioration, Lifecycle and Cost Range Columns */}
      {filtered.length === 0 ? (
        <EmptyState title="No defects in this category" message="No road defects match the current filter." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-900 text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-left font-medium">Location</th>
                <th className="px-4 py-3 text-center font-medium">Severity</th>
                <th className="px-4 py-3 text-center font-medium">Priority (0-100)</th>
                <th className="px-4 py-3 text-center font-medium">Deterioration (0-10)</th>
                <th className="px-4 py-3 text-center font-medium">Estimated Cost Range</th>
                <th className="px-4 py-3 text-center font-medium">Lifecycle Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {filtered.map((d) => {
                const intel = calculateDefectIntelligence(d, costRates);
                const normStatus = normalizeLifecycleStatus(d.status);
                const stageIdx = getLifecycleStageIndex(d.status);
                return (
                  <tr
                    key={d.id}
                    onClick={() => setSelected(d)}
                    className={`cursor-pointer transition ${selected?.id === d.id ? 'bg-ink-800' : 'hover:bg-ink-850/50'}`}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{d.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CircleAlert className="h-3.5 w-3.5 text-amber-400" />
                        <span className="font-medium text-slate-200">{DEFECT_TYPE_LABELS[d.type]}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-xs truncate">{d.address}</td>
                    <td className="px-4 py-3 text-center"><SeverityBadge severity={d.severity} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-bold border ${getPriorityBadgeClass(intel.priority.level)}`}>
                        {intel.priority.score} ({intel.priority.level})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-xs text-amber-300">
                        {getTrendIcon(intel.deterioration.category)}
                        <span>{intel.deterioration.index} / 10</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-300 text-xs tabular">
                      ₹{intel.costEstimate.costRangeMinINR.toLocaleString('en-IN')} – ₹{intel.costEstimate.costRangeMaxINR.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                        {stageIdx}. {normStatus}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full-screen Lightbox Image Modal */}
      {previewImage && (
        <ImageLightboxModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          attribution={previewImage.attribution}
          tag="Real-world reference"
        />
      )}
    </div>
  );
}
