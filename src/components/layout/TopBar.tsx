import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Activity, Wifi, WifiOff, RefreshCw, Compass, Database } from 'lucide-react';
import { apiService, type SystemHealthResponse } from '@/services/api';
import type { QueueStatusSummary } from '@/types';
import { SystemHealthModal } from '../modals/SystemHealthModal';
import { SIHWorkflowTourModal } from '../modals/SIHWorkflowTourModal';

interface TopBarProps {
  onMenuClick: () => void;
  title: string;
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  const [now] = useState(new Date());
  const [edgeStatus, setEdgeStatus] = useState<QueueStatusSummary | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('HEALTHY');
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [tourModalOpen, setTourModalOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const [edge, health] = await Promise.allSettled([
          apiService.getEdgeQueueStatus(),
          apiService.getSystemHealth()
        ]);
        if (edge.status === 'fulfilled') setEdgeStatus(edge.value);
        if (health.status === 'fulfilled') {
          const val = health.value as SystemHealthResponse;
          setHealthStatus(val.status || val.platform_status || 'HEALTHY');
        }
      } catch {
        // graceful
      }
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-ink-700 bg-ink-900/95 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-slate-200 lg:text-base truncate max-w-[200px] sm:max-w-none">
              {title}
            </h2>
          </div>
        </div>

        {/* Global Status Bar Indicators */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Platform Health Button */}
          <button
            onClick={() => setHealthModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
              healthStatus === 'HEALTHY'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Click to view Subsystem Health Diagnostics & Reset Testbed"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="font-semibold">{healthStatus === 'HEALTHY' ? 'SYSTEM: OK' : 'SYSTEM: CHECK'}</span>
          </button>

          {/* Data Mode Pill */}
          <div 
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-ink-700 bg-ink-850 text-slate-300"
            title="Platform operates in synthetic testbed mode with deterministic test data."
          >
            <Database className="h-3 w-3 text-cyan-400" />
            <span className="text-slate-400">DATA:</span>
            <span className="text-cyan-300 font-semibold">TESTBED</span>
          </div>

          {/* GPS Mode Pill */}
          <div 
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-ink-700 bg-ink-850 text-slate-300"
            title="GPS coordinates are deterministically simulated for Pune PMC transit corridors."
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent-400" />
            <span className="text-slate-400">GPS:</span>
            <span className="text-accent-300 font-semibold">SIMULATED</span>
          </div>

          {/* Edge Store-and-Forward Status Pill */}
          <Link
            to="/edge-queue"
            className={`hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              edgeStatus?.connectivity === 'OFFLINE'
                ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                : edgeStatus?.connectivity === 'SYNCING'
                ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                : 'bg-ink-850 text-slate-300 border-ink-700 hover:border-slate-600'
            }`}
            title="Edge Store-and-Forward Queue status. Click to open Edge Queue."
          >
            {edgeStatus?.connectivity === 'OFFLINE' ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="font-semibold">OFFLINE</span>
                <span className="h-3 w-px bg-rose-500/30" />
                <span className="font-mono text-[11px] text-rose-300">{edgeStatus?.pending || 0} queued</span>
              </>
            ) : edgeStatus?.connectivity === 'SYNCING' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="font-semibold">SYNCING</span>
                <span className="h-3 w-px bg-cyan-500/30" />
                <span className="font-mono text-[11px] text-cyan-300">{edgeStatus?.syncing || 0} syncing</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-200 font-semibold">ONLINE</span>
                <span className="h-3 w-px bg-ink-600" />
                <span className="text-[11px] text-slate-400">{edgeStatus?.pending ? `${edgeStatus.pending} pending` : 'Synced'}</span>
              </>
            )}
          </Link>

          {/* Workflow Guide Tour Button */}
          <button
            onClick={() => setTourModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-accent-500/40 bg-accent-500/10 text-accent-300 text-xs font-semibold hover:bg-accent-500/20 transition cursor-pointer"
            title="Open Platform Workflow & Guided Tour"
          >
            <Compass className="h-3.5 w-3.5 text-accent-400" />
            <span className="hidden sm:inline">WORKFLOW TOUR</span>
            <span className="sm:hidden">TOUR</span>
          </button>

          {/* Current Time */}
          <div className="hidden 2xl:flex items-center rounded-lg bg-ink-850 px-2.5 py-1.5 border border-ink-800 text-[11px] font-mono text-slate-400">
            {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          {/* User Avatar */}
          <div className="flex items-center gap-2 border-l border-ink-700 pl-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-semibold text-white">
              PM
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-xs font-medium text-slate-200">Municipal Control</p>
              <p className="text-[10px] text-slate-500">Pune PMC Transit</p>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SystemHealthModal
        isOpen={healthModalOpen}
        onClose={() => setHealthModalOpen(false)}
      />
      <SIHWorkflowTourModal
        isOpen={tourModalOpen}
        onClose={() => setTourModalOpen(false)}
      />
    </>
  );
}
