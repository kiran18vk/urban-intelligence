import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HardDrive,
  Radio,
  Send,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type { QueuedEvent, QueueStatusSummary, EdgeConnectivityState } from '@/types';

export const EdgeQueuePage: React.FC = () => {
  const [summary, setSummary] = useState<QueueStatusSummary | null>(null);
  const [events, setEvents] = useState<QueuedEvent[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load status and events
  const loadData = async () => {
    try {
      const [statusData, eventsData] = await Promise.all([
        apiService.getEdgeQueueStatus(),
        apiService.getEdgeQueueEvents(),
      ]);
      setSummary(statusData);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load edge queue data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle connectivity toggle
  const handleSetConnectivity = async (state: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'AUTO') => {
    try {
      const res = await apiService.setEdgeConnectivity(state);
      setActionFeedback(`Connectivity simulation set to ${res.current_connectivity}`);
      await loadData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Failed to set connectivity:', err);
    }
  };

  // Handle manual sync trigger
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const result = await apiService.syncEdgeQueue(50);
      setActionFeedback(
        result.status === 'OFFLINE'
          ? 'Sync skipped: Edge is offline. Events preserved in local queue.'
          : `Sync completed: ${result.synced_count} events synchronized to central platform.`
      );
      await loadData();
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle test event generation
  const handleGenerateTestEvent = async (type: string, severity: string) => {
    try {
      const isOffline = summary?.connectivity === 'OFFLINE';
      const res = await apiService.enqueueEdgeEvent({
        event_type: type,
        bus_id: 'PMP-BUS-001',
        camera_id: 'CAM-FRONT-01',
        severity: severity,
        confidence: 0.88,
        operational_confidence: 0.82,
        evidence_reference: 'assets/road-defects/pothole-real-01.jpg',
      });
      setActionFeedback(
        isOffline
          ? `[OFFLINE] Event ${res.event_id} safely stored in local SQLite edge queue (PENDING)`
          : `[ONLINE] Event ${res.event_id} synchronized directly to central platform`
      );
      await loadData();
      setTimeout(() => setActionFeedback(null), 5000);
    } catch (err) {
      console.error('Failed to generate test event:', err);
    }
  };

  // Handle retry
  const handleRetry = async (queueId: string) => {
    try {
      await apiService.retryEdgeEvent(queueId);
      setActionFeedback(`Retry scheduled for queue item ${queueId}`);
      await loadData();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err) {
      console.error('Retry failed:', err);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (activeFilter !== 'ALL' && e.status !== activeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.event_id.toLowerCase().includes(q) ||
        e.bus_id.toLowerCase().includes(q) ||
        e.event_type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getConnectivityBadge = (state?: EdgeConnectivityState) => {
    switch (state) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        );
      case 'OFFLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            OFFLINE
          </span>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCw className="w-3 h-3 animate-spin text-cyan-400" />
            SYNCING
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            DEGRADED
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Clock className="w-3 h-3" /> PENDING
          </span>
        );
      case 'SYNCING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            <RefreshCw className="w-3 h-3 animate-spin" /> SYNCING
          </span>
        );
      case 'SYNCED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> SYNCED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3" /> FAILED
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20">
            EXPIRED
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    const s = sev.toUpperCase();
    if (s === 'CRITICAL') return <span className="text-rose-400 font-semibold text-xs">CRITICAL</span>;
    if (s === 'HIGH') return <span className="text-amber-400 font-semibold text-xs">HIGH</span>;
    if (s === 'MEDIUM') return <span className="text-cyan-400 font-medium text-xs">MEDIUM</span>;
    return <span className="text-slate-400 text-xs">LOW</span>;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-100 tracking-tight flex items-center gap-2">
                Offline Store-and-Forward Edge Event Queue
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Local SQLite durability layer ensuring AI urban events are safely stored during network dropouts and automatically synchronized.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {summary && getConnectivityBadge(summary.connectivity)}
          <button
            onClick={handleTriggerSync}
            disabled={isSyncing || summary?.connectivity === 'OFFLINE'}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-cyan-900/20 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync Now
          </button>
        </div>
      </div>

      {/* Action / Notification Banner */}
      {actionFeedback && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs shadow-lg animate-fadeIn">
          <Zap className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Offline Alert Banner */}
      {summary?.connectivity === 'OFFLINE' && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 text-xs">
          <WifiOff className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-rose-300">OFFLINE SIMULATION ACTIVE</div>
            <div className="text-rose-200/80 mt-0.5">
              AI detections will be stored locally in the edge SQLite database (<code className="bg-rose-900/40 px-1 py-0.5 rounded text-rose-300">edge_queue.db</code>) with high-priority incident preservation. When connectivity is restored, events will automatically synchronize.
            </div>
          </div>
        </div>
      )}

      {/* Connectivity Simulation & Edge Architecture Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Connectivity Simulation Controls */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Radio className="w-4 h-4 text-cyan-400" />
              Connectivity Simulation
            </h2>
            {summary?.active_simulation && (
              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            Control simulated edge network reachability to verify store-and-forward resilience.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleSetConnectivity('ONLINE')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                summary?.connectivity === 'ONLINE' && !summary.active_simulation
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              ONLINE
            </button>
            <button
              onClick={() => handleSetConnectivity('OFFLINE')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                summary?.connectivity === 'OFFLINE'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              OFFLINE
            </button>
            <button
              onClick={() => handleSetConnectivity('DEGRADED')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                summary?.connectivity === 'DEGRADED'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              DEGRADED
            </button>
            <button
              onClick={() => handleSetConnectivity('AUTO')}
              className="px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              AUTO (Reset)
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>Queue Capacity:</span>
              <span className="font-mono text-slate-200">{summary?.queue_capacity || 1000} items</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center justify-between mt-1">
              <span>SQLite Durability:</span>
              <span className="font-mono text-emerald-400">edge_queue.db</span>
            </div>
          </div>
        </div>

        {/* Test Event Injection Generator */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Send className="w-4 h-4 text-cyan-400" />
            Store-and-Forward Testbed
          </h2>
          <p className="text-xs text-slate-400">
            Generate test detections to verify local queueing during network dropouts.
          </p>

          <div className="space-y-2">
            <button
              onClick={() => handleGenerateTestEvent('ROAD_POTHOLE', 'HIGH')}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-left text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer border border-slate-700/50"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Road Pothole (High)
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleGenerateTestEvent('PEDESTRIAN_RISK', 'HIGH')}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-left text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer border border-slate-700/50"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-400" />
                Pedestrian Risk Hotspot (High)
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
            <button
              onClick={() => handleGenerateTestEvent('HIT_AND_RUN', 'CRITICAL')}
              className="w-full px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-left text-xs text-slate-200 flex items-center justify-between transition-colors cursor-pointer border border-slate-700/50"
            >
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                Critical Incident (Preserved)
              </span>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            </button>
          </div>
        </div>

        {/* Store-and-Forward Architecture Diagram / Summary */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            Architecture Flow
          </h2>
          <div className="bg-slate-950/70 p-3 rounded-lg font-mono text-[11px] text-slate-300 space-y-1 border border-slate-800/80">
            <div className="text-cyan-400 font-semibold">BUS AI PERCEPTION</div>
            <div className="pl-3 text-slate-400">↓ Detection Generated</div>
            <div className="pl-3 flex items-center justify-between text-slate-300">
              <span>● Connectivity Check:</span>
              <span className={summary?.connectivity === 'OFFLINE' ? 'text-rose-400' : 'text-emerald-400'}>
                {summary?.connectivity || 'ONLINE'}
              </span>
            </div>
            {summary?.connectivity === 'OFFLINE' ? (
              <>
                <div className="pl-3 text-amber-300 font-semibold">↓ Local SQLite Queue (PENDING)</div>
                <div className="pl-3 text-slate-400">↓ Awaiting Network Return</div>
              </>
            ) : (
              <div className="pl-3 text-emerald-400 font-semibold">↓ Central Upload (SYNCED)</div>
            )}
            <div className="pl-3 text-slate-400">↓ Central GIS / Analytics</div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Lightweight metadata and media references are preserved locally without consuming heavy continuous streaming bandwidth.
          </p>
        </div>
      </div>

      {/* Queue Metrics Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>Pending Sync</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">{summary?.pending ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Awaiting network return</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>In Flight (Syncing)</span>
            <RefreshCw className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100 mt-2 font-mono">{summary?.syncing ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Transmitting batch</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>Synchronized</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2 font-mono">{summary?.synced ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Received by central platform</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
          <div className="text-slate-400 text-xs font-medium flex items-center justify-between">
            <span>Failed Retries</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-2 font-mono">{summary?.failed ?? 0}</div>
          <div className="text-[11px] text-slate-400 mt-1">Exceeded max retries (manual retry available)</div>
        </div>
      </div>

      {/* Queued Events List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        {/* Table Controls */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'PENDING', 'SYNCING', 'SYNCED', 'FAILED'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  activeFilter === f
                    ? 'bg-cyan-600 text-white font-semibold'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search Event ID, Bus, Type..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-64"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Queue ID / Event ID</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Bus / Source</th>
                <th className="px-4 py-3">Severity</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Retries</th>
                <th className="px-4 py-3">Evidence Ref</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400 font-sans text-xs">
                    No queued events matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((evt) => (
                  <tr key={evt.queue_id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-200">{evt.event_id}</div>
                      <div className="text-[10px] text-slate-400 font-sans">{evt.queue_id}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-sans">{evt.event_type}</td>
                    <td className="px-4 py-3 text-slate-300 font-sans">{evt.bus_id}</td>
                    <td className="px-4 py-3">{getSeverityBadge(evt.severity)}</td>
                    <td className="px-4 py-3 text-slate-400 font-sans">
                      {new Date(evt.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{evt.retry_count}</td>
                    <td className="px-4 py-3 text-slate-400 font-sans truncate max-w-[150px]" title={evt.evidence_reference}>
                      {evt.evidence_reference || 'EVIDENCE_REFERENCE_UNAVAILABLE'}
                    </td>
                    <td className="px-4 py-3 font-sans">{getStatusBadge(evt.status)}</td>
                    <td className="px-4 py-3 text-right font-sans">
                      {evt.status === 'FAILED' ? (
                        <button
                          onClick={() => handleRetry(evt.queue_id)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold cursor-pointer border border-cyan-500/30"
                        >
                          Retry
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Technical Honesty Disclaimer */}
      <div className="text-center text-xs text-slate-400 border-t border-slate-800/60 pt-4">
        {summary?.disclaimer || 'Prototype edge connectivity and store-and-forward simulation.'}
      </div>
    </div>
  );
};
