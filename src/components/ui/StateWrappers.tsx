export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className="flex items-center justify-center py-12">
      <div className={`${dims[size]} animate-spin rounded-full border-2 border-ink-600 border-t-accent-400`} />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="animate-pulse space-y-4 rounded-xl border border-ink-700 bg-ink-850 p-6">
      <div className="h-4 w-1/3 rounded bg-ink-700" />
      <div className="h-8 w-2/3 rounded bg-ink-700" />
      <div className="h-3 w-1/2 rounded bg-ink-700" />
      <div className="h-3 w-3/4 rounded bg-ink-700" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-500/30 bg-rose-500/5 py-16">
      <div className="mb-3 h-12 w-12 rounded-full bg-rose-500/15 flex items-center justify-center">
        <svg className="h-6 w-6 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <p className="text-sm text-slate-300 font-medium">Failed to load data</p>
      <p className="mt-1 text-xs text-slate-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-lg bg-rose-500/15 px-4 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/25"
        >
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, message }: { icon?: React.ReactNode; title: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-ink-700 bg-ink-850 py-16">
      <div className="mb-3 text-slate-600">
        {icon ?? (
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6m16 0v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4m16 0H4" />
          </svg>
        )}
      </div>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      <p className="mt-1 max-w-xs text-center text-xs text-slate-500">{message}</p>
    </div>
  );
}

export function ConfidenceBar({ value, label = 'Confidence' }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const color = pct >= 90 ? 'bg-emerald-400' : pct >= 75 ? 'bg-amber-400' : 'bg-rose-400';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-slate-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-ink-700 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-mono tabular text-slate-300 w-10 text-right">{pct}%</span>
    </div>
  );
}
