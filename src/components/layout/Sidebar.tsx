import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  TrafficCone,
  CircleAlert,
  Siren,
  BarChart3,
  Boxes,
  Radar,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/map', label: 'Live GIS Map', icon: Map },
  { to: '/traffic', label: 'Traffic Intelligence', icon: TrafficCone, badge: 14 },
  { to: '/defects', label: 'Road Defects', icon: CircleAlert, badge: 24 },
  { to: '/incidents', label: 'Incident Response', icon: Siren, badge: 8 },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/digital-twin', label: 'Urban Digital Twin', icon: Boxes },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-ink-700 bg-ink-900 transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo / brand */}
        <div className="flex h-16 items-center justify-between border-b border-ink-700 px-5">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 shadow-lg shadow-accent-500/20">
              <Radar className="h-5 w-5 text-white" />
              <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/10" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-slate-100">URBAN INTELLIGENCE</h1>
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent-400">SIH 2026 Platform</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <p className="px-3 pb-2 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">Command Center</p>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-accent-500/10 text-accent-300 ring-1 ring-inset ring-accent-500/20'
                    : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-md bg-ink-700 px-1.5 py-0.5 text-[10px] font-semibold tabular text-slate-300">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status footer */}
        <div className="border-t border-ink-700 p-4">
          <div className="flex items-center gap-2 rounded-lg bg-ink-850 p-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-300">System Online</p>
              <p className="text-[10px] text-slate-500">11 buses active | 44 cameras</p>
            </div>
          </div>
          <p className="mt-3 text-center text-[10px] text-slate-600">v1.0.0 · PMP Smart Bus Fleet</p>
        </div>
      </aside>
    </>
  );
}
