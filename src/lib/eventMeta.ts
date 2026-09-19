import type {
  EventType,
  Severity,
  Reliability,
  EventStatus,
  IncidentStatus,
  UrbanEventTypeString,
  UrbanSeverityString,
} from '@/types';
import {
  CircleAlert,
  Droplets,
  TrafficCone,
  Car,
  TrafficCone as Signal,
  ArrowLeftRight,
  Gauge,
  Lightbulb,
  CircleDot,
  ScanLine,
  UserX,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const EVENT_META: Record<EventType, { label: string; icon: LucideIcon; color: string; bgColor: string; borderColor: string }> = {
  pothole: {
    label: 'Pothole',
    icon: CircleAlert,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  waterlogging: {
    label: 'Waterlogging',
    icon: Droplets,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  congestion: {
    label: 'Congestion',
    icon: TrafficCone,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  accident: {
    label: 'Accident',
    icon: Car,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
  },
  signal_violation: {
    label: 'Signal Violation',
    icon: Signal,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  wrong_side: {
    label: 'Wrong Side Driving',
    icon: ArrowLeftRight,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
  },
  overspeeding: {
    label: 'Overspeeding',
    icon: Gauge,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  streetlight_out: {
    label: 'Streetlight Out',
    icon: Lightbulb,
    color: 'text-stone-400',
    bgColor: 'bg-stone-500/10',
    borderColor: 'border-stone-500/30',
  },
};

export const SEVERITY_META: Record<Severity, { label: string; color: string; bgColor: string; dotColor: string }> = {
  low: { label: 'Low', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', dotColor: 'bg-emerald-400' },
  medium: { label: 'Medium', color: 'text-amber-400', bgColor: 'bg-amber-500/10', dotColor: 'bg-amber-400' },
  high: { label: 'High', color: 'text-orange-400', bgColor: 'bg-orange-500/10', dotColor: 'bg-orange-400' },
  critical: { label: 'Critical', color: 'text-rose-400', bgColor: 'bg-rose-500/10', dotColor: 'bg-rose-400' },
};

export const RELIABILITY_META: Record<Reliability, { label: string; color: string }> = {
  verified: { label: 'Verified', color: 'text-emerald-400' },
  probable: { label: 'Probable', color: 'text-amber-400' },
  unverified: { label: 'Unverified', color: 'text-rose-400' },
};

export const EVENT_STATUS_META: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
  new: { label: 'New', color: 'text-accent-300', bgColor: 'bg-accent-500/15' },
  reviewing: { label: 'Reviewing', color: 'text-amber-300', bgColor: 'bg-amber-500/15' },
  confirmed: { label: 'Confirmed', color: 'text-emerald-300', bgColor: 'bg-emerald-500/15' },
  dismissed: { label: 'Dismissed', color: 'text-rose-300', bgColor: 'bg-rose-500/15' },
};

export const INCIDENT_STATUS_META: Record<IncidentStatus, { label: string; color: string; bgColor: string }> = {
  open: { label: 'Open', color: 'text-rose-300', bgColor: 'bg-rose-500/15' },
  investigating: { label: 'Investigating', color: 'text-amber-300', bgColor: 'bg-amber-500/15' },
  resolved: { label: 'Resolved', color: 'text-emerald-300', bgColor: 'bg-emerald-500/15' },
  escalated: { label: 'Escalated', color: 'text-purple-300', bgColor: 'bg-purple-500/15' },
};

export const BUS_STATUS_META = {
  active: { label: 'Active', color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  idle: { label: 'Idle', color: 'text-amber-400', dotColor: 'bg-amber-400' },
  offline: { label: 'Offline', color: 'text-rose-400', dotColor: 'bg-rose-400' },
};

// Phase 4: GIS Intelligence Integration - UrbanEvent metadata
export const URBAN_EVENT_META: Record<
  UrbanEventTypeString,
  {
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
    markerBg: string;
    category: 'road_defect' | 'traffic' | 'incident' | 'anpr';
  }
> = {
  ROAD_POTHOLE: {
    label: 'Road Pothole',
    icon: CircleAlert,
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    borderColor: 'border-rose-500/30',
    markerBg: '#f43f5e',
    category: 'road_defect',
  },
  ROAD_CRACK: {
    label: 'Road Crack / Distress',
    icon: AlertTriangle,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    markerBg: '#f59e0b',
    category: 'road_defect',
  },
  TRAFFIC_CONGESTION: {
    label: 'Traffic Congestion',
    icon: TrafficCone,
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
    markerBg: '#ea580c',
    category: 'traffic',
  },
  VEHICLE_DETECTED: {
    label: 'Vehicle Tracking',
    icon: Car,
    color: 'text-sky-400',
    bgColor: 'bg-sky-500/10',
    borderColor: 'border-sky-500/30',
    markerBg: '#0284c7',
    category: 'traffic',
  },
  PEDESTRIAN_RISK: {
    label: 'Pedestrian Proximity Alert',
    icon: UserX,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    markerBg: '#eab308',
    category: 'incident',
  },
  ANPR_DETECTION: {
    label: 'ANPR Recognition',
    icon: ScanLine,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    markerBg: '#10b981',
    category: 'anpr',
  },
  HIT_AND_RUN: {
    label: 'Hit & Run (Schema Model)',
    icon: Flame,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/15',
    borderColor: 'border-rose-500/40',
    markerBg: '#be123c',
    category: 'incident',
  },
};

export const URBAN_SEVERITY_META: Record<
  UrbanSeverityString,
  {
    label: string;
    color: string;
    bgColor: string;
    dotColor: string;
    borderHex: string;
  }
> = {
  LOW: {
    label: 'Low',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    dotColor: 'bg-emerald-400',
    borderHex: '#10b981',
  },
  MEDIUM: {
    label: 'Medium',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    dotColor: 'bg-amber-400',
    borderHex: '#f59e0b',
  },
  HIGH: {
    label: 'High',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    dotColor: 'bg-orange-400',
    borderHex: '#f97316',
  },
  CRITICAL: {
    label: 'Critical',
    color: 'text-rose-400',
    bgColor: 'bg-rose-500/10',
    dotColor: 'bg-rose-400',
    borderHex: '#f43f5e',
  },
};


export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} hr ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function formatFullTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
