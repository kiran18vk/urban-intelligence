import { useState, useEffect } from 'react';
import { TrafficCone, MapPin, Clock, TrendingUp, TrendingDown, Minus, Gauge, ArrowRight } from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { SeverityBadge } from '@/components/ui/Badges';
import { ConfidenceBar } from '@/components/ui/StateWrappers';
import { MapComponent } from '@/components/Map/MapComponent';
import { apiService } from '@/services/api';
import { trafficCongestion as mockCongestion } from '@/data/mockData';
import type { TrafficCongestion } from '@/types';
import { formatTimestamp } from '@/lib/eventMeta';

export function TrafficPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TrafficCongestion[]>([]);
  const [selected, setSelected] = useState<TrafficCongestion | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const cong = await apiService.getTrafficCongestion();
      setData(cong);
      setSelected(cong[0] ?? null);
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

  const sorted = [...data].sort((a, b) => b.severity.localeCompare(a.severity));

  const TrendIcon = ({ trend }: { trend: TrafficCongestion['trend'] }) => {
    if (trend === 'increasing') return <TrendingUp className="h-3.5 w-3.5 text-rose-400" />;
    if (trend === 'decreasing') return <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />;
    return <Minus className="h-3.5 w-3.5 text-slate-400" />;
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Summary bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Congested Areas', value: data.length, color: 'text-orange-400' },
          { label: 'Critical', value: data.filter((d) => d.severity === 'critical').length, color: 'text-rose-400' },
          { label: 'Building Up', value: data.filter((d) => d.status === 'building').length, color: 'text-amber-400' },
          { label: 'Clearing', value: data.filter((d) => d.status === 'clearing').length, color: 'text-emerald-400' },
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
            congestion={data}
            filters={{ buses: false, potholes: false, waterlogging: false, congestion: true, incidents: false }}
            height="500px"
          />
        </div>

        {/* Detail panel */}
        <div className="rounded-xl border border-ink-700 bg-ink-850 p-5">
          {selected ? (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200">{selected.roadName}</h3>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3 w-3" /> {selected.area}
                  </p>
                </div>
                <SeverityBadge severity={selected.severity} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-ink-900 p-3">
                  <div className="flex items-center gap-1.5">
                    <Gauge className="h-3.5 w-3.5 text-orange-400" />
                    <span className="text-[10px] uppercase text-slate-500">Avg Speed</span>
                  </div>
                  <p className="mt-1 text-xl font-bold tabular text-slate-200">{selected.avgSpeed} <span className="text-xs font-normal text-slate-500">km/h</span></p>
                </div>
                <div className="rounded-lg bg-ink-900 p-3">
                  <span className="text-[10px] uppercase text-slate-500">Free Flow</span>
                  <p className="mt-1 text-xl font-bold tabular text-slate-200">{selected.freeFlowSpeed} <span className="text-xs font-normal text-slate-500">km/h</span></p>
                </div>
                <div className="rounded-lg bg-ink-900 p-3">
                  <span className="text-[10px] uppercase text-slate-500">Queue Length</span>
                  <p className="mt-1 text-xl font-bold tabular text-slate-200">{selected.queueLength} <span className="text-xs font-normal text-slate-500">m</span></p>
                </div>
                <div className="rounded-lg bg-ink-900 p-3">
                  <span className="text-[10px] uppercase text-slate-500">Duration</span>
                  <p className="mt-1 text-xl font-bold tabular text-slate-200">{selected.duration} <span className="text-xs font-normal text-slate-500">min</span></p>
                </div>
              </div>

              <div className="mt-4">
                <ConfidenceBar value={selected.density / 100} label="Density" />
              </div>

              <div className="mt-4 flex items-center justify-between rounded-lg bg-ink-900 p-3">
                <div className="flex items-center gap-2">
                  <TrendIcon trend={selected.trend} />
                  <span className="text-xs text-slate-400 capitalize">{selected.trend}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`rounded-md px-2 py-0.5 text-[10px] font-medium capitalize ${
                    selected.status === 'building' ? 'bg-amber-500/15 text-amber-300' : selected.status === 'stable' ? 'bg-orange-500/15 text-orange-300' : 'bg-emerald-500/15 text-emerald-300'
                  }`}>{selected.status}</span>
                </div>
              </div>

              <p className="mt-4 flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" /> Detected {formatTimestamp(selected.detectedAt)}
              </p>
            </>
          ) : (
            <EmptyState title="No area selected" message="Select a congestion point from the list to view details." />
          )}
        </div>
      </div>

      {/* Congestion list */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-200">All Congestion Zones</h3>
        {sorted.length === 0 ? (
          <EmptyState title="No congestion detected" message="Traffic is flowing normally across all monitored roads." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-ink-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-700 bg-ink-900 text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">Road</th>
                  <th className="px-4 py-3 text-left font-medium">Area</th>
                  <th className="px-4 py-3 text-center font-medium">Severity</th>
                  <th className="px-4 py-3 text-center font-medium">Avg Speed</th>
                  <th className="px-4 py-3 text-center font-medium">Queue</th>
                  <th className="px-4 py-3 text-center font-medium">Duration</th>
                  <th className="px-4 py-3 text-center font-medium">Trend</th>
                  <th className="px-4 py-3 text-right font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-700">
                {sorted.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`cursor-pointer transition ${selected?.id === c.id ? 'bg-ink-800' : 'hover:bg-ink-850/50'}`}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-200">{c.roadName}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-600">{c.id}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{c.area}</td>
                    <td className="px-4 py-3 text-center"><SeverityBadge severity={c.severity} /></td>
                    <td className="px-4 py-3 text-center">
                      <span className={`font-mono tabular font-medium ${c.avgSpeed < 15 ? 'text-rose-400' : c.avgSpeed < 25 ? 'text-amber-400' : 'text-slate-300'}`}>{c.avgSpeed}</span>
                      <span className="text-[10px] text-slate-600"> km/h</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono tabular text-slate-400">{c.queueLength}m</td>
                    <td className="px-4 py-3 text-center font-mono tabular text-slate-400">{c.duration}m</td>
                    <td className="px-4 py-3 text-center"><TrendIcon trend={c.trend} /></td>
                    <td className="px-4 py-3 text-right">
                      <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
