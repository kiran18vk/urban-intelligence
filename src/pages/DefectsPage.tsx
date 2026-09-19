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
} from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { SeverityBadge } from '@/components/ui/Badges';
import { ConfidenceBar } from '@/components/ui/StateWrappers';
import { MapComponent } from '@/components/Map/MapComponent';
import { apiService } from '@/services/api';
import type { RoadDefect } from '@/types';
import { formatTimestamp, formatFullTimestamp } from '@/lib/eventMeta';
import { calculateDefectIntelligence } from '@/lib/defectIntelligence';

const DEFECT_TYPE_LABELS: Record<RoadDefect['type'], string> = {
  pothole: 'Pothole',
  crack: 'Surface Crack',
  waterlogging: 'Waterlogging',
  sinkhole: 'Sinkhole',
  surface_raveling: 'Surface Raveling',
};

const DEFECT_STATUS_META: Record<RoadDefect['status'], { label: string; color: string; bgColor: string }> = {
  detected: { label: 'Detected', color: 'text-accent-300', bgColor: 'bg-accent-500/15' },
  verified: { label: 'Verified', color: 'text-amber-300', bgColor: 'bg-amber-500/15' },
  scheduled: { label: 'Scheduled', color: 'text-orange-300', bgColor: 'bg-orange-500/15' },
  repaired: { label: 'Repaired', color: 'text-emerald-300', bgColor: 'bg-emerald-500/15' },
};

