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
} from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { apiService } from '@/services/api';
import type { AnalyticsSummary, CorridorMetric } from '@/types';

export function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [hourlyTrend, setHourlyTrend] = useState<any[]>([]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumData, hourlyData] = await Promise.all([
        apiService.getAnalyticsSummary(),
        apiService.getHourlyTrend(),
      ]);
      setSummary(sumData);
      setHourlyTrend(hourlyData as any[]);
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
              {summary.data_source === 'live_backend' ? 'Live In-Memory Backend' : 'Demo / Simulated Data'}
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

      {/* 5. Observation Timeline / Hourly Trend Chart */}
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
