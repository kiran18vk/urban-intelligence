import type { Severity, Reliability, EventStatus, IncidentStatus } from '@/types';
import {
  SEVERITY_META,
  RELIABILITY_META,
  EVENT_STATUS_META,
  INCIDENT_STATUS_META,
} from '@/lib/eventMeta';

export function SeverityBadge({ severity }: { severity: Severity | string }) {
  const normKey = (typeof severity === 'string' ? severity.toLowerCase() : severity) as Severity;
  const meta = SEVERITY_META[normKey] || SEVERITY_META.medium;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ${meta.bgColor} ${meta.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
      {meta.label}
    </span>
  );
}

export function ReliabilityBadge({ reliability }: { reliability: Reliability | string }) {
  const normKey = (typeof reliability === 'string' ? reliability.toLowerCase() : reliability) as Reliability;
  const meta = RELIABILITY_META[normKey] || RELIABILITY_META.probable;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-ink-700 ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus | string }) {
  const normKey = (typeof status === 'string' ? status.toLowerCase() : status) as EventStatus;
  const meta = EVENT_STATUS_META[normKey] || EVENT_STATUS_META.new;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.bgColor} ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function IncidentStatusBadge({ status }: { status: IncidentStatus | string }) {
  const normKey = (typeof status === 'string' ? status.toLowerCase() : status) as IncidentStatus;
  const meta = INCIDENT_STATUS_META[normKey] || INCIDENT_STATUS_META.open;
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${meta.bgColor} ${meta.color}`}>
      {meta.label}
    </span>
  );
}

export function StatusDot({ status }: { status: 'active' | 'idle' | 'offline' | string }) {
  const meta = {
    active: { label: 'Active', color: 'text-emerald-400', dot: 'bg-emerald-400' },
    idle: { label: 'Idle', color: 'text-amber-400', dot: 'bg-amber-400' },
    offline: { label: 'Offline', color: 'text-rose-400', dot: 'bg-rose-400' },
  };
  const key = (typeof status === 'string' ? status.toLowerCase() : status) as 'active' | 'idle' | 'offline';
  const selectedMeta = meta[key] || meta.idle;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${selectedMeta.color}`}>
      <span className={`relative flex h-2 w-2`}>
        {key === 'active' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${selectedMeta.dot} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${selectedMeta.dot}`} />
      </span>
      {selectedMeta.label}
    </span>
  );
}
