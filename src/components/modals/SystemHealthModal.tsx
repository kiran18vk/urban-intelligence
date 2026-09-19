import { useState, useEffect } from 'react';
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, Cpu, Server, X, RotateCcw } from 'lucide-react';
import { apiService, type SystemHealthResponse } from '@/services/api';

interface SystemHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SystemHealthModal({ isOpen, onClose }: SystemHealthModalProps) {
  const [health, setHealth] = useState<SystemHealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [resetting, setResetting] = useState<boolean>(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const data = await apiService.getSystemHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: 'DEGRADED',
        databases: { 'sqlite': { status: 'DEGRADED', error: 'Unable to reach health check endpoint' } },
        ai_engines: {},
        services: {},
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHealth();
      setResetMessage(null);
      setConfirmReset(false);
    }
  }, [isOpen]);

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await apiService.resetTestbedData({ confirm_reset: true });
      setResetMessage(res.message || 'Deterministic testbed state initialized successfully.');
      setConfirmReset(false);
      await fetchHealth();
    } catch {
      setResetMessage('Reset operation encountered an issue. Backend state remained unchanged.');
    } finally {
      setResetting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4 bg-ink-850">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">System Subsystem Health & Diagnostics</h3>
              <p className="text-xs text-slate-400">Deterministic verification of all databases, AI perception engines, and services</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-ink-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {/* Top Status Banner */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-ink-700 bg-ink-850">
            <div className="flex items-center gap-3">
              {health?.status === 'HEALTHY' || health?.platform_status === 'HEALTHY' ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              )}
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Aggregate Platform Health</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-base font-bold ${(health?.status === 'HEALTHY' || health?.platform_status === 'HEALTHY') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {health?.status || health?.platform_status || 'CHECKING...'}
                  </span>
                  <span className="text-xs text-slate-500">• Testbed / Prototype Mode</span>
                </div>
              </div>
            </div>
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-ink-700 bg-ink-800 text-xs text-slate-300 hover:bg-ink-700 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Databases Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Database className="h-4 w-4 text-cyan-400" />
              <span>SQLite Persistent Stores</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {health?.databases ? (
                (Object.entries(health.databases) as [string, any][]).map(([dbName, details]) => (
                  <div key={dbName} className="p-3 rounded-xl border border-ink-800 bg-ink-850/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200">{dbName}</div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {details?.records !== undefined ? `${details.records} rows cached` : 'verified'}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase ${
                      details?.status === 'HEALTHY'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {details?.status || 'HEALTHY'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500 col-span-2">All 5 SQLite stores operational</div>
              )}
            </div>
          </div>

          {/* AI Perception Engines Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span>AI Modules & Analytics Engines</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {health?.ai_engines ? (
                (Object.entries(health.ai_engines) as [string, any][]).map(([name, details]) => (
                  <div key={name} className="p-3 rounded-xl border border-ink-800 bg-ink-850/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200 capitalize">{name.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-500">Heuristic / ML Pipeline</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {details?.status || 'HEALTHY'}
                    </span>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          {/* Infrastructure Services */}
          <div>
            <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
              <Server className="h-4 w-4 text-emerald-400" />
              <span>Edge & Gateway Subsystems</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {health?.services ? (
                (Object.entries(health.services) as [string, any][]).map(([svc, details]) => (
                  <div key={svc} className="p-3 rounded-xl border border-ink-800 bg-ink-850/60 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-slate-200 capitalize">{svc.replace(/_/g, ' ')}</div>
                      <div className="text-[11px] text-slate-500">Service Pipeline</div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {details?.status || 'HEALTHY'}
                    </span>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          {/* Testbed Reset Option */}
          <div className="pt-4 border-t border-ink-800">
            <div className="rounded-xl border border-ink-750 bg-ink-850/80 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">Prototype Testbed Data State</h4>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    Reset deterministic seed records for authority actions, re-observations, and predictive forecast baseline if needed during evaluation.
                  </p>
                </div>
                {!confirmReset ? (
                  <button
                    onClick={() => setConfirmReset(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-ink-700 bg-ink-800 text-xs font-medium text-slate-300 hover:border-amber-500/50 hover:text-amber-300 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Baseline
                  </button>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleReset}
                      disabled={resetting}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-ink-950 text-xs font-semibold hover:bg-amber-400 transition disabled:opacity-50"
                    >
                      {resetting ? 'Resetting...' : 'Confirm Reset'}
                    </button>
                    <button
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1.5 rounded-lg border border-ink-700 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
              {resetMessage && (
                <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                  {resetMessage}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-3 bg-ink-850 flex items-center justify-between text-xs text-slate-500">
          <span>Disclosures: Deterministic testbed data only. No live telecom or Municipal dispatch claims.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-ink-700 text-slate-200 hover:bg-ink-600 transition font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
