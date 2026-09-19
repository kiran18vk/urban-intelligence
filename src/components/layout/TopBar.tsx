import { useState } from 'react';
import { Menu, Bell, Search, Settings, Activity } from 'lucide-react';

interface TopBarProps {
  onMenuClick: () => void;
  title: string;
}

export function TopBar({ onMenuClick, title }: TopBarProps) {
  const [now] = useState(new Date());

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-ink-700 bg-ink-900/95 px-4 backdrop-blur lg:px-6">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-lg bg-ink-850 px-3 py-1.5">
          <Activity className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">LIVE</span>
          <span className="h-3 w-px bg-ink-600" />
          <span className="text-xs text-slate-400 tabular">{now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      <div className="flex-1 text-center lg:text-left">
        <h2 className="text-sm font-semibold tracking-tight text-slate-200 lg:text-base">{title}</h2>
      </div>

      {/* Search */}
      <div className="relative hidden md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search events, buses, incidents..."
          className="w-56 rounded-lg border border-ink-700 bg-ink-850 py-2 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition focus:border-accent-500/50 focus:ring-1 focus:ring-accent-500/20 lg:w-72"
        />
      </div>

      {/* Notifications */}
      <button className="relative rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200">
        <Bell className="h-5 w-5" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-ink-900" />
      </button>

      {/* Settings */}
      <button className="rounded-lg p-2 text-slate-400 transition hover:bg-ink-800 hover:text-slate-200">
        <Settings className="h-5 w-5" />
      </button>

      {/* User avatar */}
      <div className="flex items-center gap-2 border-l border-ink-700 pl-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-xs font-semibold text-white">
          TA
        </div>
        <div className="hidden lg:block">
          <p className="text-xs font-medium text-slate-200">Transport Authority</p>
          <p className="text-[10px] text-slate-500">Pune PMC</p>
        </div>
      </div>
    </header>
  );
}
