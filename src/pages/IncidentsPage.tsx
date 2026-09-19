import { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Bus as BusIcon,
  Camera,
  Car,
  Hash,
  Play,
  FileText,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Maximize2,
  Layers,
  Sparkles,
  Info,
  Compass,
} from 'lucide-react';
import { LoadingSpinner, ErrorState, EmptyState } from '@/components/ui/StateWrappers';
import { SeverityBadge } from '@/components/ui/Badges';
import { MapComponent } from '@/components/Map/MapComponent';
import { formatTimestamp, formatFullTimestamp } from '@/lib/eventMeta';
import { apiService } from '@/services/api';
import type { IncidentRecord, IncidentStatusString, UrbanSeverityString } from '@/types';

export function IncidentsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<IncidentRecord[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<IncidentRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await apiService.getRecentIncidents();
      setIncidents(records);
      if (records.length > 0) {
        setSelectedIncident(records[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleStatusUpdate = async (incidentId: string, newStatus: IncidentStatusString) => {
    setUpdatingStatus(true);
    try {
      const updated = await apiService.updateIncidentStatus(incidentId, newStatus);
      setIncidents((prev) =>
        prev.map((inc) => (inc.incident_id === incidentId ? { ...inc, status: updated.status } : inc))
      );
      if (selectedIncident?.incident_id === incidentId) {
        setSelectedIncident((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    } catch (e) {
      console.error('Failed to update status:', e);
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={loadIncidents} />;

  // Filter list
  const filtered = incidents.filter((inc) => {
    if (statusFilter !== 'ALL' && inc.status.toUpperCase() !== statusFilter) return false;
    if (severityFilter !== 'ALL' && inc.severity.toUpperCase() !== severityFilter) return false;
    return true;
  });

  const getStatusBadge = (status: IncidentStatusString) => {
    switch (status) {
      case 'NEW':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            NEW
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            IN REVIEW
          </span>
        );
      case 'ACTIONED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-sky-300">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
            ACTIONED
          </span>
        );
      case 'CLOSED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-300">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            CLOSED
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'HIT_AND_RUN_SUSPECT':
        return 'Hit & Run Suspect';
      case 'POTENTIAL_COLLISION':
        return 'Potential Collision';
      case 'SUSPICIOUS_PROXIMITY':
        return 'Suspicious Proximity';
      case 'SUDDEN_DEVIATION':
        return 'Sudden Trajectory Deviation';
      default:
        return type.replace(/_/g, ' ');
    }
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-rose-400" />
              <h2 className="text-lg font-bold text-slate-100">Incident Intelligence & Hit-and-Run Operations</h2>
              <span className="rounded bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-rose-300 uppercase">
                Phase 6 Prototype
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 max-w-4xl">
              Spatiotemporal track association, ANPR plate recognition, observation reliability assessment, and human-in-the-loop review workflow.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 rounded-lg border border-ink-750 text-[11px] text-slate-400">
            <Info className="h-3.5 w-3.5 text-accent-400 flex-shrink-0" />
            <span>Demonstration mode with synthetic validation data & deterministic GPS.</span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: 'Total Incidents', value: incidents.length, color: 'text-rose-400' },
          { label: 'New / Unreviewed', value: incidents.filter((i) => i.status === 'NEW').length, color: 'text-rose-400' },
          { label: 'Under Review', value: incidents.filter((i) => i.status === 'REVIEW').length, color: 'text-amber-400' },
          { label: 'Actioned / Closed', value: incidents.filter((i) => i.status === 'ACTIONED' || i.status === 'CLOSED').length, color: 'text-emerald-400' },
          { label: 'Suspect Hit & Run', value: incidents.filter((i) => i.incident_type === 'HIT_AND_RUN_SUSPECT').length, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
            <p className={`text-2xl font-bold tabular font-mono ${stat.color}`}>{stat.value}</p>
            <p className="mt-0.5 text-xs text-slate-400">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Main Grid: Left Queue (2 cols) & Right Inspector (3 cols) */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        {/* Left Column: Filter & Incident Queue */}
        <div className="xl:col-span-5 space-y-3">
          {/* Filter Bar */}
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-accent-400" />
                Status Filter
              </span>
              <div className="flex gap-1">
                {['ALL', 'NEW', 'REVIEW', 'ACTIONED', 'CLOSED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded px-2 py-0.5 text-[10.5px] font-medium transition ${
                      statusFilter === st
                        ? 'bg-accent-600 text-white'
                        : 'bg-ink-800 text-slate-400 hover:bg-ink-750 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-ink-750">
              <span className="text-xs font-semibold text-slate-300">Severity</span>
              <div className="flex gap-1">
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`rounded px-2 py-0.5 text-[10.5px] font-medium transition ${
                      severityFilter === sev
                        ? 'bg-rose-600 text-white'
                        : 'bg-ink-800 text-slate-400 hover:bg-ink-750 hover:text-slate-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident Cards Queue */}
          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {filtered.length === 0 ? (
              <EmptyState title="No Incidents Match Filter" message="Change filter criteria to inspect other incident records." />
            ) : (
              filtered.map((inc) => {
                const isSelected = selectedIncident?.incident_id === inc.incident_id;
                return (
                  <div
                    key={inc.incident_id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`cursor-pointer rounded-xl border p-3.5 transition ${
                      isSelected
                        ? 'border-rose-500/60 bg-rose-500/10 shadow-lg shadow-rose-950/20'
                        : 'border-ink-700 bg-ink-850 hover:border-ink-600 hover:bg-ink-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-100">{getTypeLabel(inc.incident_type)}</span>
                          {inc.is_demo && (
                            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-mono font-bold text-amber-300">
                              DEMO
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 font-mono text-[10px] text-slate-400">{inc.incident_id}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {getStatusBadge(inc.status)}
                        <SeverityBadge severity={inc.severity as any} />
                      </div>
                    </div>

                    <p className="mt-2 text-xs text-slate-300 line-clamp-2">{inc.notes}</p>

                    <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-ink-750/70 text-[11px] text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Car className="h-3 w-3 text-accent-400" />
                        <span>
                          Track <strong className="text-slate-200">#{inc.track_id ?? 'N/A'}</strong> ({inc.vehicle_class})
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <Hash className="h-3 w-3 text-emerald-400" />
                        {inc.plate_text ? (
                          <span className="font-mono font-bold text-emerald-300">{inc.plate_text}</span>
                        ) : (
                          <span className="text-slate-500 italic">Plate not readable</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <BusIcon className="h-3 w-3 text-slate-500" />
                        <span>{inc.bus_id}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <Clock className="h-3 w-3 text-slate-500" />
                        <span>{typeof inc.timestamp === 'number' ? formatTimestamp(new Date(inc.timestamp * 1000).toISOString()) : formatTimestamp(inc.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed Incident Inspector */}
        <div className="xl:col-span-7 space-y-4">
          {selectedIncident ? (
            <div className="space-y-4">
              {/* Top Banner & Status Workflow Controls */}
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-ink-750 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-100">{getTypeLabel(selectedIncident.incident_type)}</h3>
                      {getStatusBadge(selectedIncident.status)}
                    </div>
                    <p className="font-mono text-xs text-slate-400 mt-0.5">
                      ID: {selectedIncident.incident_id} · Bus {selectedIncident.bus_id} ({selectedIncident.camera_id})
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      disabled={updatingStatus || selectedIncident.status === 'REVIEW'}
                      onClick={() => handleStatusUpdate(selectedIncident.incident_id, 'REVIEW')}
                      className="rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                    >
                      In Review
                    </button>
                    <button
                      disabled={updatingStatus || selectedIncident.status === 'ACTIONED'}
                      onClick={() => handleStatusUpdate(selectedIncident.incident_id, 'ACTIONED')}
                      className="rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                    >
                      Actioned
                    </button>
                    <button
                      disabled={updatingStatus || selectedIncident.status === 'CLOSED'}
                      onClick={() => handleStatusUpdate(selectedIncident.incident_id, 'CLOSED')}
                      className="rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Human-in-the-Loop Action Recommendation */}
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/25 p-3 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-rose-200">Potential Incident Detected — Requires Human Review</p>
                    <p className="text-slate-300 leading-relaxed">
                      AI perception identified a sudden departure/proximity interaction. This prototype workflow notifies operators for manual review before any enforcement action. Does NOT constitute verified legal liability or official RTO database confirmation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Three Confidence Triad Cards (Phase 5 Observation Reliability) */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-ink-700 bg-ink-850 p-3 text-center">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400">AI Detection Conf.</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-sky-400">
                    {(selectedIncident.confidence * 100).toFixed(0)}%
                  </p>
                  <span className="text-[10px] text-slate-500">Raw YOLO/ByteTrack</span>
                </div>
                <div className="rounded-xl border border-ink-700 bg-ink-850 p-3 text-center">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400">Observation Reliability</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-amber-400">
                    {selectedIncident.reliability ? `${(selectedIncident.reliability.score * 100).toFixed(0)}%` : 'N/A'}
                  </p>
                  <span className="text-[10px] text-slate-500">Visual Quality Layer</span>
                </div>
                <div className="rounded-xl border border-ink-700 bg-ink-850 p-3 text-center bg-gradient-to-b from-ink-850 to-emerald-950/20">
                  <span className="text-[10.5px] uppercase font-bold tracking-wider text-emerald-300">Operational Conf.</span>
                  <p className="mt-1 text-2xl font-bold font-mono text-emerald-400">
                    {(selectedIncident.operational_confidence * 100).toFixed(0)}%
                  </p>
                  <span className="text-[10px] text-emerald-500/80">Quality-Adjusted ≤ Raw</span>
                </div>
              </div>

              {/* Two Column Inspector: Left Vehicle & Trigger, Right Reliability & GPS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Identification & ANPR */}
                <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Car className="h-4 w-4 text-accent-400" />
                      Vehicle & Plate Identification
                    </span>
                  </div>

                  <div className="rounded-lg bg-ink-900 border border-ink-750 p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Number Plate</span>
                      {selectedIncident.plate_text ? (
                        <span className="font-mono text-base font-bold text-emerald-300 tracking-wider">
                          {selectedIncident.plate_text}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-semibold italic">Plate not readable</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">OCR Confidence</span>
                      <span className="font-mono text-slate-200">
                        {selectedIncident.plate_confidence ? `${(selectedIncident.plate_confidence * 100).toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">ANPR Status</span>
                      <span className="font-mono text-[11px] text-amber-300">{selectedIncident.anpr_status}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Track Identifier</span>
                      <span className="font-mono font-medium text-slate-200">#{selectedIncident.track_id ?? 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Vehicle Classification</span>
                      <span className="font-medium text-slate-200 uppercase">{selectedIncident.vehicle_class}</span>
                    </div>
                  </div>

                  <div className="rounded bg-ink-900/80 p-2 border border-ink-750 text-[10.5px] text-slate-400 flex items-start gap-1.5">
                    <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                    <span>OCR format validation only. No official government RTO database integration.</span>
                  </div>
                </div>

                {/* Spatio-temporal Trigger Metrics */}
                <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    Trigger & Trajectory Analysis
                  </span>

                  <div className="rounded-lg bg-ink-900 border border-ink-750 p-3 space-y-2 text-xs font-mono">
                    {selectedIncident.detection_metadata?.trajectory_deviation_deg !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trajectory Deviation:</span>
                        <span className="text-purple-300 font-bold">
                          {selectedIncident.detection_metadata.trajectory_deviation_deg}°
                        </span>
                      </div>
                    )}
                    {selectedIncident.detection_metadata?.proximity_distance_px !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Proximity Distance:</span>
                        <span className="text-amber-300 font-bold">
                          {selectedIncident.detection_metadata.proximity_distance_px} px
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Persistence Frames:</span>
                      <span className="text-slate-200">{selectedIncident.detection_metadata?.persistence_frames ?? 1} frames</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Frame Index:</span>
                      <span className="text-slate-200">{selectedIncident.detection_metadata?.frame_index ?? 0}</span>
                    </div>
                  </div>

                  {/* Evidence Media Paths */}
                  <div className="space-y-1 text-xs">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Evidence Media</span>
                    <div className="rounded bg-ink-900 p-2 border border-ink-750 text-[11px] text-slate-400 space-y-1 truncate">
                      {selectedIncident.evidence.image_path && (
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText className="h-3 w-3 text-sky-400 flex-shrink-0" />
                          <span className="truncate">{selectedIncident.evidence.image_path}</span>
                        </div>
                      )}
                      {selectedIncident.evidence.video_path && (
                        <div className="flex items-center gap-1.5 truncate">
                          <FileText className="h-3 w-3 text-purple-400 flex-shrink-0" />
                          <span className="truncate">{selectedIncident.evidence.video_path}</span>
                        </div>
                      )}
                      {!selectedIncident.evidence.image_path && !selectedIncident.evidence.video_path && (
                        <span className="text-slate-600 italic">No external media linked</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Observation Reliability "Why?" Breakdown (Phase 5) */}
              {selectedIncident.reliability && (
                <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Why was this reliability score calculated?
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Weighted Score: {(selectedIncident.reliability.score * 100).toFixed(0)}%
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {selectedIncident.reliability.reasons?.map((reason: string, idx: number) => {
                      const isWarn = reason.toLowerCase().includes('blur') || reason.toLowerCase().includes('dark') || reason.toLowerCase().includes('moderate');
                      const isUnavail = reason.toLowerCase().includes('unavailable') || reason.toLowerCase().includes('not measured');
                      return (
                        <div key={idx} className="flex items-center gap-2 rounded bg-ink-900 px-2.5 py-1.5 border border-ink-750">
                          {isWarn ? (
                            <span className="text-amber-400 font-bold flex-shrink-0">⚠</span>
                          ) : isUnavail ? (
                            <span className="text-slate-500 font-bold flex-shrink-0">—</span>
                          ) : (
                            <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>
                          )}
                          <span className={isUnavail ? 'text-slate-500' : isWarn ? 'text-amber-300' : 'text-slate-300'}>{reason}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Location & GIS Map Section */}
              <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-accent-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">Incident Geolocation</h4>
                  </div>
                  <div className="flex items-center gap-1.5 rounded bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span>Simulated GPS (Deterministic)</span>
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden border border-ink-750">
                  <MapComponent
                    incidents={[
                      {
                        id: selectedIncident.incident_id,
                        type: 'accident',
                        location: { lat: selectedIncident.gps.latitude, lng: selectedIncident.gps.longitude },
                        address: `Corridor ${selectedIncident.bus_id}`,
                        severity: selectedIncident.severity.toLowerCase() as any,
                        status: selectedIncident.status === 'NEW' ? 'open' : selectedIncident.status === 'REVIEW' ? 'investigating' : 'resolved',
                        timestamp: typeof selectedIncident.timestamp === 'number' ? new Date(selectedIncident.timestamp * 1000).toISOString() : selectedIncident.timestamp,
                        busId: selectedIncident.bus_id,
                        camera: selectedIncident.camera_id,
                        vehiclePlate: selectedIncident.plate_text ?? 'UNREADABLE',
                        plateOcrConfidence: selectedIncident.plate_confidence ?? 0,
                        vehicleType: selectedIncident.vehicle_class,
                        vehicleColor: 'Unknown',
                        confidence: selectedIncident.confidence,
                        description: selectedIncident.notes,
                        thumbnail: selectedIncident.evidence.image_path ?? '',
                        reportedBy: 'AI Perception Engine',
                      },
                    ]}
                    center={{ lat: selectedIncident.gps.latitude, lng: selectedIncident.gps.longitude }}
                    zoom={15}
                    height="240px"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-ink-700 bg-ink-850 p-8 text-center space-y-2">
              <Compass className="h-8 w-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-300">No Incident Selected</h4>
              <p className="text-xs text-slate-500">
                Select a potential incident record from the queue to inspect trajectory analysis, ANPR reading, and reliability factors.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
