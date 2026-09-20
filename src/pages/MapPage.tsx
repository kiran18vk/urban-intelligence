import { useState, useEffect, useMemo } from 'react';
import {
  Bus as BusIcon,
  CircleAlert,
  TrafficCone,
  Car,
  Filter,
  Layers,
  Eye,
  EyeOff,
  ScanLine,
  UserX,
  AlertTriangle,
  Flame,
  Maximize2,
  X,
  MapPin,
  Clock,
  Cpu,
  Camera,
  Compass,
  FileText,
  ShieldAlert,
  Users,
  ClipboardCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { MapComponent } from '@/components/Map/MapComponent';
import { LoadingSpinner, ErrorState } from '@/components/ui/StateWrappers';
import { apiService } from '@/services/api';
import type { Bus, UrbanEvent, UrbanEventTypeString, UrbanSeverityString, GPSCoord, PedestrianHotspot } from '@/types';
import {
  URBAN_EVENT_META,
  URBAN_SEVERITY_META,
  formatFullTimestamp,
  formatTimestamp,
} from '@/lib/eventMeta';

type CategoryFilter = 'ALL' | 'ROAD_DEFECTS' | 'TRAFFIC' | 'INCIDENTS' | 'ANPR';
type SeverityFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export function MapPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [urbanEvents, setUrbanEvents] = useState<UrbanEvent[]>([]);
  const [pedestrianHotspots, setPedestrianHotspots] = useState<PedestrianHotspot[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<UrbanEvent | null>(null);
  const [mapCenter, setMapCenter] = useState<GPSCoord>({ lat: 18.5204, lng: 73.8567 });

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('ALL');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [showBuses, setShowBuses] = useState<boolean>(true);
  const [showPedestrianRisk, setShowPedestrianRisk] = useState<boolean>(true);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [busData, eventsData, hotspotsData] = await Promise.all([
        apiService.getBuses(),
        apiService.getRecentUrbanEvents({ limit: 100 }),
        apiService.getPedestrianHotspots().catch(() => []),
      ]);
      setBuses(busData);
      setUrbanEvents(eventsData);
      setPedestrianHotspots(hotspotsData);
      if (eventsData.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsData[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load GIS map data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered UrbanEvents for Map & Inspector
  const filteredEvents = useMemo(() => {
    return urbanEvents.filter((evt) => {
      // Category filter
      if (categoryFilter === 'ROAD_DEFECTS') {
        if (evt.event_type !== 'ROAD_POTHOLE' && evt.event_type !== 'ROAD_CRACK') return false;
      } else if (categoryFilter === 'TRAFFIC') {
        if (evt.event_type !== 'TRAFFIC_CONGESTION' && evt.event_type !== 'VEHICLE_DETECTED') return false;
      } else if (categoryFilter === 'INCIDENTS') {
        if (evt.event_type !== 'PEDESTRIAN_RISK' && evt.event_type !== 'HIT_AND_RUN') return false;
      } else if (categoryFilter === 'ANPR') {
        if (evt.event_type !== 'ANPR_DETECTION') return false;
      }

      // Severity filter
      if (severityFilter !== 'ALL') {
        if (evt.severity !== severityFilter) return false;
      }

      return true;
    });
  }, [urbanEvents, categoryFilter, severityFilter]);

  // Metric counts computed from current loaded UrbanEvents
  const metrics = useMemo(() => {
    const total = urbanEvents.length;
    const highCritical = urbanEvents.filter((e) => e.severity === 'HIGH' || e.severity === 'CRITICAL').length;
    const roadDefects = urbanEvents.filter((e) => e.event_type === 'ROAD_POTHOLE' || e.event_type === 'ROAD_CRACK').length;
    const trafficEvents = urbanEvents.filter((e) => e.event_type === 'TRAFFIC_CONGESTION' || e.event_type === 'VEHICLE_DETECTED').length;
    const anprDetections = urbanEvents.filter((e) => e.event_type === 'ANPR_DETECTION').length;
    const lowReliability = urbanEvents.filter((e) => (e.reliability?.score ?? 1.0) < 0.80).length;

    return { total, highCritical, roadDefects, trafficEvents, anprDetections, lowReliability };
  }, [urbanEvents]);

  const handleSelectEvent = (event: UrbanEvent | null) => {
    setSelectedEvent(event);
    if (event) {
      setMapCenter({ lat: event.gps.latitude, lng: event.gps.longitude });
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const selectedMeta = selectedEvent ? URBAN_EVENT_META[selectedEvent.event_type] || URBAN_EVENT_META.ROAD_POTHOLE : null;
  const selectedSevMeta = selectedEvent ? URBAN_SEVERITY_META[selectedEvent.severity] || URBAN_SEVERITY_META.LOW : null;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header Banner */}
      <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-accent-400" />
              <h1 className="text-xl font-bold tracking-tight text-slate-100 sm:text-2xl">
                Live GIS Map
              </h1>
              <span className="rounded bg-accent-500/20 border border-accent-500/30 px-2 py-0.5 text-[10px] font-mono font-bold text-accent-300 uppercase">
                Geospatial Perception
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400 sm:text-sm max-w-4xl">
              Geospatial monitoring of real-time mobile fleet perceptions, active urban risks, pedestrian hotspots, and bus trajectories across Pune corridors.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-ink-900 px-3 py-1.5 rounded-lg border border-ink-750 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Interactive GIS · 75% Map / 25% Inspector</span>
          </div>
        </div>
      </div>

      {/* 1. Summary Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-ink-700 bg-ink-850 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Events</span>
            <Compass className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-100">{metrics.total}</span>
            <span className="text-[10px] text-slate-500 font-medium">Urban Events</span>
          </div>
        </div>

        <div className="rounded-xl border border-rose-900/30 bg-rose-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">High/Critical</span>
            <ShieldAlert className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-300">{metrics.highCritical}</span>
            <span className="text-[10px] text-rose-400/70 font-medium">Priority alerts</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/30 bg-amber-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Road Defects</span>
            <CircleAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">{metrics.roadDefects}</span>
            <span className="text-[10px] text-amber-400/70 font-medium">Potholes & Cracks</span>
          </div>
        </div>

        <div className="rounded-xl border border-orange-900/30 bg-orange-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-orange-300">Traffic Events</span>
            <TrafficCone className="h-4 w-4 text-orange-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-orange-300">{metrics.trafficEvents}</span>
            <span className="text-[10px] text-orange-400/70 font-medium">Congestion & flow</span>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/20 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">ANPR Detections</span>
            <ScanLine className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-300">{metrics.anprDetections}</span>
            <span className="text-[10px] text-emerald-400/70 font-medium">Plate OCR matches</span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-900/40 bg-amber-950/15 p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Low Reliability</span>
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-300">{metrics.lowReliability}</span>
            <span className="text-[10px] text-amber-400/70 font-medium">&lt; 80% quality</span>
          </div>
        </div>
      </div>

      {/* 2. Map Filter Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-700 bg-ink-850 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 pr-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter className="h-3.5 w-3.5 text-accent-400" />
            <span>Category:</span>
          </div>
          {(
            [
              { key: 'ALL', label: 'All Events' },
              { key: 'ROAD_DEFECTS', label: 'Road Defects' },
              { key: 'TRAFFIC', label: 'Traffic' },
              { key: 'INCIDENTS', label: 'Incidents' },
              { key: 'ANPR', label: 'ANPR' },
            ] as { key: CategoryFilter; label: string }[]
          ).map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(cat.key)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                categoryFilter === cat.key
                  ? 'bg-accent-500/20 border border-accent-400/50 text-accent-300'
                  : 'bg-ink-800/60 border border-ink-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 pr-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <span>Severity:</span>
          </div>
          {(
            [
              { key: 'ALL', label: 'All' },
              { key: 'CRITICAL', label: 'Critical' },
              { key: 'HIGH', label: 'High' },
              { key: 'MEDIUM', label: 'Med' },
              { key: 'LOW', label: 'Low' },
            ] as { key: SeverityFilter; label: string }[]
          ).map((sev) => (
            <button
              key={sev.key}
              onClick={() => setSeverityFilter(sev.key)}
              className={`rounded-lg px-2 py-1 text-xs font-medium transition-all ${
                severityFilter === sev.key
                  ? 'bg-ink-700 border border-slate-400 text-slate-100 font-semibold'
                  : 'bg-ink-900 border border-ink-700 text-slate-500 hover:text-slate-300'
              }`}
            >
              {sev.label}
            </button>
          ))}

          <div className="h-5 w-[1px] bg-ink-700 mx-1 hidden sm:block" />

          {/* Pedestrian Risk Hotspot Layer Toggle */}
          <button
            onClick={() => setShowPedestrianRisk((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              showPedestrianRisk
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                : 'border-ink-700 bg-ink-900 text-slate-500'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Pedestrian Risk</span>
            {showPedestrianRisk ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
          </button>

          {/* Bus Layer Toggle */}
          <button
            onClick={() => setShowBuses((prev) => !prev)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
              showBuses
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                : 'border-ink-700 bg-ink-900 text-slate-500'
            }`}
          >
            <BusIcon className="h-3.5 w-3.5" />
            <span>Buses</span>
            {showBuses ? <Eye className="h-3 w-3 ml-0.5" /> : <EyeOff className="h-3 w-3 ml-0.5" />}
          </button>
        </div>
      </div>

      {/* 3. Main GIS Map & Inspector Section */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        {/* Map View */}
        <div className="xl:col-span-3 space-y-2">
          <MapComponent
            center={mapCenter}
            buses={buses}
            urbanEvents={filteredEvents}
            pedestrianHotspots={pedestrianHotspots}
            selectedUrbanEventId={selectedEvent?.event_id}
            onSelectUrbanEvent={handleSelectEvent}
            showBuses={showBuses}
            showPedestrianRisk={showPedestrianRisk}
            height="620px"
          />
          <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
              <span>All GPS coordinates are generated via <strong>Simulated GPS (Deterministic)</strong></span>
            </div>
            <span>Showing {filteredEvents.length} of {urbanEvents.length} events</span>
          </div>
        </div>

        {/* Event Detail Inspector & Active Legend */}
        <div className="space-y-4">
          {selectedEvent ? (
            <div className="rounded-xl border border-ink-700 bg-ink-850 p-4 shadow-lg space-y-3.5 animate-fade-in">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-ink-700 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-accent-300">
                      {selectedEvent.event_id.replace(/^EVT-DEMO-/, 'EVT-')}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${selectedSevMeta?.bgColor} ${selectedSevMeta?.color} border-current`}
                    >
                      {selectedEvent.severity}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100 mt-1">{selectedMeta?.label}</h3>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="rounded p-1 text-slate-400 hover:bg-ink-800 hover:text-slate-200"
                  title="Close inspector"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Confidence Triad: AI Confidence, Reliability, Operational Confidence */}
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                <div className="rounded-lg bg-ink-900 p-2 border border-ink-750 text-center">
                  <span className="text-[9.5px] text-slate-400 uppercase font-semibold block truncate" title="Raw AI Model Detection Confidence">
                    AI Conf.
                  </span>
                  <div className="font-mono font-bold text-sky-300 mt-0.5">
                    {(selectedEvent.confidence * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-lg bg-ink-900 p-2 border border-ink-750 text-center">
                  <span className="text-[9.5px] text-slate-400 uppercase font-semibold block truncate" title="Observation Quality / Environmental Reliability">
                    Reliability
                  </span>
                  <div className={`font-mono font-bold mt-0.5 ${(selectedEvent.reliability?.score ?? 1.0) >= 0.80 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {((selectedEvent.reliability?.score ?? 0.85) * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="rounded-lg bg-ink-900 p-2 border border-ink-750 text-center">
                  <span className="text-[9.5px] text-slate-400 uppercase font-semibold block truncate" title="Reliability-Adjusted Operational Confidence (<= AI Conf)">
                    Op. Conf.
                  </span>
                  <div className="font-mono font-bold text-accent-300 mt-0.5">
                    {((selectedEvent.operational_confidence ?? selectedEvent.confidence) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Explainability Breakdown: Why was reliability computed as such? */}
              {selectedEvent.reliability && (
                <div className="space-y-1.5 rounded-lg bg-ink-900/70 border border-ink-750 p-2.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <span>Quality Factors (Why?)</span>
                    <span className="text-slate-500 font-normal lowercase">{selectedEvent.reliability.is_measured ? 'measured' : 'default'}</span>
                  </div>
                  
                  {/* Factor badges */}
                  {selectedEvent.reliability.factors && Object.keys(selectedEvent.reliability.factors).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {Object.entries(selectedEvent.reliability.factors).map(([fname, fval]) => (
                        <div key={fname} className="flex items-center gap-1 rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-mono border border-ink-700">
                          <span className="text-slate-400">{fname}:</span>
                          <span className={fval >= 0.8 ? 'text-emerald-400 font-semibold' : fval >= 0.6 ? 'text-amber-400 font-semibold' : 'text-rose-400 font-semibold'}>
                            {(fval * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reasons list */}
                  {selectedEvent.reliability.reasons && (
                    <div className="space-y-1 pt-1 border-t border-ink-800 text-[10.5px]">
                      {selectedEvent.reliability.reasons.map((r, i) => {
                        const isWarn = r.toLowerCase().includes('low') || r.toLowerCase().includes('poor') || r.toLowerCase().includes('glare') || r.toLowerCase().includes('blur');
                        const isUnavail = r.toLowerCase().includes('unavailable') || r.toLowerCase().includes('not measured');
                        return (
                          <div key={i} className="flex items-start gap-1.5 text-slate-300">
                            {isWarn ? (
                              <span className="text-amber-400 font-bold flex-shrink-0">⚠</span>
                            ) : isUnavail ? (
                              <span className="text-slate-500 font-bold flex-shrink-0">—</span>
                            ) : (
                              <span className="text-emerald-400 font-bold flex-shrink-0">✓</span>
                            )}
                            <span className={isUnavail ? 'text-slate-500' : isWarn ? 'text-amber-300/90' : 'text-slate-300'}>{r}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Fleet & Camera Info */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <BusIcon className="h-3.5 w-3.5 text-slate-500" />
                    <span>Bus Identifier</span>
                  </span>
                  <span className="font-mono font-medium text-slate-200">{selectedEvent.bus_id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-slate-500" />
                    <span>Camera Feed</span>
                  </span>
                  <span className="font-mono font-medium text-slate-200">{selectedEvent.camera_id}</span>
                </div>
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>Timestamp</span>
                  </span>
                  <span className="font-medium text-slate-300 text-[11px]">{formatFullTimestamp(selectedEvent.timestamp)}</span>
                </div>
              </div>

              {/* Geographic Coordinates & Simulated Tag */}
              <div className="rounded-lg bg-ink-900/90 border border-ink-750 p-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <MapPin className="h-3.5 w-3.5 text-accent-400" />
                    <span>Coordinates</span>
                  </span>
                  <span className="font-mono text-[11px] text-slate-300">
                    {selectedEvent.gps.latitude.toFixed(5)}, {selectedEvent.gps.longitude.toFixed(5)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-[10.5px] font-semibold text-amber-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <span>Simulated GPS (Deterministic)</span>
                </div>
              </div>

              {/* Detection Metadata */}
              {selectedEvent.detection && Object.keys(selectedEvent.detection).length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Perception Metadata
                  </span>
                  <div className="rounded-lg bg-ink-900 p-2 text-xs font-mono text-slate-300 border border-ink-750 space-y-1 overflow-x-auto">
                    {selectedEvent.detection.class_name && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">class:</span>
                        <span>{selectedEvent.detection.class_name}</span>
                      </div>
                    )}
                    {selectedEvent.detection.bbox && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">bbox:</span>
                        <span>[{selectedEvent.detection.bbox.map((v: number) => Math.round(v)).join(', ')}]</span>
                      </div>
                    )}
                    {selectedEvent.detection.plate_text && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">plate_ocr:</span>
                        <span className="text-emerald-300 font-bold">{selectedEvent.detection.plate_text}</span>
                      </div>
                    )}
                    {selectedEvent.detection.density_level && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">density:</span>
                        <span className="text-orange-300">{selectedEvent.detection.density_level} ({selectedEvent.detection.vehicle_count} veh)</span>
                      </div>
                    )}
                    {selectedEvent.frame_index !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">frame_idx:</span>
                        <span>{selectedEvent.frame_index}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Evidence Reference */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Evidence Reference
                </span>
                <div className="rounded-lg bg-ink-900 p-2 text-[11px] text-slate-400 border border-ink-750 space-y-1">
                  {selectedEvent.evidence.image_path && (
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3 w-3 text-sky-400 flex-shrink-0" />
                      <span className="truncate">{selectedEvent.evidence.image_path}</span>
                    </div>
                  )}
                  {selectedEvent.evidence.video_path && (
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3 w-3 text-purple-400 flex-shrink-0" />
                      <span className="truncate">{selectedEvent.evidence.video_path}</span>
                    </div>
                  )}
                  {selectedEvent.evidence.crop_path && (
                    <div className="flex items-center gap-1.5 truncate">
                      <FileText className="h-3 w-3 text-amber-400 flex-shrink-0" />
                      <span className="truncate">{selectedEvent.evidence.crop_path}</span>
                    </div>
                  )}
                  {!selectedEvent.evidence.image_path && !selectedEvent.evidence.video_path && !selectedEvent.evidence.crop_path && (
                    <span className="text-slate-600 italic">No external media linked</span>
                  )}
                </div>
              </div>

              {/* Event Notes */}
              {selectedEvent.notes && (
                <p className="text-[11px] text-slate-500 italic bg-ink-900/50 p-2 rounded border border-ink-800">
                  {selectedEvent.notes.replace(/^\[DEMO SEED\]\s*/i, '').replace(/^\[DEMO SCHEMA ONLY - NO LIVE INCIDENT\]\s*/i, '')}
                </p>
              )}

              {/* Human Review Status & Link */}
              <div className="rounded-lg bg-ink-900 p-2.5 border border-indigo-500/20 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Human Review</div>
                  <div className="text-xs font-semibold text-indigo-300 mt-0.5">
                    {selectedEvent.status === 'CONFIRMED' ? 'CONFIRMED' : selectedEvent.status === 'DISMISSED' || selectedEvent.status === 'REJECTED' ? 'REJECTED' : 'PENDING'}
                  </div>
                </div>
                <a
                  href="#/review-center"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-indigo-600/80 hover:bg-indigo-600 text-white transition"
                >
                  <ClipboardCheck className="h-3 w-3" />
                  OPEN REVIEW
                </a>
              </div>

              {/* Pan to Event Action */}
              <button
                onClick={() => setMapCenter({ lat: selectedEvent.gps.latitude, lng: selectedEvent.gps.longitude })}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-500 text-white font-medium text-xs py-2 transition"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Pan & Center on Map</span>
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-ink-700 bg-ink-850 p-6 text-center space-y-2">
              <Compass className="h-8 w-8 text-slate-600 mx-auto" />
              <h4 className="text-xs font-semibold text-slate-300">No Event Selected</h4>
              <p className="text-[11px] text-slate-500">
                Click on any map marker to inspect AI detection confidence, observation reliability factors, and operational confidence.
              </p>
            </div>
          )}

          {/* Active Legend */}
          <div className="rounded-xl border border-ink-700 bg-ink-850 p-4">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-semibold text-slate-200">GIS Layer Legend</h3>
            </div>
            <div className="mt-3 space-y-2.5">
              {[
                { label: 'Pedestrian Risk Hotspot', color: 'bg-rose-600', shape: 'rounded-full', icon: Users },
                { label: 'Road Pothole', color: 'bg-rose-500', shape: 'rounded', icon: CircleAlert },
                { label: 'Road Crack / Distress', color: 'bg-amber-500', shape: 'rounded', icon: AlertTriangle },
                { label: 'Traffic Congestion', color: 'bg-orange-500', shape: 'rounded-full', icon: TrafficCone },
                { label: 'Vehicle Tracking', color: 'bg-sky-500', shape: 'rounded-full', icon: Car },
                { label: 'Pedestrian Proximity', color: 'bg-yellow-500', shape: 'rounded-full', icon: UserX },
                { label: 'ANPR Recognition', color: 'bg-emerald-500', shape: 'rounded-full', icon: ScanLine },
                { label: 'Hit & Run (Schema)', color: 'bg-rose-700', shape: 'rounded-full', icon: Flame },
                { label: 'Active Bus Marker', color: 'bg-emerald-400', shape: 'rounded-full', icon: BusIcon },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2.5 text-xs">
                  <div className={`h-4 w-4 ${item.color} ${item.shape} flex items-center justify-center border border-ink-950`}>
                    <item.icon className="h-2.5 w-2.5 text-ink-950" />
                  </div>
                  <span className="text-slate-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

