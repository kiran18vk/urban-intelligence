import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Layers,
  Map,
  TrafficCone,
  CircleAlert,
  Siren,
  BarChart3,
  Boxes,
  Radar,
  Users,
  HardDrive,
  ClipboardCheck,
  ShieldAlert,
  RotateCcw,
  Sparkles,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { to: '/', label: 'Command Center', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Live Operations',
    items: [
      { to: '/live-monitor', label: 'Live Monitor', icon: Video },
      { to: '/traffic', label: 'Traffic Intelligence', icon: TrafficCone, badge: 14 },
      { to: '/map', label: 'Live GIS Map', icon: Map },
      { to: '/defects', label: 'Road Defects', icon: CircleAlert, badge: 24 },
      { to: '/incidents', label: 'Incident Response', icon: Siren, badge: 8 },
      { to: '/pedestrian-safety', label: 'Pedestrian Safety', icon: Users, badge: 4 },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/event-correlation', label: 'Event Correlation', icon: Layers },
      { to: '/predictive', label: 'Predictive Intel', icon: Sparkles, badge: 6 },
      { to: '/digital-twin', label: 'Urban Digital Twin', icon: Boxes },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Response & Verification',
    items: [
      { to: '/review-center', label: 'Review Center', icon: ClipboardCheck },
      { to: '/authority-actions', label: 'Action Center', icon: ShieldAlert, badge: 5 },
      { to: '/reobservation', label: 'Re-Observation', icon: RotateCcw, badge: 6 },
    ],
  },
  {
    title: 'Edge & Sync',
    items: [
      { to: '/edge-queue', label: 'Edge Queue', icon: HardDrive },
    ],
  },
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
        <nav className="flex-1 space-y-4 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-ink-700">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {group.title}
              </p>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-accent-500/15 text-accent-300 border border-accent-500/30 shadow-sm shadow-accent-500/10'
                        : 'text-slate-400 hover:bg-ink-800/80 hover:text-slate-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300'
                        }`}
                      />
                      <span className="flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold tabular transition-colors ${
                            isActive
                              ? 'bg-accent-500/25 text-accent-300 border border-accent-500/30'
                              : 'bg-ink-800 text-slate-400 group-hover:text-slate-300'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
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
