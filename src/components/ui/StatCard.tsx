import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: number | string;
  total?: number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  trend?: { value: string; direction: 'up' | 'down' | 'neutral' };
  sparkline?: number[];
  onClick?: () => void;
}

export function StatCard({ label, value, total, subtitle, icon: Icon, iconColor, iconBg, trend, sparkline, onClick }: StatCardProps) {
  const trendColor =
    trend?.direction === 'up' ? 'text-emerald-400' : trend?.direction === 'down' ? 'text-rose-400' : 'text-slate-400';

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl border border-ink-700 bg-ink-850 p-5 transition-all ${
        onClick ? 'cursor-pointer hover:border-ink-600 hover:bg-ink-800' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trendColor}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tabular text-slate-100">
          {value}
          {total !== undefined && <span className="text-base font-normal text-slate-500"> / {total}</span>}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-300">{label}</p>
        {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
      </div>
      {sparkline && sparkline.length > 0 && (
        <div className="mt-3 flex h-8 items-end gap-0.5">
          {sparkline.map((v, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-accent-500/40"
              style={{ height: `${(v / Math.max(...sparkline)) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
