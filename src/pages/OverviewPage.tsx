import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus as BusIcon, Radar, CircleAlert, TrafficCone, Siren, Activity, ArrowRight, Cpu, Camera, Zap } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { EventCard } from '@/components/ui/EventCard';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { MapComponent } from '@/components/Map/MapComponent';
import { apiService } from '@/services/api';
import { buses as mockBuses, detectionEvents as mockEvents, trafficCongestion as mockCongestion, incidents as mockIncidents, roadDefects as mockDefects, overviewStats as mockStats } from '@/data/mockData';
import type { DetectionEvent, Bus, TrafficCongestion, Incident, RoadDefect } from '@/types';

export function OverviewPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<typeof mockStats | null>(null);
  const [recentEvents, setRecentEvents] = useState<DetectionEvent[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [congestion, setCongestion] = useState<TrafficCongestion[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [defects, setDefects] = useState<RoadDefect[]>([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, events, busData, cong, inc, def] = await Promise.all([
        apiService.getOverviewStats(),
        apiService.getEvents(),
        apiService.getBuses(),
        apiService.getTrafficCongestion(),
        apiService.getIncidents(),
        apiService.getRoadDefects(),
      ]);
      setStats(s);
      setRecentEvents([...events].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 8));
      setBuses(busData);
      setCongestion(cong);
      setIncidents(inc);
      setDefects(def);
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
  if (error || !stats) return <ErrorState message={error ?? 'No data'} onRetry={loadData} />;

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <div className="space-y-6 animate-fade-in">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-6">
        <StatCard
          label="Active Buses"
          value={stats.activeBuses}
          total={stats.totalBuses}
          icon={BusIcon}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          trend={{ value: '2 new', direction: 'up' }}
          sparkline={[6, 7, 8, 9, 10, 8, 11]}
          onClick={() => navigate('/map')}
        />
        <StatCard
          label="Events Detected Today"
          value={stats.eventsDetected}
          icon={Radar}
          iconColor="text-accent-400"
          iconBg="bg-accent-500/10"
          trend={{ value: '12%', direction: 'up' }}
          sparkline={[15, 22, 18, 25, 30, 28, 40]}
          onClick={() => navigate('/analytics')}
        />
        <StatCard
          label="Road Defects"
          value={stats.roadDefects}
          icon={CircleAlert}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          trend={{ value: '3 new', direction: 'up' }}
          sparkline={[12, 14, 16, 18, 20, 22, 24]}
          onClick={() => navigate('/defects')}
        />
        <StatCard
          label="Traffic Congestion"
          value={stats.trafficCongestion}
          icon={TrafficCone}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          trend={{ value: '5%', direction: 'down' }}
          sparkline={[18, 16, 20, 15, 14, 16, 14]}
          onClick={() => navigate('/traffic')}
        />
        <StatCard
          label="Active Incidents"
          value={stats.activeIncidents}
          total={stats.totalIncidents}
          icon={Siren}
          iconColor="text-rose-400"
          iconBg="bg-rose-500/10"
          trend={{ value: '1 new', direction: 'up' }}
          sparkline={[3, 5, 4, 6, 7, 8, 8]}
          onClick={() => navigate('/incidents')}
        />
        <StatCard
          label="Camera Feeds"
          value={stats.cameraFeeds}
          icon={Camera}
          iconColor="text-teal-400"
          iconBg="bg-teal-500/10"
          trend={{ value: 'All online', direction: 'neutral' }}
        />
      </div>

      {/* Map + System Status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Live Fleet Overview</h3>
            <button
              onClick={() => navigate('/map')}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 transition hover:text-accent-300"
            >
              Open full map <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          <MapComponent
            buses={buses}
            events={recentEvents}
            defects={defects}
            congestion={congestion}
            incidents={activeIncidents}
            height="400px"
          />
        </div>

        {/* System Health */}
        <div className="space-y-4">
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-semibold text-slate-200">AI Processing Status</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Edge Inference', value: 'Active', detail: '44 cameras', color: 'text-emerald-400', pct: 100 },
                { label: 'Model: YOLOv8-Seg', value: 'v2.1.0', detail: '98.2% mAP', color: 'text-accent-400', pct: 98 },
                { label: 'OCR Pipeline', value: 'Active', detail: '91.5% acc', color: 'text-emerald-400', pct: 92 },
                { label: 'WebSocket Stream', value: 'Connected', detail: '11/11 buses', color: 'text-emerald-400', pct: 100 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`font-medium ${item.color}`}>{item.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-ink-700 overflow-hidden">
                    <div className="h-full rounded-full bg-accent-400/60" style={{ width: `${item.pct}%` }} />
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-850 p-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-200">Quick Actions</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'View Map', path: '/map', icon: Activity },
                { label: 'Incidents', path: '/incidents', icon: Siren },
                { label: 'Defects', path: '/defects', icon: CircleAlert },
                { label: 'Analytics', path: '/analytics', icon: Radar },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2.5 text-xs font-medium text-slate-300 transition hover:border-ink-600 hover:bg-ink-800 hover:text-slate-100"
                >
                  <action.icon className="h-4 w-4 text-slate-500" />
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent AI Detections */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent-400" />
            <h3 className="text-sm font-semibold text-slate-200">Recent AI Detections</h3>
            <span className="rounded-md bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold text-accent-300">LIVE FEED</span>
          </div>
          <button
            onClick={() => navigate('/analytics')}
            className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 transition hover:text-accent-300"
          >
            View all <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        {recentEvents.length === 0 ? (
          <EmptyState title="No detections yet" message="AI detection events will appear here as buses report them." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