export function DefectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RoadDefect[]>([]);
  const [selected, setSelected] = useState<RoadDefect | null>(null);
  const [filter, setFilter] = useState<'all' | RoadDefect['status']>('all');

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

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const filtered = filter === 'all' ? data : data.filter((d) => d.status === filter);

  const filters = [
    { key: 'all' as const, label: 'All', count: data.length },
    { key: 'detected' as const, label: 'Detected', count: data.filter((d) => d.status === 'detected').length },
    { key: 'verified' as const, label: 'Verified', count: data.filter((d) => d.status === 'verified').length },
    { key: 'scheduled' as const, label: 'Scheduled', count: data.filter((d) => d.status === 'scheduled').length },
    { key: 'repaired' as const, label: 'Repaired', count: data.filter((d) => d.status === 'repaired').length },
  ];

  const selectedIntel = selected ? calculateDefectIntelligence(selected) : null;

  const getPriorityBadgeClass = (classification: string) => {
    switch (classification) {
      case 'Critical Priority':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case 'High Priority':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'Medium Priority':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'Rapid Deterioration') return <TrendingUp className="h-3.5 w-3.5 text-rose-400" />;
    if (trend === 'Moderate Deterioration') return <TrendingUp className="h-3.5 w-3.5 text-amber-400" />;
    if (trend === 'Slow Deterioration') return <TrendingDown className="h-3.5 w-3.5 text-sky-400" />;
    return <Minus className="h-3.5 w-3.5 text-emerald-400" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Defects', value: data.length, color: 'text-amber-400' },
          { label: 'Critical', value: data.filter((d) => d.severity === 'critical').length, color: 'text-rose-400' },
          { label: 'Pending Repair', value: data.filter((d) => d.status === 'detected' || d.status === 'verified').length, color: 'text-amber-400' },
          { label: 'Repaired', value: data.filter((d) => d.status === 'repaired').length, color: 'text-emerald-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink-700 bg-ink-850 p-4">
            <p className={`text-2xl font-bold tabular ${stat.color}`}>{stat.value}</p>
            <p className="mt-1 text-xs text-slate-400">{stat.label}</p>
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
            height="560px"
          />
        </div>

        {/* Detail panel */}
        <div className="rounded-xl border border-ink-700 bg-ink-850 p-5 space-y-4 max-h-[560px] overflow-y-auto pr-2">
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
                  <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${DEFECT_STATUS_META[selected.status].bgColor} ${DEFECT_STATUS_META[selected.status].color}`}>
                    {DEFECT_STATUS_META[selected.status].label}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-accent-400" />
                    {selected.address}
                  </span>
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
                    Calculated / Derived Maintenance Priority
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Priority Classification</span>
                    <span className={`inline-block mt-0.5 rounded-lg border px-2.5 py-1 text-xs font-bold tracking-wide ${getPriorityBadgeClass(selectedIntel.priority.classification)}`}>
                      {selectedIntel.priority.classification}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold block">Composite Priority Score</span>
                    <span className="font-mono text-2xl font-bold text-accent-300 tabular-nums">
                      {selectedIntel.priority.score}<span className="text-xs font-normal text-slate-500"> / 100</span>
                    </span>
                  </div>
                </div>

                {/* Factors Grid */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-accent-500/20 text-xs">
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Defect Severity</span>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.defectSeverityScore} / 100</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Traffic Load</span>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.trafficLoad} / 100</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Recurrence / Frequency</span>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.recurrenceScore} / 100 ({selected.reports} reports)</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Road Importance</span>
                    <span className="font-mono font-semibold text-slate-200">{selectedIntel.priority.roadImportanceScore} / 100</span>
                  </div>
                </div>
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
                    DEMO / ESTIMATE DATA
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Current Road Condition</span>
                    <span className="font-semibold text-amber-200">{selectedIntel.deterioration.currentCondition}</span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Observed Baseline</span>
                    <span className="font-semibold text-slate-300">{selectedIntel.deterioration.previousCondition}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded bg-ink-900/80 p-2.5 border border-ink-750 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Deterioration Rate</span>
                    <span className="font-mono font-bold text-rose-300">+{selectedIntel.deterioration.deteriorationRatePct}% / month</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getTrendIcon(selectedIntel.deterioration.trend)}
                    <span className="font-semibold text-slate-200">{selectedIntel.deterioration.trend}</span>
                  </div>
                </div>

                <div className="rounded bg-ink-900/90 p-2.5 border border-ink-750 text-xs space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">Preventive Maintenance Indication</span>
                  <p className="text-amber-200/90 font-medium text-[11px] leading-relaxed">
                    {selectedIntel.deterioration.preventiveIndication}
                  </p>
                </div>
              </div>

              {/* 3. MAINTENANCE COST ESTIMATION CARD */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <IndianRupee className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Maintenance Cost Estimation
                    </span>
                  </div>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-emerald-300 border border-emerald-500/30">
                    Rough Maintenance Cost Estimate
                  </span>
                </div>

                <div className="rounded bg-emerald-950/20 border border-emerald-500/20 p-2 text-[10.5px] text-emerald-300/80 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Prototype budget estimate based on standard unit rates. Not an official government tender cost.</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Affected Length / Area</span>
                    <span className="font-mono font-semibold text-slate-200">
                      {selectedIntel.costEstimate.affectedLengthMeters}m ({selectedIntel.costEstimate.affectedAreaSqM} m²)
                    </span>
                  </div>
                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750">
                    <span className="text-[10px] text-slate-400 block">Repair Category</span>
                    <span className="font-semibold text-emerald-300">{selectedIntel.costEstimate.repairCategory}</span>
                  </div>
                </div>

                <div className="rounded bg-ink-900/80 p-2.5 border border-ink-750 space-y-1 text-xs">
                  <span className="text-[10px] text-slate-400 block">Approx. Maintenance Requirement</span>
                  <p className="font-medium text-slate-200 text-[11px]">{selectedIntel.costEstimate.estimatedQuantity}</p>
                </div>

                <div className="flex items-center justify-between rounded bg-emerald-950/40 p-3 border border-emerald-500/30">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-400 block">Estimated Maintenance Cost</span>
                    <span className="text-[10px] text-slate-400">Unit rate: ₹{selectedIntel.costEstimate.unitRateINR.toLocaleString('en-IN')} / m²</span>
                  </div>
                  <span className="font-mono text-xl font-bold text-emerald-300 tabular-nums">
                    ₹{selectedIntel.costEstimate.estimatedCostINR.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Secondary Technical Details */}
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

              <div className="pt-2 border-t border-ink-700">
                <ConfidenceBar value={selected.confidence} label="AI Detection Confidence" />
              </div>

              <div className="flex gap-2">
                <button className="flex-1 rounded-lg bg-accent-500/15 px-3 py-2 text-xs font-medium text-accent-300 transition hover:bg-accent-500/25">
                  Verify Defect
                </button>
                <button className="flex-1 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-medium text-amber-300 transition hover:bg-amber-500/25">
                  Schedule Work Order
                </button>
              </div>
            </>
          ) : (
            <EmptyState title="No defect selected" message="Select a defect from the list or map to view details." />
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
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

      {/* Defects table with 3 Intelligence Columns */}
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
                <th className="px-4 py-3 text-center font-medium">Priority Score</th>
                <th className="px-4 py-3 text-center font-medium">Deterioration Rate</th>
                <th className="px-4 py-3 text-center font-medium">Rough Est. Cost</th>
                <th className="px-4 py-3 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700">
              {filtered.map((d) => {
                const intel = calculateDefectIntelligence(d);
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
                      <span className={`inline-block rounded px-2 py-0.5 text-xs font-mono font-bold border ${getPriorityBadgeClass(intel.priority.classification)}`}>
                        {intel.priority.score} ({intel.priority.classification.split(' ')[0]})
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-mono text-xs text-rose-300">
                        {getTrendIcon(intel.deterioration.trend)}
                        <span>+{intel.deterioration.deteriorationRatePct}%/mo</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-emerald-300 text-xs tabular">
                      ₹{intel.costEstimate.estimatedCostINR.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${DEFECT_STATUS_META[d.status].bgColor} ${DEFECT_STATUS_META[d.status].color}`}>
                        {DEFECT_STATUS_META[d.status].label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
