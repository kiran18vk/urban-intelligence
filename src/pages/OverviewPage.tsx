import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bus as BusIcon, 
  Radar, 
  CircleAlert, 
  TrafficCone, 
  Siren, 
  Activity, 
  ArrowRight, 
  Cpu, 
  Camera, 
  Zap,
  Sparkles,
  IndianRupee,
  Layers,
  GitMerge,
  UserCheck,
  Send,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  Compass
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { EventCard } from '@/components/ui/EventCard';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { MapComponent } from '@/components/Map/MapComponent';
import { apiService } from '@/services/api';
import { overviewStats as mockStats } from '@/data/mockData';
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
      setError(e instanceof Error ? e.message : 'Unable to load live platform data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <LoadingSpinner size="lg" />;
  if (error || !stats) return <ErrorState message={error ?? 'Unable to load live platform data'} onRetry={loadData} />;

  const activeIncidents = incidents.filter((i) => i.status !== 'resolved');

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Executive Platform Mission & Architecture Flow Banner */}
      <div className="rounded-2xl border border-accent-500/30 bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-accent-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-ink-750">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-500/20 text-accent-300 border border-accent-500/40">
                Smart India Hackathon 2026
              </span>
              <span className="text-xs text-slate-400">• Mobile Edge AI Urban Intelligence</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              PMPML Mobile Transit Edge Intelligence Platform
            </h1>
            <p className="mt-1 text-xs text-slate-300 max-w-3xl leading-relaxed">
              Transforming city bus fleets into distributed mobile edge perception nodes for real-time road safety, traffic monitoring, defect lifecycle tracking, verified authority dispatch, and predictive risk forecasting.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/live-monitor')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-500 hover:bg-accent-400 text-ink-950 font-semibold text-xs transition shadow-lg shadow-accent-500/20 cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              Live Monitor
            </button>
            <button
              onClick={() => navigate('/authority-actions')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-ink-700 bg-ink-800 hover:bg-ink-750 text-slate-200 text-xs font-semibold transition cursor-pointer"
            >
              <Send className="h-4 w-4 text-cyan-400" />
              Action Center
            </button>
          </div>
        </div>

        {/* 9-Stage End-to-End Operational Pipeline */}
        <div className="pt-4">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Closed-Loop Operational Architecture</span>
            <span className="text-[10px] text-accent-400 font-mono">End-to-End Traceable</span>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
            {[
              { num: '1', name: 'Bus Camera', icon: Camera, path: '/live-monitor' },
              { num: '2', name: 'Edge AI', icon: Cpu, path: '/live-monitor' },
              { num: '3', name: 'Reliability', icon: ShieldCheck, path: '/event-correlation' },
              { num: '4', name: 'Correlation', icon: GitMerge, path: '/event-correlation' },
              { num: '5', name: 'Human Review', icon: UserCheck, path: '/review-center' },
              { num: '6', name: 'Authority Action', icon: Send, path: '/authority-actions' },
              { num: '7', name: 'Re-Observation', icon: RefreshCw, path: '/reobservation' },
              { num: '8', name: 'Verification', icon: ShieldCheck, path: '/reobservation' },
              { num: '9', name: 'Predictive Intel', icon: TrendingUp, path: '/predictive' },
            ].map((step, idx) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  onClick={() => navigate(step.path)}
                  className="flex flex-col items-center p-2 rounded-xl border border-ink-750 bg-ink-850/60 hover:bg-ink-800 hover:border-accent-500/40 transition cursor-pointer group text-center"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-ink-750 text-slate-300 group-hover:bg-accent-500/20 group-hover:text-accent-300 transition mb-1 text-xs">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">STEP {step.num}</span>
                  <span className="text-[10px] font-semibold text-slate-200 group-hover:text-accent-300 transition line-clamp-1">
                    {step.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Disclosure Notice */}
        <div className="mt-4 pt-3 border-t border-ink-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            <strong className="text-slate-300">System Disclosure:</strong> Prototype urban intelligence platform using deterministic testbed data and simulated GPS where indicated. AI outputs provide decision support and require human validation.
          </span>
          <span className="hidden sm:inline text-slate-500 font-mono">Pune Municipal Corporation Jurisdiction</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-6">
        <StatCard
          label="Fleet Buses (Network)"
          subtitle="Active / Total Registered"
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
          subtitle="AI Edge Vision Detections"
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
          subtitle="Active Surface Defects"
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
          subtitle="Monitored Corridor Zones"
          value={stats.trafficCongestion}
          icon={TrafficCone}
          iconColor="text-orange-400"
          iconBg="bg-orange-500/10"
          trend={{ value: '5%', direction: 'down' }}
          sparkline={[18, 16, 20, 15, 14, 16, 14]}
          onClick={() => navigate('/traffic')}
        />
        <StatCard
          label="Active Incidents (Fleet Log)"
          subtitle="30-Day Cumulative Log"
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
          subtitle="Edge Video Streams"
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
            <h3 className="text-sm font-semibold text-slate-200">Transit Corridor Map & Spatial Defects</h3>
            <button
              onClick={() => navigate('/map')}
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 transition hover:text-accent-300 cursor-pointer"
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
              <h3 className="text-sm font-semibold text-slate-200">Edge Processing & AI Models</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Edge Inference', value: 'Active', detail: '44 cameras', color: 'text-emerald-400', pct: 100 },
                { label: 'Road Damage AI', value: 'Active', detail: 'YOLOv8-Seg / 98.2% mAP', color: 'text-accent-400', pct: 98 },
                { label: 'OCR / ANPR Pipeline', value: 'Active', detail: 'LPRNet / 91.5% acc', color: 'text-emerald-400', pct: 92 },
                { label: 'Store-and-Forward Sync', value: 'Connected', detail: '11/11 buses synced', color: 'text-emerald-400', pct: 100 },
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
              <h3 className="text-sm font-semibold text-slate-200">Key Feature Portals</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { label: 'Live Monitor', path: '/live-monitor', icon: Camera },
                { label: 'Event Correlation', path: '/event-correlation', icon: Layers },
                { label: 'Review Center', path: '/review-center', icon: UserCheck },
                { label: 'Action Center', path: '/authority-actions', icon: Send },
                { label: 'Re-Observation', path: '/reobservation', icon: RefreshCw },
                { label: 'Predictive Intel', path: '/predictive', icon: TrendingUp },
              ].map((action) => (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex items-center gap-2 rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-xs font-medium text-slate-300 transition hover:border-accent-500/40 hover:bg-ink-800 hover:text-white cursor-pointer"
                >
                  <action.icon className="h-3.5 w-3.5 text-accent-400" />
                  <span className="truncate">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Urban Intelligence Upgrades: Compact Decision Support Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. Maintenance Priority Engine */}
        <div
          onClick={() => navigate('/defects')}
          className="cursor-pointer rounded-xl border border-accent-500/30 bg-accent-500/5 p-4 hover:bg-accent-500/10 transition space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-300 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
              Maintenance Priority
            </span>
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[9px] font-bold text-rose-300 border border-rose-500/30">
              {defects.filter((d) => d.severity === 'critical' || d.severity === 'high').length} CRITICAL
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-mono text-2xl font-bold text-slate-100">
              64.2<span className="text-xs font-normal text-slate-500"> / 100 avg</span>
            </span>
            <span className="text-[11px] text-accent-400 font-semibold flex items-center gap-0.5">
              Explore Queue <ArrowRight className="h-3 w-3" />
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 leading-tight">
            Prioritized by severity (35%), defect density (20%), traffic (25%), & recurrence (20%).
          </p>
        </div>

        {/* 2. Road Quality Deterioration Index */}
        <div
          onClick={() => navigate('/digital-twin')}
          className="cursor-pointer rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 hover:bg-amber-500/10 transition space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-amber-400" />
              Deterioration Index
            </span>
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-300 border border-amber-500/30">
              0–10 SCALE
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-mono text-2xl font-bold text-amber-300">
              4.8<span className="text-xs font-normal text-slate-500"> / 10 index</span>
            </span>
            <span className="text-[10.5px] text-amber-300 font-semibold">
              Slowly Deteriorating
            </span>
          </div>
          <p className="text-[10.5px] text-slate-400 leading-tight">
            Corridor surface degradation trend derived from historical transit observations.
          </p>
        </div>

        {/* 3. 6-Stage Defect Lifecycle */}
        <div
          onClick={() => navigate('/defects')}
          className="cursor-pointer rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 hover:bg-purple-500/10 transition space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-purple-400" />
              Lifecycle Stages
            </span>
            <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[9px] font-bold text-purple-300 border border-purple-500/30">
              6 STAGES
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 text-[10px] font-mono">
            <span className="text-sky-300">DETECTED</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="text-amber-300">VERIFIED</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="text-purple-300">ACTION</span>
            <span className="text-slate-600">&rarr;</span>
            <span className="text-emerald-300">RESOLVED</span>
          </div>
          <p className="text-[10.5px] text-slate-400 leading-tight">
            {defects.length} defects tracked through end-to-end municipal inspection lifecycle.
          </p>
        </div>

        {/* 4. Estimated Repair Cost */}
        <div
          onClick={() => navigate('/defects')}
          className="cursor-pointer rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 hover:bg-emerald-500/10 transition space-y-2 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
              Est. Maintenance Cost
            </span>
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[8.5px] font-mono text-emerald-300 border border-emerald-500/30">
              Planning Support
            </span>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="font-mono text-2xl font-bold text-emerald-300">
              ₹{(defects.reduce((acc, d) => acc + (d.repairCost || 12000), 0) / 100000).toFixed(1)}L
            </span>
            <span className="text-[10px] text-slate-400">
              Range: ±20%
            </span>
          </div>
          <p className="text-[10px] text-emerald-400/80 italic leading-tight">
            * Prototype estimate — planning support only
          </p>
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
            className="inline-flex items-center gap-1 text-xs font-medium text-accent-400 transition hover:text-accent-300 cursor-pointer"
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
