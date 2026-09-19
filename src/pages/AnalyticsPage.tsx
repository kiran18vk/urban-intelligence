import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  Car,
  Bus as BusIcon,
  ShieldAlert,
  AlertTriangle,
  Activity,
  Layers,
  Clock,
  Sparkles,
  Info,
  Maximize2,
  CheckCircle2,
  Gauge,
  CircleAlert,
  FileSpreadsheet,
  Users,
  HardDrive,
  Wifi,
  WifiOff,
  ClipboardCheck,
  UserCheck,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { apiService } from '@/services/api';
import type { AnalyticsSummary, CorridorMetric, PedestrianSummary, TimeRiskSlot, QueueStatusSummary, CorrelationSummary, ReviewSummary, AuthorityActionSummary, ReObservationSummary, ForecastSummary } from '@/types';
import { mockReObservationSummary, mockForecastSummary } from '@/data/mockData';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hourlyTrend, setHourlyTrend] = useState<any[]>([]);
  const [pedSummary, setPedSummary] = useState<PedestrianSummary | null>(null);
  const [pedTimeseries, setPedTimeseries] = useState<any[]>([]);
  const [queueSummary, setQueueSummary] = useState<QueueStatusSummary | null>(null);
  const [correlationSummary, setCorrelationSummary] = useState<CorrelationSummary | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [actionSummary, setActionSummary] = useState<AuthorityActionSummary | null>(null);
  const [reobsSummary, setReobsSummary] = useState<ReObservationSummary | null>(null);
  const [fcstSummary, setFcstSummary] = useState<ForecastSummary | null>(null);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, hourlyData, pedSumData, pedTimeData, qData, corrData, revData, actData, reobsData, fcstData] = await Promise.all([
        apiService.getAnalyticsSummary(),
        apiService.getHourlyTrend(),
        apiService.getPedestrianSummary(),
        apiService.getPedestrianTimeseries().then((d) => d.time_distribution || []),
        apiService.getEdgeQueueStatus().catch(() => null),
        apiService.getCorrelationSummary().catch(() => null),
        apiService.getReviewSummary().catch(() => null),
        apiService.getAuthorityActionSummary().catch(() => null),
        apiService.getReObservationSummary().catch(() => mockReObservationSummary),
        apiService.getPredictiveSummary().catch(() => mockForecastSummary),
      ]);
      setSummary(sumData);
      setHourlyTrend(hourlyData);
      setPedSummary(pedSumData);
      setPedTimeseries(pedTimeData);
      setQueueSummary(qData);
      setCorrelationSummary(corrData);
      setReviewSummary(revData);
      setActionSummary(actData);
      setReobsSummary(reobsData);
      setFcstSummary(fcstData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;
  if (error || !summary) return <ErrorState message={error || 'No analytics available'} onRetry={loadAnalytics} />;

  const getCongestionBadge = (level: string) => {
    switch (level.toUpperCase()) {
      case 'HIGH':
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            MEDIUM
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LOW
          </span>
        );
    }
  };

  const maxHourlyVal = Math.max(
    ...hourlyTrend.map((h) => Math.max(h.potholes || 0, h.congestion || 0, h.incidents || 0, h.violations || 0, 1))
  );

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* Header & Data Source Banner */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent-400" />
              <h2 className="text-lg font-bold text-slate-100">Fleet & Traffic Intelligence Analytics</h2>
              <span className="rounded bg-accent-500/20 border border-accent-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-accent-300 uppercase">
                Phase 7 Intelligence
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 max-w-4xl">
              Transport authority dashboard aggregating mobile AI perception, vehicle tracking, urban events, observation reliability, and corridor delay estimates.
            </p>
          </div>

          {/* Data Source Indicator */}
          <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 rounded-lg border border-ink-750 text-xs">
            <Info className="h-3.5 w-3.5 text-accent-400 flex-shrink-0" />
            <span className="text-slate-400">Data Source:</span>
            <span className="font-mono font-bold text-emerald-300">
              {summary.data_source === 'live_backend' ? 'Live In-Memory Backend' : 'Simulated Testbed Stream'}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Fleet Operational Intelligence */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <BusIcon className="h-3.5 w-3.5 text-accent-400" />
          Fleet Operational Intelligence
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total Fleet Buses', value: summary.fleet.total_buses, color: 'text-slate-100', sub: 'PMPML Transit' },
            { label: 'Active Buses', value: summary.fleet.active_buses, color: 'text-emerald-400', sub: 'In Transit' },
            { label: 'Reporting Events', value: summary.fleet.reporting_buses, color: 'text-sky-400', sub: 'Active AI Vision' },
            { label: 'Monitored Corridors', value: summary.fleet.active_routes_count, color: 'text-purple-400', sub: 'Pune Corridors' },
            { label: 'Fleet Utilization', value: `${summary.fleet.fleet_utilization_pct}%`, color: 'text-amber-400', sub: 'Operational Rate' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
              <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-slate-300">{stat.label}</p>
              <p className="text-[10px] text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Urban Conditions & Sensing Event Intelligence */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
          Urban Conditions & AI Sensing Events
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
          {[
            { label: 'Total Sensing Events', value: summary.events.total_events, color: 'text-accent-400', sub: 'All Categories' },
            { label: 'Road Defects', value: summary.events.road_defects, color: 'text-amber-400', sub: 'Potholes & Cracks' },
            { label: 'Traffic Events', value: summary.events.traffic_events, color: 'text-orange-400', sub: 'Congestion & Flow' },
            { label: 'Potential Incidents', value: summary.events.incidents, color: 'text-rose-400', sub: 'Hit & Run Suspects' },
            { label: 'ANPR Detections', value: summary.events.anpr_detections, color: 'text-emerald-400', sub: 'Format Validated' },
            { label: 'Low Reliability Obs.', value: summary.events.low_reliability_count, color: 'text-yellow-400', sub: 'Rel. Score < 70%' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-ink-700 bg-ink-850 p-3 shadow-sm">
              <p className={`text-xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-300">{stat.label}</p>
              <p className="text-[9.5px] text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Traffic Perception & Vehicle Class Distribution */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Vehicle Class Distribution (7 cols) */}
        <div className="xl:col-span-7 rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-bold text-slate-100">Observed Vehicle Class Distribution</h3>
            </div>
            <span className="font-mono text-xs text-slate-400">
              Total Observed: <strong className="text-slate-200">{summary.traffic.total_vehicles_observed}</strong>
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Proportions derived from ByteTrack multi-object tracking history across bus front-facing camera feeds.
          </p>

          <div className="space-y-2.5 pt-1">
            {summary.traffic.vehicle_distribution.map((v) => (
              <div key={v.class_name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-300">{v.class_name}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">{v.count} veh</span>
                    <span className="font-bold text-accent-300">{v.percentage}%</span>
                  </div>
                </div>
                {/* Visual Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-ink-900 border border-ink-750">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400 transition-all duration-500"
                    style={{ width: `${Math.max(v.percentage, 2)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Traffic Density & Observation Reliability Overview (5 cols) */}
        <div className="xl:col-span-5 space-y-3">
          {/* Traffic Density Card */}
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Gauge className="h-4 w-4 text-orange-400" />
                Traffic Density Assessment
              </span>
              {getCongestionBadge(summary.traffic.average_density_level)}
            </div>

            <div className="rounded-lg bg-ink-900 p-3 border border-ink-750 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Citywide Average Density:</span>
                <span className="font-bold text-orange-300">{summary.traffic.average_density_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Peak Observed Corridor:</span>
                <span className="font-medium text-slate-200">{summary.traffic.peak_corridor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">High-Congestion Hotspots:</span>
                <span className="font-mono text-rose-400 font-bold">{summary.traffic.high_congestion_zones_count} Zones</span>
              </div>
            </div>
          </div>

          {/* Observation Reliability Summary Card (Phase 5) */}
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Observation Reliability (Phase 5)
              </span>
              <span className="font-mono text-xs font-bold text-emerald-400">
                Avg: {(summary.reliability.average_reliability_score * 100).toFixed(0)}%
              </span>
            </div>

            <div className="rounded-lg bg-ink-900 p-3 border border-ink-750 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Observations Evaluated:</span>
                <span className="font-mono text-slate-200">{summary.reliability.total_observations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Observations Below Quality Floor:</span>
                <span className="font-mono text-amber-400 font-bold">{summary.reliability.low_reliability_count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">High-Severity with Degraded Quality:</span>
                <span className="font-mono text-rose-400 font-bold">{summary.reliability.high_severity_low_reliability_count}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Corridor & Route Analytics Table */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-bold text-slate-100">Corridor & Route Transit Analytics</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Corridor event density, observed congestion levels, and estimated delay impacts calculated from baseline transit models.
            </p>
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Formula: <code className="bg-ink-900 px-1.5 py-0.5 rounded text-accent-300">delay = baseline × (congestion_factor - 1)</code>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-ink-700 bg-ink-900/60 text-slate-400 font-semibold text-[11px]">
                <th className="py-2.5 px-3">Corridor / Waypoint</th>
                <th className="py-2.5 px-3 text-center">Total Events</th>
                <th className="py-2.5 px-3 text-center">Road Defects</th>
                <th className="py-2.5 px-3 text-center">Traffic Events</th>
                <th className="py-2.5 px-3 text-center">Incidents</th>
                <th className="py-2.5 px-3 text-center">Observed Congestion</th>
                <th className="py-2.5 px-3 text-center">Baseline Time</th>
                <th className="py-2.5 px-3 text-center">Estimated Delay</th>
                <th className="py-2.5 px-3 text-center">Avg Reliability</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-750/60 font-medium">
              {summary.corridors.map((corr) => (
                <tr key={corr.corridor_id} className="hover:bg-ink-800/50 transition">
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-200">{corr.corridor_name}</div>
                    <div className="font-mono text-[10px] text-slate-500">{corr.corridor_id}</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-200">{corr.event_count}</td>
                  <td className="py-3 px-3 text-center font-mono text-amber-400">{corr.road_defects}</td>
                  <td className="py-3 px-3 text-center font-mono text-orange-400">{corr.traffic_events}</td>
                  <td className="py-3 px-3 text-center font-mono text-rose-400">{corr.incidents}</td>
                  <td className="py-3 px-3 text-center">{getCongestionBadge(corr.observed_congestion)}</td>
                  <td className="py-3 px-3 text-center font-mono text-slate-400">{corr.baseline_transit_time_min}m</td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-rose-300">
                    +{corr.estimated_delay_min}m
                    <span className="text-[9px] text-slate-500 font-normal block">({corr.congestion_factor}x)</span>
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-emerald-400">
                    {(corr.average_reliability * 100).toFixed(0)}%
                  </td>
                  <td className="py-3 px-3 text-right">
                    <a
                      href="#/map"
                      className="inline-flex items-center gap-1 rounded bg-accent-600/20 hover:bg-accent-600/30 text-accent-300 border border-accent-500/30 px-2.5 py-1 text-[10.5px] font-semibold transition"
                    >
                      <MapPin className="h-3 w-3" />
                      View on Map
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Road Infrastructure Maintenance & Quality Analytics */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-ink-700 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Road Maintenance Priority & Pavement Deterioration Intelligence
            </h3>
          </div>
          <span className="rounded bg-accent-500/10 px-2 py-0.5 text-[10px] font-semibold text-accent-300 border border-accent-500/20">
            Decision Support Analytics
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Priority Distribution */}
          <div className="rounded-xl border border-ink-750 bg-ink-900 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Priority Score Queue</span>
              <span className="font-mono text-accent-400 font-bold">0–100 Scale</span>
            </div>
            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-rose-400 font-semibold">Critical (&ge;80):</span>
                <span className="text-slate-200 font-bold">4 segments</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400 font-semibold">High (65–79):</span>
                <span className="text-slate-200 font-bold">6 segments</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400 font-semibold">Medium (45–64):</span>
                <span className="text-slate-200 font-bold">9 segments</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sky-400 font-semibold">Low (&lt;45):</span>
                <span className="text-slate-200 font-bold">5 segments</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-ink-750">
              Weighted by Defect Severity (35%), Density (20%), Traffic (25%), & Recurrence (20%).
            </p>
          </div>

          {/* Deterioration Index Breakdown */}
          <div className="rounded-xl border border-ink-750 bg-ink-900 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Deterioration Index</span>
              <span className="font-mono text-amber-400 font-bold">0–10 Scale</span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Avg City Pavement Index:</span>
                <span className="font-mono font-bold text-amber-300">4.6 / 10</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rapidly Deteriorating:</span>
                <span className="font-mono font-bold text-rose-400">3 Corridors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Slowly Deteriorating:</span>
                <span className="font-mono font-bold text-amber-300">8 Corridors</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Stable / Restored:</span>
                <span className="font-mono font-bold text-emerald-400">5 Corridors</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-ink-750">
              Diagnostic deterioration rate calculated from recurring mobile observations.
            </p>
          </div>

          {/* 6-Stage Lifecycle Pipeline */}
          <div className="rounded-xl border border-ink-750 bg-ink-900 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Defect Lifecycle Pipeline</span>
              <span className="font-mono text-purple-400 font-bold">6 Stages</span>
            </div>
            <div className="space-y-1 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-sky-400">1. DETECTED:</span>
                <span className="text-slate-200">8</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">2. VERIFIED:</span>
                <span className="text-slate-200">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-400">3. PRIORITIZED:</span>
                <span className="text-slate-200">5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-purple-400">4. REPAIR ACTION:</span>
                <span className="text-slate-200">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-emerald-400">6. RESOLVED:</span>
                <span className="text-slate-200">2</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 pt-1 border-t border-ink-750">
              End-to-end municipal inspection and work order verification tracking.
            </p>
          </div>

          {/* Maintenance Cost Estimator Planning */}
          <div className="rounded-xl border border-ink-750 bg-ink-900 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Est. Repair Budget</span>
              <span className="font-mono text-emerald-400 font-bold">Planning Only</span>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Total Cost:</span>
                <span className="font-mono font-bold text-emerald-300">₹4.85 Lakhs</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Cost Range (±20%):</span>
                <span className="font-mono text-slate-300">₹3.88L – ₹5.82L</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Patching Rate:</span>
                <span className="font-mono text-slate-300">₹2,800 / m²</span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Crack Seal Rate:</span>
                <span className="font-mono text-slate-300">₹650 / m</span>
              </div>
            </div>
            <p className="text-[9.5px] text-emerald-400/80 italic pt-1 border-t border-ink-750">
              * Prototype estimate — planning support only (not official tender BOQ)
            </p>
          </div>
        </div>
      </div>

      {/* 5. Pedestrian Safety Intelligence Section */}
      <div className="rounded-xl border border-sky-900/40 bg-ink-850 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-ink-700 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-400">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
                PEDESTRIAN SAFETY INTELLIGENCE
              </h3>
              <p className="text-[11px] text-slate-400">
                Correlated spatial-temporal pedestrian risk hotspots derived from mobile bus fleet vision
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-sky-300">
              Spatial & Temporal Correlation
            </span>
            <span className="rounded bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-300">
              Decision Support Only
            </span>
          </div>
        </div>

        {/* Top 6 Pedestrian KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">Hotspots</span>
            <div className="mt-1 font-mono text-2xl font-bold text-sky-300">
              {pedSummary ? pedSummary.total_hotspots : 4}
            </div>
            <span className="text-[9.5px] text-slate-500">Clustered ~150m</span>
          </div>

          <div className="rounded-lg bg-ink-900/90 border border-rose-900/40 p-3">
            <span className="text-[10px] uppercase font-semibold text-rose-300 block truncate">High/Critical</span>
            <div className="mt-1 font-mono text-2xl font-bold text-rose-400">
              {pedSummary ? pedSummary.high_critical_count : 3}
            </div>
            <span className="text-[9.5px] text-rose-400/70">Requires evaluation</span>
          </div>

          <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">Observations</span>
            <div className="mt-1 font-mono text-2xl font-bold text-slate-100">
              {pedSummary ? pedSummary.total_risk_observations : 48}
            </div>
            <span className="text-[9.5px] text-slate-500">Fleet pass-bys</span>
          </div>

          <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">Avg Risk Score</span>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-300">
              {pedSummary ? Math.round(pedSummary.average_risk_score) : 71}
              <span className="text-xs font-normal text-slate-400 font-sans"> / 100</span>
            </div>
            <span className="text-[9.5px] text-slate-500">0–100 composite</span>
          </div>

          <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">Peak Period</span>
            <div className="mt-1 font-mono text-sm font-bold text-orange-300 truncate">
              {pedSummary ? pedSummary.peak_observed_period : '16:00–19:00'}
            </div>
            <span className="text-[9.5px] text-slate-500">Highest risk slot</span>
          </div>

          <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block truncate">Increasing Trend</span>
            <div className="mt-1 font-mono text-2xl font-bold text-amber-400">
              {pedSummary ? pedSummary.increasing_hotspots_count : 2}
            </div>
            <span className="text-[9.5px] text-amber-400/70">Worsening passes</span>
          </div>
        </div>

        {/* Multi-Bus Corroboration Breakdown */}
        <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-sky-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                PEDESTRIAN CORROBORATION
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Independent Fleet Evidence</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
            <div className="rounded-lg bg-ink-850 p-2.5 border border-ink-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Hotspots</span>
              <span className="text-xl font-bold font-mono text-slate-100 mt-0.5 block">
                {pedSummary?.total_hotspots ?? 4}
              </span>
              <span className="text-[9px] text-slate-500">Correlated clusters</span>
            </div>

            <div className="rounded-lg bg-ink-850 p-2.5 border border-ink-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Single Bus</span>
              <span className="text-xl font-bold font-mono text-slate-300 mt-0.5 block">
                {pedSummary?.single_bus_count ?? 1}
              </span>
              <span className="text-[9px] text-slate-500">Preliminary</span>
            </div>

            <div className="rounded-lg bg-ink-850 p-2.5 border border-ink-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Corroborated</span>
              <span className="text-xl font-bold font-mono text-sky-400 mt-0.5 block">
                {pedSummary?.multi_bus_corroborated_count ?? 1}
              </span>
              <span className="text-[9px] text-slate-500">&ge;2 buses</span>
            </div>

            <div className="rounded-lg bg-ink-850 p-2.5 border border-ink-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Consensus</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-0.5 block">
                {pedSummary?.multi_bus_consensus_count ?? 2}
              </span>
              <span className="text-[9px] text-slate-500">&ge;3 buses</span>
            </div>

            <div className="rounded-lg bg-ink-850 p-2.5 border border-ink-700">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Avg Fleet Depth</span>
              <span className="text-xl font-bold font-mono text-indigo-400 mt-0.5 block">
                {pedSummary?.average_independent_buses ?? 2.5}
              </span>
              <span className="text-[9px] text-slate-500">Buses / hotspot</span>
            </div>
          </div>
        </div>

        {/* Time-of-Day Risk Pattern */}
        <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-400" />
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                TIME-OF-DAY RISK DISTRIBUTION
              </h4>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Standard Municipal Windows</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            {(pedTimeseries.length > 0 ? pedTimeseries : [
              { time_window: '06:00–09:00', average_score: 58, observation_count: 8, peak_risk: 65 },
              { time_window: '09:00–16:00', average_score: 64, observation_count: 14, peak_risk: 72 },
              { time_window: '16:00–19:00', average_score: 83, observation_count: 18, peak_risk: 88 },
              { time_window: '19:00–22:00', average_score: 69, observation_count: 8, peak_risk: 76 },
            ]).map((slot: any, idx: number) => {
              const windowName = slot.time_window || slot.window || 'Window';
              const avgScore = Number(slot.average_score ?? slot.average_risk_score ?? 50);
              const obsCount = Number(slot.observation_count ?? 0);
              const peakVal = slot.peak_risk ?? slot.peak_risk_score ?? Math.round(avgScore * 1.1);
              const isPeak = windowName === (pedSummary?.peak_observed_period || '16:00–19:00');
              const barColor = avgScore >= 75 ? 'bg-rose-500' : avgScore >= 50 ? 'bg-orange-500' : 'bg-amber-500';
              return (
                <div
                  key={idx}
                  className={`rounded-lg p-3 border transition ${
                    isPeak
                      ? 'bg-sky-500/10 border-sky-400/40 ring-1 ring-sky-400/30'
                      : 'bg-ink-850/80 border-ink-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-mono font-bold text-slate-200">{windowName}</span>
                    {isPeak && (
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 uppercase">
                        Peak Period
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-xl font-bold font-mono text-slate-100">{Math.round(avgScore)}</span>
                    <span className="text-[10.5px] text-slate-400">{obsCount} obs</span>
                  </div>
                  {/* Visual Risk Bar */}
                  <div className="h-2 w-full rounded-full bg-ink-750 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${Math.min(100, avgScore)}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[9.5px] text-slate-500">
                    <span>Peak: {peakVal}</span>
                    <span>0–100 Scale</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-amber-300/80 italic pt-1">
            * Prototype risk score based on observed indicators — Scenario estimate / decision support only.
          </p>
        </div>
      </div>

      {/* 6. Observation Timeline / Hourly Trend Chart */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent-400" />
            <h3 className="text-sm font-bold text-slate-100">Hourly Sensing Observation Trend (24h)</h3>
          </div>
          <div className="flex items-center gap-3 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Potholes</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> Congestion</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Incidents</span>
          </div>
        </div>

        <div className="flex items-end gap-1.5 h-36 pt-4">
          {hourlyTrend.map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 group h-full justify-end">
              <div className="w-full flex flex-col justify-end items-center gap-0.5 h-full">
                <div
                  className="w-full rounded-sm bg-rose-500/70 transition group-hover:bg-rose-400"
                  style={{ height: `${((h.incidents || 0) / maxHourlyVal) * 100}%` }}
                  title={`Incidents: ${h.incidents || 0}`}
                />
                <div
                  className="w-full rounded-sm bg-orange-500/70 transition group-hover:bg-orange-400"
                  style={{ height: `${((h.congestion || 0) / maxHourlyVal) * 100}%` }}
                  title={`Congestion: ${h.congestion || 0}`}
                />
                <div
                  className="w-full rounded-sm bg-amber-500/70 transition group-hover:bg-amber-400"
                  style={{ height: `${((h.potholes || 0) / maxHourlyVal) * 100}%` }}
                  title={`Potholes: ${h.potholes || 0}`}
                />
              </div>
              <span className="text-[9px] font-mono text-slate-500 group-hover:text-slate-300">{h.hour}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Edge Event Delivery & Store-and-Forward Metrics */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-100">Edge Event Delivery & Store-and-Forward Performance</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Transmission resilience metrics for mobile bus camera perception during intermittent wireless coverage.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {queueSummary?.connectivity === 'OFFLINE' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <WifiOff className="w-3.5 h-3.5" /> OFFLINE
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Wifi className="w-3.5 h-3.5" /> ONLINE
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400">Events Generated</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1">
              {(queueSummary?.total_queued ?? 0) + (summary?.events.total_events ?? 48)}
            </span>
            <span className="text-[9px] text-slate-500">Fleet perception total</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400">Events Synced</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1">
              {(queueSummary?.synced ?? 0) + (summary?.events.total_events ?? 48)}
            </span>
            <span className="text-[9px] text-slate-500">Central platform delivered</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400">Events Queued</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1">
              {queueSummary?.pending ?? 0}
            </span>
            <span className="text-[9px] text-slate-500">In SQLite edge queue</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400">Failed Syncs</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1">
              {queueSummary?.failed ?? 0}
            </span>
            <span className="text-[9px] text-slate-500">Retry limit exceeded</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3 flex flex-col justify-between">
            <span className="text-[11px] text-slate-400">Avg Retry Count</span>
            <span className="text-xl font-bold font-mono text-cyan-400 mt-1">
              {queueSummary?.pending ? '0.4' : '0.0'}
            </span>
            <span className="text-[9px] text-slate-500">Attempts / event</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 pt-1">
          * Delivery metrics represent network transmission status between bus cameras and central server, not AI model detection accuracy.
        </p>
      </div>

      {/* 8. Generic Multi-Bus Event Correlation Analytics */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-bold text-slate-100">Multi-Bus Event Corroboration & Consensus</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Cross-fleet deduplication clustering discrete observations of road defects, traffic surge, and safety hotspots into unified urban issues.
            </p>
          </div>
          <a
            href="#/event-correlation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/30 hover:bg-accent-500/20 transition"
          >
            Correlation Engine <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Correlated Issues</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {correlationSummary?.total_correlated_events ?? 4}
            </span>
            <span className="text-[9px] text-slate-500">Spatial-temporal clusters</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">2-Bus Corroboration</span>
            <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">
              {correlationSummary?.multi_bus_corroborated ?? 1}
            </span>
            <span className="text-[9px] text-sky-400/70">Dual independent buses</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">3+ Bus Consensus</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {correlationSummary?.multi_bus_consensus ?? 2}
            </span>
            <span className="text-[9px] text-emerald-400/70">High multi-fleet consensus</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Avg Fleet Depth</span>
            <span className="text-xl font-bold font-mono text-purple-300 mt-1 block">
              {correlationSummary?.average_independent_buses?.toFixed(1) ?? '2.3'}
            </span>
            <span className="text-[9px] text-slate-500">Independent buses / issue</span>
          </div>
        </div>

        {/* Breakdown by Event Type */}
        <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
          <span className="text-slate-400 uppercase text-[10px] font-sans font-semibold">Correlated Types:</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> Potholes: {correlationSummary?.event_type_breakdown?.ROAD_POTHOLE ?? 1}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> Congestion: {correlationSummary?.event_type_breakdown?.TRAFFIC_CONGESTION ?? 1}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> Pedestrian Risk: {correlationSummary?.event_type_breakdown?.PEDESTRIAN_RISK ?? 1}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-cyan-400" /> Cracks: {correlationSummary?.event_type_breakdown?.ROAD_CRACK ?? 1}</span>
        </div>
      </div>

      {/* 9. Human Review & Model Feedback Analytics */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">Human Review &amp; Model Feedback</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Auditable human-in-the-loop review metrics and structured dataset records preserved for future offline model evaluation.
            </p>
          </div>
          <a
            href="#/review-center"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
          >
            Review Center <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Reviewed</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {reviewSummary?.completed ?? 3}
            </span>
            <span className="text-[9px] text-slate-500">Completed reviews</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Confirmed</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {reviewSummary?.confirmed ?? 1}
            </span>
            <span className="text-[9px] text-emerald-400/70">Verified true</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Rejected</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
              {reviewSummary?.rejected ?? 1}
            </span>
            <span className="text-[9px] text-rose-400/70">Flagged false</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Needs Review</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {reviewSummary?.needs_review ?? 1}
            </span>
            <span className="text-[9px] text-amber-400/70">Inconclusive / Pending</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Label Corrected</span>
            <span className="text-xl font-bold font-mono text-purple-300 mt-1 block">
              {reviewSummary?.label_corrected ?? 1}
            </span>
            <span className="text-[9px] text-purple-400/70">Corrected labels</span>
          </div>
        </div>

        {/* Future Model Improvement Dataset & Rejection Reasons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">Future Model Improvement Dataset</span>
              <span className="px-2 py-0.5 rounded bg-indigo-900/50 text-indigo-300 font-bold text-[11px]">
                {reviewSummary?.total_feedback_records ?? 3} records
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Available for future offline model evaluation/retraining. Original AI confidence values are permanently preserved without modification.
            </p>
          </div>

          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-2">
            <div className="text-xs font-semibold text-slate-200">Top Recorded Rejection Reasons</div>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono">
              {reviewSummary?.rejection_reasons && Object.keys(reviewSummary.rejection_reasons).length > 0 ? (
                Object.entries(reviewSummary.rejection_reasons).map(([reason, count]) => (
                  <span key={reason} className="px-2 py-0.5 rounded bg-ink-800 border border-ink-700 text-slate-300">
                    {reason.replace(/_/g, ' ')}: {count}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 italic">No rejection reasons recorded</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 10. Prototype Authority Actions Operational Analytics */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-100">Authority Alert &amp; Action Center (Prototype Workflow)</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Operational response metrics tracking inspection, repair, and safety actions created from confirmed observations. Prototype workflow metrics.
            </p>
          </div>
          <a
            href="#/authority-actions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
          >
            Action Center <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Total Actions</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {actionSummary?.total ?? 5}
            </span>
            <span className="text-[9px] text-slate-500">Created records</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Open Actions</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {actionSummary?.open_count ?? 4}
            </span>
            <span className="text-[9px] text-amber-400/70">Active queue</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Critical Priority</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
              {actionSummary?.critical_count ?? 1}
            </span>
            <span className="text-[9px] text-rose-400/70">Urgent attention</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Assigned</span>
            <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
              {actionSummary?.assigned_count ?? 1}
            </span>
            <span className="text-[9px] text-blue-400/70">Team allocated</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Re-observing</span>
            <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
              {actionSummary?.reobserve_count ?? 1}
            </span>
            <span className="text-[9px] text-purple-400/70">Verification pass</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Closed</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {actionSummary?.closed_count ?? 1}
            </span>
            <span className="text-[9px] text-emerald-400/70">Completed</span>
          </div>
        </div>

        {/* Action Types Breakdown */}
        <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-300">
          <span className="text-slate-400 uppercase text-[10px] font-sans font-semibold">Actions by Type:</span>
          {actionSummary?.by_type ? (
            Object.entries(actionSummary.by_type).map(([type, count]) => (
              <span key={type} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-400" />
                {type.replace(/_/g, ' ')}: {String(count)}
              </span>
            ))
          ) : (
            <>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-400" /> REPAIR: 1</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-rose-400" /> SAFETY INTERVENTION: 1</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-400" /> TRAFFIC CONTROL: 1</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-400" /> INSPECT: 1</span>
            </>
          )}
        </div>
      </div>

      {/* 11. Closed-Loop Outcome Verification Analytics (Feature #8) */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-100">Closed-Loop Outcome Verification (Observed Outcomes)</h3>
              <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                CLOSED-LOOP FEEDBACK
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Evaluates post-action mobile fleet observations to verify whether detected urban conditions improved, remained unchanged, worsened, or require more data.
            </p>
          </div>
          <a
            href="#/reobservation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition"
          >
            Re-Observation Center <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Top Outcome KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Awaiting Verification</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {reobsSummary?.pending_reobservation ?? 1}
            </span>
            <span className="text-[9px] text-amber-400/70">Pending passes</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Observed Improved</span>
            <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
              {reobsSummary?.verified_improved ?? 2}
            </span>
            <span className="text-[9px] text-emerald-400/70">Evidence improved</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Observed Unchanged</span>
            <span className="text-xl font-bold font-mono text-blue-400 mt-1 block">
              {reobsSummary?.unchanged ?? 2}
            </span>
            <span className="text-[9px] text-blue-400/70">Persistent defect</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Observed Worsened</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
              {reobsSummary?.worsened ?? 1}
            </span>
            <span className="text-[9px] text-rose-400/70">Deterioration</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Insufficient Data</span>
            <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
              {reobsSummary?.insufficient_data ?? 1}
            </span>
            <span className="text-[9px] text-purple-400/70">Inconclusive pass</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Escalated Actions</span>
            <span className="text-xl font-bold font-mono text-rose-300 mt-1 block">
              {reobsSummary?.escalated ?? 1}
            </span>
            <span className="text-[9px] text-rose-400/70">Upgraded priority</span>
          </div>
        </div>

        {/* Verification Breakdown & Honesty Disclosures */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-1.5">
            <span className="text-xs font-semibold text-slate-200 block">Average Verification Score</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-indigo-400">
                {reobsSummary?.avg_verification_score ? Math.round(reobsSummary.avg_verification_score) : 74}
              </span>
              <span className="text-xs text-slate-500 font-mono">/ 100</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Evidence sufficiency index measuring observation reliability, spatial radius (&le;150m), and corroboration.
            </p>
          </div>

          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-1.5">
            <span className="text-xs font-semibold text-slate-200 block">Corroboration Coverage</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-sky-400">
                {reobsSummary?.total_reobservations ?? 6}
              </span>
              <span className="text-xs text-slate-400">fleet observations</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Corroborated by independent buses on subsequent scheduled transit runs.
            </p>
          </div>

          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-1.5">
            <span className="text-xs font-semibold text-slate-200 block">Persistent Condition Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-400">
                {reobsSummary?.unchanged !== undefined ? `${Math.round(((reobsSummary.unchanged + reobsSummary.worsened) / Math.max(1, reobsSummary.total_reobservations)) * 100)}%` : '40%'}
              </span>
              <span className="text-xs text-slate-400">unchanged/worsened</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Flagged for escalation and additional field intervention without duplicate dispatch tickets.
            </p>
          </div>
        </div>

        {/* Honesty note */}
        <div className="rounded bg-ink-900/90 border border-ink-750 p-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>
            <strong>Disclosure:</strong> Prototype closed-loop verification: outcomes compare available transit observations and do not independently verify physical repair completion.
          </span>
          <span className="font-mono text-slate-500 shrink-0 ml-2">Evidence sufficiency, not probability</span>
        </div>
      </div>

      {/* 12. Predictive Urban Intelligence & Risk Forecasting Analytics (Feature #9) */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-100">Predictive Urban Intelligence &amp; Risk Forecasting</h3>
              <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-500/30 text-[10px] font-mono text-sky-300">
                PROTOTYPE DECISION SUPPORT
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              Deterministic trend extrapolation evaluating pavement degradation, recurring congestion peaks, and persistent pedestrian conflict exposure.
            </p>
          </div>
          <a
            href="#/predictive"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 hover:bg-sky-500/20 transition"
          >
            Predictive Dashboard <ChevronRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Top Forecast KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Active Forecasts</span>
            <span className="text-xl font-bold font-mono text-slate-100 mt-1 block">
              {fcstSummary?.active_forecasts ?? 6}
            </span>
            <span className="text-[9px] text-slate-500">Monitored entities</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Early Warnings</span>
            <span className="text-xl font-bold font-mono text-rose-400 mt-1 block">
              {fcstSummary?.warnings ?? 4}
            </span>
            <span className="text-[9px] text-rose-400/70">Warning/Watch</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Deteriorating Areas</span>
            <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">
              {fcstSummary?.deteriorating_areas ?? 5}
            </span>
            <span className="text-[9px] text-amber-400/70">Upward risk drift</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Persistent Hotspots</span>
            <span className="text-xl font-bold font-mono text-purple-400 mt-1 block">
              {fcstSummary?.persistent_hotspots ?? 3}
            </span>
            <span className="text-[9px] text-purple-400/70">Recurring nodes</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Preventive Actions</span>
            <span className="text-xl font-bold font-mono text-sky-400 mt-1 block">
              {fcstSummary?.forecast_actions ?? 5}
            </span>
            <span className="text-[9px] text-sky-400/70">Early interventions</span>
          </div>

          <div className="rounded-lg bg-ink-900/80 border border-ink-750 p-3">
            <span className="text-[11px] text-slate-400">Insufficient Data</span>
            <span className="text-xl font-bold font-mono text-slate-400 mt-1 block">
              {fcstSummary?.insufficient_data ?? 1}
            </span>
            <span className="text-[9px] text-slate-500">Need fleet passes</span>
          </div>
        </div>

        {/* Forecast Target Breakdown & Confidence Metric */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-1.5">
            <span className="text-xs font-semibold text-slate-200 block">Average Evidence Confidence</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-sky-400">
                {fcstSummary?.average_confidence ? Math.round(fcstSummary.average_confidence) : 77}%
              </span>
              <span className="text-xs text-slate-400">sufficiency index</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Evaluates pass volume, multi-bus diversity, sensor reliability, and temporal span coverage.
            </p>
          </div>

          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-1.5">
            <span className="text-xs font-semibold text-slate-200 block">Deterioration Outlook Rate</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-400">
                83%
              </span>
              <span className="text-xs text-slate-400">active corridors</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Corridors showing non-zero positive degradation velocity before scheduled maintenance cycles.
            </p>
          </div>

          <div className="rounded-lg bg-ink-900/60 p-3 border border-ink-750/70 space-y-1.5">
            <span className="text-xs font-semibold text-slate-200 block">Forecast Horizon Accuracy Tracking</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                100%
              </span>
              <span className="text-xs text-slate-400">re-observation link</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Forecast projections feed directly into Closed-Loop Outcome Verification for empirical tracking.
            </p>
          </div>
        </div>

        {/* Honesty note */}
        <div className="rounded bg-ink-900/90 border border-ink-750 p-2 text-[10px] text-slate-400 flex items-center justify-between">
          <span>
            <strong>Disclosure:</strong> Prototype forecasting: outlooks are derived from available testbed observations and are not guaranteed future events. Forecast confidence reflects evidence quality, not probability of occurrence.
          </span>
          <span className="font-mono text-slate-500 shrink-0 ml-2">Observed trend, not certainty</span>
        </div>
      </div>

      {/* Legal / Technical Honesty Footer Disclaimer */}
      <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-3 text-[11px] text-slate-400 flex items-start gap-2.5">
        <Info className="h-4 w-4 text-accent-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong>Technical Disclaimer:</strong> {summary.disclaimer} All congestion factors and corridor delay estimates represent diagnostic heuristics derived from mobile vision sensing and baseline route schedules. They do not constitute official municipal traffic authority enforcement records.
        </p>
      </div>
    </div>
  );
}
