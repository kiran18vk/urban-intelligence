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
  ShieldAlert,
  MapPin,
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
      {/* Executive Command Center Header */}
      <div className="rounded-2xl border border-accent-500/30 bg-gradient-to-r from-ink-900 via-ink-850 to-ink-900 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -bottom-12 w-64 h-64 rounded-full bg-accent-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-ink-750">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-accent-500/20 text-accent-300 border border-accent-500/40">
                Smart India Hackathon 2026
              </span>
              <span className="text-xs text-slate-400">• Distributed Edge AI Perception Network</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Urban Intelligence Command Center
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              AI-powered mobile sensing from public transport fleets — transforming city buses into real-time perception nodes for road safety, defect tracking, incident response, and predictive urban forecasting.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => navigate('/live-monitor')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-500 hover:bg-accent-400 text-ink-950 font-bold text-xs transition shadow-lg shadow-accent-500/20 cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              Live Monitor
            </button>
            <button
              onClick={() => navigate('/authority-actions')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-ink-700 bg-ink-800 hover:bg-ink-750 text-slate-200 text-xs font-semibold transition cursor-pointer"
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
            ].map((step) => {
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

      {/* 4 Primary Summary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Sensing Fleet"
          subtitle="8 in transit / 11 registered (44 cameras)"
          value={stats.activeBuses}
          total={stats.totalBuses}
          icon={BusIcon}
          iconColor="text-emerald-400"
          iconBg="bg-emerald-500/10"
          trend={{ value: 'Fleet Online', direction: 'up' }}
          sparkline={[6, 7, 8, 9, 10, 8, 11]}
          onClick={() => navigate('/map')}
        />
        <StatCard
          label="Events Detected Today"
          subtitle="Edge AI Vision multi-task detections"
          value={stats.eventsDetected}
          icon={Radar}
          iconColor="text-accent-400"
          iconBg="bg-accent-500/10"
          trend={{ value: '12%', direction: 'up' }}
          sparkline={[15, 22, 18, 25, 30, 28, 40]}
          onClick={() => navigate('/analytics')}
        />
        <StatCard
          label="Active Road Defects"
          subtitle="7 critical/high priority in lifecycle"
          value={stats.roadDefects}
          icon={CircleAlert}
          iconColor="text-amber-400"
          iconBg="bg-amber-500/10"
          trend={{ value: '3 new', direction: 'up' }}
          sparkline={[12, 14, 16, 18, 20, 22, 24]}
          onClick={() => navigate('/defects')}
        />
        <StatCard
          label="Active Incident Queue"
          subtitle="30-day cumulative fleet incident log"
          value={stats.activeIncidents}
          total={stats.totalIncidents}
          icon={Siren}
          iconColor="text-rose-400"
          iconBg="bg-rose-500/10"
          trend={{ value: '1 new', direction: 'up' }}
          sparkline={[3, 5, 4, 6, 7, 8, 8]}
          onClick={() => navigate('/incidents')}
        />
      </div>

      {/* WHAT NEEDS ATTENTION NOW — Story-First Priority Section */}
      <div className="rounded-2xl border border-ink-700 bg-ink-850 p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink-750 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <h2 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                What Needs Attention Now
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                4 PRIORITY ALERTS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-confidence multi-bus correlated issues requiring operational review, authority dispatch, or field inspection.
            </p>
          </div>
          <span className="text-[11px] font-mono text-accent-400">
            Automated Cross-Corroboration Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Priority 1 */}
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex flex-col justify-between hover:border-rose-500/50 hover:bg-rose-500/10 transition group">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ROAD DEFECT · CRITICAL
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">91% REL</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-rose-200 transition">
                Severe Pothole Cluster
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                Karve Road (Near Decathlon)
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Corroborated by <strong className="text-slate-200">4 independent buses</strong> over 7 passes. Severe surface breakdown risk.
              </p>
            </div>
            <button
              onClick={() => navigate('/defects')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              View Defect <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Priority 2 */}
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 flex flex-col justify-between hover:border-purple-500/50 hover:bg-purple-500/10 transition group">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  INCIDENT · CRITICAL
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">88% CONF</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-purple-200 transition">
                Potential Hit-and-Run Track
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                FC Road &amp; Ferguson Junction
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                OCR license match <span className="font-mono text-slate-200 font-bold">MH 12 QX 4821</span> with abrupt vehicle deviation.
              </p>
            </div>
            <button
              onClick={() => navigate('/incidents')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              Inspect Incident <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Priority 3 */}
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex flex-col justify-between hover:border-amber-500/50 hover:bg-amber-500/10 transition group">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  TRAFFIC · HIGH SURGE
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">+15m DELAY</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-200 transition">
                Commute Congestion Bottleneck
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                JM Road Commercial Arterial
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                Peak bottleneck density with <strong className="text-slate-200">14 active queued vehicles</strong> across 3 bus streams.
              </p>
            </div>
            <button
              onClick={() => navigate('/traffic')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-ink-950 font-bold text-xs transition shadow-sm cursor-pointer"
            >
              Open Traffic <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {/* Priority 4 */}
          <div className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4 flex flex-col justify-between hover:border-sky-500/50 hover:bg-sky-500/10 transition group">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                  SAFETY · 78/100 RISK
                </span>
                <span className="text-[11px] font-mono font-semibold text-slate-400">4 BUSES</span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 group-hover:text-sky-200 transition">
                Pedestrian Conflict Hotspot
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-1 font-medium">
                <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                Swargate Bus Station Crossing
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                18 proximity events recorded. Multi-bus consensus confirms high risk exposure.
              </p>
            </div>
            <button
              onClick={() => navigate('/pedestrian-safety')}
              className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
            >
              Review Hotspot <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Map + System Status */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Transit Corridor Map &amp; Spatial Detections</h3>
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
              <h3 className="text-sm font-semibold text-slate-200">Edge Processing &amp; AI Models</h3>
            </div>
            <div className="mt-4 space-y-3">
              {[
                { label: 'Edge Inference', value: 'Active', detail: '44 cameras on 11 buses', color: 'text-emerald-400', pct: 100 },
                { label: 'Road Damage AI', value: 'Active', detail: 'YOLOv8 Damage Classifier', color: 'text-accent-400', pct: 98 },
                { label: 'OCR / ANPR Pipeline', value: 'Active', detail: 'Synthesized OCR Validator', color: 'text-emerald-400', pct: 92 },
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
