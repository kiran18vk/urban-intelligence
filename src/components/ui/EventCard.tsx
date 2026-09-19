import type { DetectionEvent } from '@/types';
import { EVENT_META, SEVERITY_META, RELIABILITY_META, EVENT_STATUS_META, formatTimestamp } from '@/lib/eventMeta';
import { SeverityBadge, ReliabilityBadge, EventStatusBadge } from '@/components/ui/Badges';
import { ConfidenceBar } from '@/components/ui/StateWrappers';
import { MapPin, Bus, Camera, Clock } from 'lucide-react';

interface EventCardProps {
  event: DetectionEvent;
  onClick?: () => void;
  compact?: boolean;
}

export function EventCard({ event, onClick, compact }: EventCardProps) {
  const meta = EVENT_META[event.type];
  const Icon = meta.icon;

  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-ink-700 bg-ink-850 transition-all ${
        onClick ? 'cursor-pointer hover:border-ink-600 hover:bg-ink-800' : ''
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${meta.bgColor} ${meta.borderColor} border`}>
          <Icon className={`h-5 w-5 ${meta.color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className={`text-sm font-semibold ${meta.color}`}>{meta.label}</span>
              <span className="ml-2 font-mono text-xs text-slate-500">{event.id}</span>
            </div>
            <EventStatusBadge status={event.status} />
          </div>
          {!compact && <p className="mt-1 text-sm text-slate-400 line-clamp-2">{event.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Bus className="h-3 w-3" /> {event.busId}
            </span>
            <span className="inline-flex items-center gap-1">
              <Camera className="h-3 w-3" /> {event.camera}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {formatTimestamp(event.timestamp)}
            </span>
          </div>
          {!compact && (
            <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="h-3 w-3" /> {event.address}
            </div>
          )}
          {!compact && (
            <div className="mt-3 space-y-2 border-t border-ink-700 pt-3">
              <ConfidenceBar value={event.confidence} label="AI Conf." />
              <ConfidenceBar value={event.reliabilityScore} label="Reliability" />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <SeverityBadge severity={event.severity} />
            <ReliabilityBadge reliability={event.reliability} />
          </div>
        </div>
      </div>
    </div>
  );
}
