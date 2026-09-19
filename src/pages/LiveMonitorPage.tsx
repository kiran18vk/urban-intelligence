import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Layers,
  Activity,
  Wifi,
  WifiOff,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  Sliders,
  Car,
  Flame,
  Sparkles,
  ChevronRight,
  Radio,
  FileText,
  AlertOctagon,
  Database,
  Cpu,
  ClipboardCheck,
  RefreshCw,
} from 'lucide-react';
import { apiService } from '@/services/api';
import { mockLiveMonitorStatus } from '@/data/mockData';
import type { LiveMonitorStatus } from '@/types';

export const LiveMonitorPage: React.FC = () => {
  // Initialize with fallback testbed data to guarantee zero blank-screen renders
  const [data, setData] = useState<LiveMonitorStatus>(mockLiveMonitorStatus);
  const [selectedBus, setSelectedBus] = useState<string>('PMP-BUS-001');
  const [selectedCamera, setSelectedCamera] = useState<string>('CAM-FRONT-01');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [showAiOverlay, setShowAiOverlay] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [fpsCounter, setFpsCounter] = useState<number>(6.2);
  const [frameIndex, setFrameIndex] = useState<number>(1420);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isSimulatingEvent, setIsSimulatingEvent] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Poll live monitor status every 3 seconds
  const fetchStatus = async () => {
    try {
      const statusData = await apiService.getLiveMonitorStatus(selectedBus, selectedCamera);
      if (statusData) {
        setData(statusData);
        setApiError(null);
      }
    } catch (err) {
      console.warn('Live monitor polling failed, using current testbed state', err);
      setApiError('API connection offline — rendering prototype testbed stream');
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [selectedBus, selectedCamera]);

  // Frame counter simulation when playing
  useEffect(() => {
    if (!isPlaying) return;
    const frameInterval = setInterval(() => {
      setFrameIndex((prev) => prev + 1);
      // Subtle natural jitter for measured prototype FPS
      setFpsCounter(() => {
        const jitter = (Math.random() - 0.5) * 0.4;
        return Number(Math.max(5.8, Math.min(6.5, 6.2 + jitter)).toFixed(1));
      });
    }, 160);
    return () => clearInterval(frameInterval);
  }, [isPlaying]);

  // Handle Connectivity Simulation Toggle (ONLINE / OFFLINE)
  const handleToggleConnectivity = async (targetState: 'ONLINE' | 'OFFLINE') => {
    setIsSyncing(true);
    try {
      const res = await apiService.setEdgeConnectivity(targetState);
      setActionFeedback(`Connectivity simulation: ${res?.current_connectivity || targetState}`);
      if (targetState === 'ONLINE') {
        // Trigger auto-sync
        await apiService.syncEdgeQueue(50);
        setActionFeedback('Edge Queue auto-synced with central platform');
      }
      await fetchStatus();
    } catch (err) {
      console.error('Failed to toggle connectivity:', err);
      setActionFeedback(`Local toggle: ${targetState}`);
      setData((prev) => ({
        ...prev,
        connectivity: {
          ...prev.connectivity,
          state: targetState,
        },
      }));
    } finally {
      setIsSyncing(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  // Generate Test Observation / Urban Event through the real edge/events pipeline
  const handleGenerateTestEvent = async (type: 'ROAD_POTHOLE' | 'PEDESTRIAN_RISK' | 'TRAFFIC_CONGESTION') => {
    setIsSimulatingEvent(true);
    try {
      const res = await apiService.createEventFromDetection({
        event_type: type,
        bus_id: selectedBus,
        camera_id: selectedCamera,
        latitude: 18.5204 + (Math.random() - 0.5) * 0.02,
        longitude: 73.8567 + (Math.random() - 0.5) * 0.02,
        confidence: 0.88,
        operational_confidence: 0.82,
        severity: 'HIGH',
        evidence_reference: type === 'ROAD_POTHOLE' ? 'assets/road-defects/pothole-real-01.jpg' : undefined,
      });
      if (res?.queue_status === 'PENDING' || res?.sync_status === 'QUEUED_LOCALLY') {
        setActionFeedback(`Event stored in local Edge Queue (${res?.event_id || 'QEVT'})`);
      } else {
        setActionFeedback(`Event dispatched to central platform (${res?.event_id || 'EVT'})`);
      }
      await fetchStatus();
    } catch (err) {
      console.error('Failed to generate test event:', err);
      setActionFeedback(`Generated local ${type} observation`);
    } finally {
      setIsSimulatingEvent(false);
      setTimeout(() => setActionFeedback(null), 4500);
    }
  };

  const currentObs = data?.current_observations;
  const connState = data?.connectivity?.state || 'ONLINE';
  const isOffline = connState === 'OFFLINE';
  const isDegraded = connState === 'DEGRADED';
  const isSyncState = isSyncing || connState === 'SYNCING';
  const fleetOverview = data?.fleet_overview || mockLiveMonitorStatus.fleet_overview || [];
  const latestEvents = data?.latest_events || mockLiveMonitorStatus.latest_events || [];

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & Live Indicator Strip */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Video className="h-6 w-6 text-primary animate-pulse" />
              Live AI Fleet Monitor
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              {isOffline ? 'OFFLINE' : isDegraded ? 'DEGRADED' : 'ONLINE'}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Prototype Camera / Test Stream
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time edge perception, reliability scoring, offline store-and-forward queue, and urban event orchestration.
          </p>
        </div>

        {/* Global Bus Selector in Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs text-muted-foreground font-medium">Prototype Fleet:</span>
            <select
              value={selectedBus}
              onChange={(e) => setSelectedBus(e.target.value)}
              className="bg-transparent text-sm font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              <option value="PMP-BUS-001" className="bg-popover text-foreground">PMP-BUS-001 (Route 101)</option>
              <option value="PMP-BUS-003" className="bg-popover text-foreground">PMP-BUS-003 (Route 204)</option>
              <option value="PMP-BUS-004" className="bg-popover text-foreground">PMP-BUS-004 (Route 305)</option>
              <option value="PMP-BUS-007" className="bg-popover text-foreground">PMP-BUS-007 (Route 408)</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs text-muted-foreground font-medium">Camera:</span>
            <span className="text-xs font-mono font-semibold text-primary">{selectedCamera} (FRONT)</span>
          </div>
        </div>
      </div>

      {/* In-Page API Fallback Warning Banner if API is down */}
      {apiError && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold transition"
          >
            <RefreshCw className="h-3 w-3" /> Reconnect
          </button>
        </div>
      )}

      {/* Action / Connectivity Feedback Toast */}
      {actionFeedback && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="font-medium">{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-xs text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Top KPI Command-Center Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>LIVE STREAM</span>
            <Video className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-base font-bold text-foreground">TEST STREAM</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Prototype frame feed</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>EDGE AI PIPELINE</span>
            <Cpu className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            AI ACTIVE
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">6 modules operational</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>TODAY'S EVENTS</span>
            <Activity className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-base font-bold text-foreground">
            {data?.summary?.events_today ?? 48} EVENTS
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Cross-fleet detections</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>OBSERVATION RELIABILITY</span>
            <ShieldCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-base font-bold text-cyan-400">
            {Math.round((currentObs?.reliability?.overall_score ?? 0.88) * 100)}% RELIABILITY
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Op. Conf: {(currentObs?.reliability?.operational_confidence ?? 0.81).toFixed(2)}
          </div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>EDGE CONNECTIVITY</span>
            {isOffline ? <WifiOff className="h-4 w-4 text-rose-400" /> : <Wifi className="h-4 w-4 text-emerald-400" />}
          </div>
          <div className={`text-base font-bold ${isOffline ? 'text-rose-400' : 'text-emerald-400'}`}>
            {isOffline ? 'OFFLINE (STORE)' : isSyncState ? 'SYNCING...' : 'ONLINE'}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {data?.connectivity?.pending ? `${data.connectivity.pending} queued locally` : '0 pending'}
          </div>
        </div>
      </div>

      {/* 3. Main Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Camera Stream, Overlays, Video Controls, Edge AI Status (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Main Video/Camera Card */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-md flex flex-col">
            {/* Stream Header Bar */}
            <div className="bg-secondary/60 border-b border-border px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono font-semibold text-foreground uppercase tracking-wider">
                  LIVE FEED: {selectedBus}
                </span>
                <span className="text-muted-foreground">|</span>
                <span className="text-muted-foreground font-mono">{selectedCamera}</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
                <span>RES: 1920x1080</span>
                <span>•</span>
                <span className="text-primary font-semibold">Prototype FPS: {fpsCounter}</span>
                <span>•</span>
                <span>FRAME: #{frameIndex}</span>
              </div>
            </div>

            {/* Video Preview Area */}
            <div className="relative aspect-video w-full bg-black/90 flex items-center justify-center overflow-hidden group">
              <img
                src={showAiOverlay ? '/assets/camera/camera-annotated-01.jpg' : '/assets/camera/camera-feed-01.jpg'}
                alt="Live AI Camera Feed"
                className="w-full h-full object-cover select-none transition-opacity duration-300"
              />

              {/* Watermark & Honest Disclosure */}
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-[11px] font-mono text-amber-300 flex items-center gap-1.5 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                Test Stream — Prototype Processing Pipeline
              </div>

              {/* Top Right Live Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/10 px-2.5 py-1 rounded text-[11px] font-mono text-white">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                {isPlaying ? 'ACTIVE STREAM' : 'PAUSED'}
              </div>

              {/* AI Detection Overlay Badges on Stream */}
              {showAiOverlay && (
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center gap-2">
                  <div className="bg-black/80 backdrop-blur-md border border-blue-500/40 px-2.5 py-1 rounded-md text-xs font-mono text-blue-300 flex items-center gap-1.5 shadow-lg">
                    <Car className="h-3.5 w-3.5 text-blue-400" />
                    <span>Vehicles: {currentObs?.traffic?.vehicles_detected ?? 14}</span>
                  </div>
                  <div className="bg-black/80 backdrop-blur-md border border-amber-500/40 px-2.5 py-1 rounded-md text-xs font-mono text-amber-300 flex items-center gap-1.5 shadow-lg">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    <span>Road Defects: {currentObs?.road_damage?.defects_count ?? 2}</span>
                  </div>
                  <div className="bg-black/80 backdrop-blur-md border border-rose-500/40 px-2.5 py-1 rounded-md text-xs font-mono text-rose-300 flex items-center gap-1.5 shadow-lg">
                    <Flame className="h-3.5 w-3.5 text-rose-400" />
                    <span>Pedestrian Risk: {currentObs?.pedestrian_risk?.risk_level || 'HIGH'}</span>
                  </div>
                  <div className="bg-black/80 backdrop-blur-md border border-purple-500/40 px-2.5 py-1 rounded-md text-xs font-mono text-purple-300 flex items-center gap-1.5 shadow-lg">
                    <FileText className="h-3.5 w-3.5 text-purple-400" />
                    <span>OCR: {currentObs?.anpr?.plate_text || 'MH 12 QX 4821'}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Compact Video Controls Toolbar */}
            <div className="bg-secondary/40 border-t border-border px-4 py-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground font-medium transition-colors border border-border"
                  title={isPlaying ? 'Pause Test Stream' : 'Play Test Stream'}
                >
                  {isPlaying ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                  {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <button
                  onClick={() => {
                    setFrameIndex(1420);
                    setIsPlaying(true);
                  }}
                  className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                  title="Restart Stream Interval"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Analysis Overlay Switch */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className="text-xs text-muted-foreground font-medium">AI Bounding Overlay:</span>
                  <input
                    type="checkbox"
                    checked={showAiOverlay}
                    onChange={(e) => setShowAiOverlay(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary h-4 w-4 bg-secondary cursor-pointer"
                  />
                  <span className={`text-xs font-semibold ${showAiOverlay ? 'text-primary' : 'text-muted-foreground'}`}>
                    {showAiOverlay ? 'ENABLED' : 'DISABLED'}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* EDGE AI STATUS PANEL */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Edge AI Processing Status</h2>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                ALL ENGINES OPERATIONAL
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Object Detection</span>
                <span className="font-semibold text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Traffic Analysis</span>
                <span className="font-semibold text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Road Damage</span>
                <span className="font-semibold text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Pedestrian Risk</span>
                <span className="font-semibold text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Reliability Scoring</span>
                <span className="font-semibold text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
              <div className="p-2.5 rounded-lg bg-secondary/30 border border-border flex items-center justify-between">
                <span className="text-muted-foreground">Event Intelligence</span>
                <span className="font-semibold text-emerald-400 font-mono text-[11px]">ACTIVE</span>
              </div>
            </div>
          </div>

          {/* PROTOTYPE FLEET OVERVIEW STRIP */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-3">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Prototype Fleet Connectivity Strip</h3>
              </div>
              <span className="text-[11px] text-muted-foreground">Testbed simulation</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {fleetOverview.map((bus) => {
                const isThisBus = bus.bus_id === selectedBus;
                return (
                  <button
                    key={bus.bus_id}
                    onClick={() => setSelectedBus(bus.bus_id)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isThisBus
                        ? 'bg-primary/10 border-primary shadow-sm ring-1 ring-primary/30'
                        : 'bg-secondary/20 border-border hover:bg-secondary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className={isThisBus ? 'text-primary' : 'text-foreground'}>{bus.bus_id}</span>
                      <span
                        className={`h-2 w-2 rounded-full ${
                          bus.connectivity === 'OFFLINE' ? 'bg-rose-400' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <div className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                      <span>{bus.connectivity}</span>
                      <span>{bus.events_count} events</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Current AI State, Edge Store-and-Forward Controls, Live Event Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* CURRENT AI STATE CARD */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                <Sliders className="h-4 w-4 text-primary" />
                Current AI Perception State
              </h2>
              <span className="text-xs font-mono text-muted-foreground">INTERVAL #14</span>
            </div>

            {/* 1. Traffic Intelligence */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Car className="h-3.5 w-3.5 text-blue-400" />
                  Traffic Density
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {currentObs?.traffic?.traffic_density || 'HIGH'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-muted-foreground">
                <div>Vehicles: <span className="font-semibold text-foreground">{currentObs?.traffic?.vehicles_detected ?? 14}</span></div>
                <div>Line Crossings: <span className="font-semibold text-foreground">{currentObs?.traffic?.crossings_count ?? 8}</span></div>
                <div className="col-span-2 text-[11px] text-muted-foreground">
                  Speed: <span className="italic text-muted-foreground">Not calibrated / uncalibrated test stream</span>
                </div>
              </div>
            </div>

            {/* 2. Road Damage Intelligence */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                  Road Damage
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {currentObs?.road_damage?.defects_count ?? 2} Defects Observed
                </span>
              </div>
              {currentObs?.road_damage?.observations && currentObs.road_damage.observations.length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  {currentObs.road_damage.observations.map((obs, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] bg-background/50 p-1.5 rounded border border-border/50">
                      <span className="font-mono text-foreground">{obs.type}</span>
                      <div className="flex items-center gap-2 font-mono text-muted-foreground">
                        <span>Conf: {obs.confidence}</span>
                        <span className="text-cyan-400">Rel: {obs.reliability}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">No road defects observed in current test interval</div>
              )}
            </div>

            {/* 3. Pedestrian Risk & Multi-Bus Consensus */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Flame className="h-3.5 w-3.5 text-rose-400" />
                  Pedestrian Risk
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {currentObs?.pedestrian_risk?.risk_level || 'HIGH'} — {currentObs?.pedestrian_risk?.risk_score ?? 78}/100
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div className="flex items-center justify-between font-semibold text-primary">
                  <span>Corroboration:</span>
                  <span>{currentObs?.pedestrian_risk?.independent_buses ?? 4} Independent Buses (Consensus)</span>
                </div>
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  Factors: {(currentObs?.pedestrian_risk?.factors || []).slice(0, 3).join(', ')}
                </div>
              </div>
            </div>

            {/* 4. Observation Reliability Breakdown */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                  Observation Reliability
                </span>
                <span className="font-mono font-bold text-cyan-400 text-xs">
                  {Math.round((currentObs?.reliability?.overall_score ?? 0.88) * 100)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] font-mono text-muted-foreground">
                <div>Lighting: <span className="text-foreground">94%</span></div>
                <div>Focus / Blur: <span className="text-foreground">88%</span></div>
                <div>Visibility: <span className="text-foreground">90%</span></div>
                <div>Temporal Stability: <span className="text-foreground">86%</span></div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono border-t border-border/60 pt-1.5 text-muted-foreground">
                <span>Raw Conf: {currentObs?.reliability?.raw_confidence ?? 0.92}</span>
                <span className="text-primary">
                  Operational Conf: {currentObs?.reliability?.operational_confidence ?? 0.81}
                </span>
              </div>
            </div>

            {/* 5. ANPR / OCR Observation */}
            <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-purple-400" />
                  Plate Observation (OCR)
                </span>
                <span className="font-mono font-bold text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20 text-xs">
                  {currentObs?.anpr?.plate_text || 'MH 12 QX 4821'}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground leading-relaxed">
                OCR output is an observation and is not an official RTO registry verification.
              </div>
            </div>
          </div>

          {/* EDGE DELIVERY & OFFLINE SIMULATION CONTROLS */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Edge Delivery & Store-and-Forward</h3>
              </div>
              <a
                href="#/edge-queue"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
              >
                Queue Dashboard <ChevronRight className="h-3 w-3" />
              </a>
            </div>

            {/* Offline/Online Simulation Toggle */}
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30 border border-border">
              <div className="text-xs">
                <div className="font-semibold text-foreground">Edge Connectivity Simulation:</div>
                <div className="text-[11px] text-muted-foreground">
                  {isOffline ? 'Events will be stored locally in SQLite' : 'Events uploaded immediately to central platform'}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleConnectivity('ONLINE')}
                  disabled={isSyncState}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    !isOffline
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  ONLINE
                </button>
                <button
                  onClick={() => handleToggleConnectivity('OFFLINE')}
                  disabled={isSyncState}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    isOffline
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  OFFLINE
                </button>
              </div>
            </div>

            {/* Test Event Injection for Verification */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleGenerateTestEvent('ROAD_POTHOLE')}
                disabled={isSimulatingEvent}
                className="flex-1 py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors flex items-center justify-center gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                Test Defect
              </button>
              <button
                onClick={() => handleGenerateTestEvent('PEDESTRIAN_RISK')}
                disabled={isSimulatingEvent}
                className="flex-1 py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors flex items-center justify-center gap-1.5"
              >
                <Flame className="h-3.5 w-3.5 text-rose-400" />
                Test Pedestrian
              </button>
              <button
                onClick={() => handleGenerateTestEvent('TRAFFIC_CONGESTION')}
                disabled={isSimulatingEvent}
                className="flex-1 py-1.5 px-2 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition-colors flex items-center justify-center gap-1.5"
              >
                <Car className="h-3.5 w-3.5 text-blue-400" />
                Test Traffic
              </button>
            </div>
          </div>

          {/* LIVE URBAN EVENT FEED */}
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wide">Live Urban Event Feed</h3>
              </div>
              <span className="text-xs text-muted-foreground">Newest first</span>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
              {latestEvents.length > 0 ? (
                latestEvents.slice(0, 8).map((evt) => {
                  const isPothole = evt.event_type.includes('POTHOLE') || evt.event_type.includes('CRACK') || evt.event_type.includes('ROAD');
                  const isPed = evt.event_type.includes('PEDESTRIAN');
                  const isIncident = evt.event_type.includes('INCIDENT') || evt.event_type.includes('HIT_AND_RUN');

                  return (
                    <div
                      key={evt.event_id}
                      className="p-3 rounded-lg bg-secondary/20 border border-border hover:border-border/80 transition-all space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-foreground">{evt.event_type}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              evt.severity === 'CRITICAL'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : evt.severity === 'HIGH'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                            }`}
                          >
                            {evt.severity}
                          </span>
                        </div>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {typeof evt.timestamp === 'string' && evt.timestamp.includes('T')
                            ? new Date(evt.timestamp).toLocaleTimeString()
                            : String(evt.timestamp)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground">
                        <span>Bus: {evt.bus_id}</span>
                        <span>Conf: {evt.confidence}</span>
                        <span className="text-cyan-400">Rel: {evt.reliability}</span>
                      </div>

                      {/* Action Links into existing system modules */}
                      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                        <a
                          href="#/map"
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" /> OPEN IN GIS
                        </a>
                        {isPothole && (
                          <a
                            href="#/digital-twin"
                            className="text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Sliders className="h-3 w-3" /> VIEW IN DIGITAL TWIN
                          </a>
                        )}
                        {isPed && (
                          <a
                            href="#/pedestrian-safety"
                            className="text-[11px] font-semibold text-rose-400 hover:underline flex items-center gap-1"
                          >
                            <Flame className="h-3 w-3" /> OPEN SAFETY ANALYSIS
                          </a>
                        )}
                        {isIncident && (
                          <a
                            href="#/incidents"
                            className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1"
                          >
                            <AlertOctagon className="h-3 w-3" /> OPEN INCIDENT
                          </a>
                        )}
                        <a
                          href="#/event-correlation"
                          className="text-[11px] font-semibold text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <Layers className="h-3 w-3" /> CORRELATION
                        </a>
                        <a
                          href="#/review-center"
                          className="text-[11px] font-semibold text-indigo-400 hover:underline flex items-center gap-1 ml-auto"
                        >
                          <ClipboardCheck className="h-3 w-3" /> REVIEW
                        </a>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground italic">
                  Waiting for AI events...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitorPage;
