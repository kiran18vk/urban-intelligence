import { useEffect, useRef, useState } from 'react';
import { Map as MaplibreMap, Marker, Popup, NavigationControl, ScaleControl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GPSCoord, MapFilter, UrbanEvent } from '@/types';
import type { Bus, DetectionEvent, RoadDefect, TrafficCongestion, Incident } from '@/types';
import {
  EVENT_META,
  SEVERITY_META,
  URBAN_EVENT_META,
  URBAN_SEVERITY_META,
  formatFullTimestamp,
} from '@/lib/eventMeta';
import {
  Bus as BusIcon,
  CircleAlert,
  Droplets,
  TrafficCone,
  Car,
  Search,
  MapPin,
  X,
  Loader2,
  Navigation,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { searchLocations, type LocationSearchResult } from '@/lib/locationSearch';

interface MapComponentProps {
  center?: GPSCoord;
  zoom?: number;
  buses?: Bus[];
  events?: DetectionEvent[];
  defects?: RoadDefect[];
  congestion?: TrafficCongestion[];
  incidents?: Incident[];
  urbanEvents?: UrbanEvent[];
  selectedUrbanEventId?: string | null;
  onSelectUrbanEvent?: (event: UrbanEvent | null) => void;
  filters?: MapFilter;
  showBuses?: boolean;
  className?: string;
  height?: string;
}

const DEFAULT_CENTER = { lat: 18.5204, lng: 73.8567 };

// Vector basemap style from OpenFreeMap (Liberty style)
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

// Helper to safely extract [lng, lat] from any coordinate format
function getLngLat(obj: any): [number, number] | null {
  if (!obj) return null;
  const loc = obj.location ?? obj.gps ?? obj;
  if (!loc) return null;

  const rawLng = loc.lng ?? loc.longitude ?? loc.lon ?? loc.long;
  const rawLat = loc.lat ?? loc.latitude;

  const lng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng);
  const lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);

  if (!isNaN(lng) && !isNaN(lat)) {
    return [lng, lat];
  }
  return null;
}

export function MapComponent({
  center = DEFAULT_CENTER,
  zoom = 12,
  buses = [],
  events = [],
  defects = [],
  congestion = [],
  incidents = [],
  urbanEvents,
  selectedUrbanEventId,
  onSelectUrbanEvent,
  filters,
  showBuses = true,
  className = '',
  height = '500px',
}: MapComponentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Geographic Location Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeLocationLabel, setActiveLocationLabel] = useState<string | null>(null);
  const [searchNotice, setSearchNotice] = useState<string | null>(null);

  // Initialize MapLibre map with OpenFreeMap vector style
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenterCoords = getLngLat(center) || [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat];

    const map = new MaplibreMap({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: initialCenterCoords,
      zoom: zoom || 12,
      attributionControl: { compact: true },
      dragPan: true,
      scrollZoom: true,
      doubleClickZoom: true,
      boxZoom: true,
      dragRotate: true,
      touchZoomRotate: true,
      trackResize: true,
    });

    map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new ScaleControl({ maxWidth: 200, unit: 'metric' }), 'bottom-left');

    // Robust style & map load lifecycle handling
    const markReady = () => {
      setMapReady(true);
      setMapError(null);
      try {
        map.resize();
      } catch (err) {
        console.warn('[MapComponent] resize warning:', err);
      }
    };

    if (map.isStyleLoaded()) {
      markReady();
    }

    map.once('load', markReady);
    map.once('style.load', markReady);
    map.on('styledata', () => {
      if (map.isStyleLoaded()) {
        markReady();
      }
    });

    // Map error listener
    map.on('error', (e: any) => {
      const errMsg = e.error?.message || e.message || 'Map rendering notice';
      console.warn('[MapComponent] MapLibre notice:', errMsg);
      if (!map.isStyleLoaded()) {
        setMapError(errMsg);
      }
    });

    // Fallback safety timer (3.5s max wait)
    const fallbackTimer = setTimeout(() => {
      if (!mapReady && containerRef.current) {
        markReady();
      }
    }, 3500);

    // Auto-resize observer to handle container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) {
          try {
            mapRef.current.resize();
          } catch (e) {
            void e;
          }
        }
      });
      resizeObserver.observe(containerRef.current);
    }

    mapRef.current = map;

    return () => {
      clearTimeout(fallbackTimer);
      if (resizeObserver) resizeObserver.disconnect();
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Pan to center when center coordinates change
  useEffect(() => {
    if (!mapRef.current || !center) return;
    const centerCoords = getLngLat(center);
    if (!centerCoords) return;

    mapRef.current.flyTo({
      center: centerCoords,
      zoom: zoom ?? mapRef.current.getZoom(),
      essential: true,
      duration: 1000,
    });
  }, [center?.lat, center?.lng, zoom]);

  // Execute Geographic Location Search (on Enter or Search click)
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchNotice(null);
    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);

      if (results.length > 0) {
        setShowSuggestions(true);
        selectLocation(results[0]);
      } else {
        setSearchNotice(`No geographic location found for "${searchQuery.trim()}".`);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Search failed:', err);
      setSearchNotice('Location search temporarily unavailable.');
    } finally {
      setIsSearching(false);
    }
  };

  // Fly MapLibre viewport to selected geographic location
  const selectLocation = (loc: LocationSearchResult) => {
    if (!mapRef.current) return;

    mapRef.current.flyTo({
      center: [loc.lng, loc.lat],
      zoom: 13,
      duration: 1200,
      essential: true,
    });

    setActiveLocationLabel(loc.label);
    setShowSuggestions(false);
    setSearchNotice(null);
  };

  // Update MapLibre custom markers & overlays
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    const map = mapRef.current;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const showBusMarkers = showBuses && (!filters || filters.buses);

    // 1. Bus Markers
    if (showBusMarkers) {
      buses.forEach((bus) => {
        const coords = getLngLat(bus);
        if (!coords) return;

        const el = document.createElement('div');
        el.innerHTML = renderToString(
          <div style={{ width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: bus.status === 'active' ? '#10b981' : bus.status === 'idle' ? '#f59e0b' : '#f43f5e',
                border: '2px solid #0a0f1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: bus.status === 'active' ? '0 0 8px rgba(16,185,129,0.6)' : 'none',
              }}
            >
              <BusIcon size={12} color="#0a0f1a" />
            </div>
          </div>
        );
        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .setPopup(
            new Popup({ offset: 16 }).setHTML(
              `<div style="font-family:Inter,sans-serif">
                <div style="font-weight:600;font-size:13px;color:#e2e8f0;margin-bottom:4px">${bus.id}</div>
                <div style="font-size:12px;color:#94a3b8">${bus.route}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:4px">Driver: ${bus.driver} | Speed: ${bus.speed} km/h</div>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // 2. Primary Perception UrbanEvents
    if (urbanEvents && urbanEvents.length > 0) {
      urbanEvents.forEach((evt) => {
        const coords = getLngLat(evt);
        if (!coords) return;

        const meta = URBAN_EVENT_META[evt.event_type] || URBAN_EVENT_META.ROAD_POTHOLE;
        const sevMeta = URBAN_SEVERITY_META[evt.severity] || URBAN_SEVERITY_META.LOW;
        const isSelected = evt.event_id === selectedUrbanEventId;
        const IconComp = meta.icon;

        const el = document.createElement('div');
        el.style.cursor = 'pointer';
        el.innerHTML = renderToString(
          <div
            style={{
              width: isSelected ? '34px' : '26px',
              height: isSelected ? '34px' : '26px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
          >
            <div
              style={{
                width: isSelected ? '28px' : '20px',
                height: isSelected ? '28px' : '20px',
                borderRadius: evt.event_type === 'ROAD_POTHOLE' || evt.event_type === 'ROAD_CRACK' ? '5px' : '50%',
                background: meta.markerBg,
                border: `2px solid ${isSelected ? '#38bdf8' : sevMeta.borderHex}`,
                boxShadow: isSelected
                  ? `0 0 0 3px rgba(56,189,248,0.5), 0 0 12px ${meta.markerBg}`
                  : `0 0 6px ${sevMeta.borderHex}60`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IconComp size={isSelected ? 14 : 10} color="#0a0f1a" />
            </div>
          </div>
        );

        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelectUrbanEvent?.(evt);
        });

        const popupContent = `
          <div style="font-family:Inter,system-ui,sans-serif;padding:3px;min-width:210px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;gap:6px;">
              <span style="font-weight:700;font-size:12px;color:#f8fafc;">${meta.label}</span>
              <span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:${sevMeta.borderHex}25;color:${sevMeta.borderHex};border:1px solid ${sevMeta.borderHex}50;">${evt.severity}</span>
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Confidence: <span style="font-weight:600;color:#e2e8f0;">${(evt.confidence * 100).toFixed(1)}%</span></div>
            <div style="font-size:11px;color:#94a3b8;margin-bottom:3px;">Bus: <span style="font-family:monospace;color:#e2e8f0;">${evt.bus_id}</span> | Cam: <span style="font-family:monospace;color:#e2e8f0;">${evt.camera_id}</span></div>
            <div style="font-size:10px;color:#64748b;margin-bottom:6px;">${formatFullTimestamp(evt.timestamp)}</div>
            <div style="display:inline-block;padding:2px 6px;border-radius:4px;font-size:9.5px;font-weight:600;background:rgba(245,158,11,0.15);color:#fbbf24;border:1px solid rgba(245,158,11,0.35);">
              Simulated GPS (Deterministic)
            </div>
          </div>
        `;

        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .setPopup(new Popup({ offset: 14 }).setHTML(popupContent))
          .addTo(map);

        markersRef.current.push(marker);
      });

      return;
    }

    // 3. Fallback Legacy Markers
    const showAll = !filters;

    // Road defects
    const potholeEvents = events.filter((e) => e.type === 'pothole');
    const defectItems = [...defects, ...potholeEvents];
    if (showAll || filters?.potholes) {
      defectItems.forEach((item) => {
        const coords = getLngLat(item);
        if (!coords) return;

        const el = document.createElement('div');
        el.innerHTML = renderToString(
          <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '3px',
                background: '#f59e0b',
                border: '1.5px solid #0a0f1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CircleAlert size={10} color="#0a0f1a" />
            </div>
          </div>
        );
        const label = 'type' in item && item.type === 'pothole' ? 'Pothole' : 'Defect';
        const address = 'address' in item ? item.address : '';
        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .setPopup(
            new Popup({ offset: 12 }).setHTML(
              `<div style="font-family:Inter,sans-serif">
                <div style="font-weight:600;font-size:13px;color:#fbbf24;margin-bottom:2px">${label}</div>
                <div style="font-size:12px;color:#94a3b8">${address}</div>
                <div style="font-size:11px;color:#64748b;margin-top:2px">${'id' in item ? item.id : ''}</div>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Waterlogging
    const waterEvents = events.filter((e) => e.type === 'waterlogging');
    if (showAll || filters?.waterlogging) {
      waterEvents.forEach((item) => {
        const coords = getLngLat(item);
        if (!coords) return;

        const el = document.createElement('div');
        el.innerHTML = renderToString(
          <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '50%',
                background: '#3b82f6',
                border: '1.5px solid #0a0f1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Droplets size={10} color="#0a0f1a" />
            </div>
          </div>
        );
        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .setPopup(
            new Popup({ offset: 12 }).setHTML(
              `<div style="font-family:Inter,sans-serif">
                <div style="font-weight:600;font-size:13px;color:#60a5fa;margin-bottom:2px">Waterlogging</div>
                <div style="font-size:12px;color:#94a3b8">${item.address || ''}</div>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Congestion
    if (showAll || filters?.congestion) {
      congestion.forEach((c) => {
        const coords = getLngLat(c);
        if (!coords) return;

        const el = document.createElement('div');
        const sevColor = (c.severity && SEVERITY_META[c.severity]?.dotColor) || '#fb923c';
        el.innerHTML = renderToString(
          <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '4px',
                background: sevColor,
                opacity: 0.7,
                border: '1.5px solid #0a0f1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <TrafficCone size={12} color="#0a0f1a" />
            </div>
          </div>
        );
        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .setPopup(
            new Popup({ offset: 12 }).setHTML(
              `<div style="font-family:Inter,sans-serif">
                <div style="font-weight:600;font-size:13px;color:#fb923c;margin-bottom:2px">Traffic Congestion</div>
                <div style="font-size:12px;color:#94a3b8">${c.roadName || ''}, ${c.area || ''}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">Avg Speed: ${c.avgSpeed ?? '--'} km/h | Queue: ${c.queueLength ?? '--'}m</div>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }

    // Incidents
    if (showAll || filters?.incidents) {
      incidents.forEach((inc) => {
        const coords = getLngLat(inc);
        if (!coords) return;

        const el = document.createElement('div');
        el.innerHTML = renderToString(
          <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: '#f43f5e',
                border: '2px solid #0a0f1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 10px rgba(244,63,94,0.5)',
              }}
            >
              <Car size={12} color="#0a0f1a" />
            </div>
          </div>
        );
        const meta = (inc.type && EVENT_META[inc.type]) || EVENT_META.accident;
        const marker = new Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .setPopup(
            new Popup({ offset: 14 }).setHTML(
              `<div style="font-family:Inter,sans-serif">
                <div style="font-weight:600;font-size:13px;color:#fb7185;margin-bottom:2px">${meta.label || 'Incident'}</div>
                <div style="font-size:12px;color:#94a3b8">${inc.address || ''}</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">Plate: ${inc.vehiclePlate || (inc as any).plate_text || 'N/A'} | Status: ${inc.status}</div>
              </div>`
            )
          )
          .addTo(map);
        markersRef.current.push(marker);
      });
    }
  }, [
    mapReady,
    buses,
    events,
    defects,
    congestion,
    incidents,
    urbanEvents,
    selectedUrbanEventId,
    filters,
    showBuses,
    onSelectUrbanEvent,
  ]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-ink-700 bg-ink-950 ${className}`} style={{ height }}>
      {/* Separate Geographic Location Search Bar */}
      <div className="absolute top-3 left-3 right-14 z-20 max-w-md">
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search location, city, area (e.g. Mumbai, Delhi, 18.52, 73.85)..."
              className="w-full rounded-xl border border-ink-700 bg-ink-900/90 py-2 pl-9 pr-16 text-xs text-slate-100 placeholder-slate-500 backdrop-blur-md transition-all focus:border-accent-400 focus:bg-ink-900 focus:outline-none focus:ring-1 focus:ring-accent-400 shadow-lg"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setShowSuggestions(false);
                  setSearchNotice(null);
                }}
                className="absolute right-9 rounded p-0.5 text-slate-400 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 rounded-lg bg-accent-600 hover:bg-accent-500 px-2.5 py-1 text-[11px] font-semibold text-white transition disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Search'}
            </button>
          </div>
        </form>

        {/* Search Results Suggestions Dropdown */}
        {showSuggestions && searchResults.length > 0 && (
          <div className="mt-1.5 overflow-hidden rounded-xl border border-ink-700 bg-ink-900/95 p-1 shadow-2xl backdrop-blur-md">
            {searchResults.map((res, idx) => (
              <button
                key={idx}
                onClick={() => selectLocation(res)}
                className="flex w-full items-start gap-2 rounded-lg p-2 text-left transition hover:bg-ink-800"
              >
                <MapPin className="h-4 w-4 shrink-0 text-accent-400 mt-0.5" />
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-slate-200 truncate">{res.label}</p>
                  <p className="text-[10px] text-slate-400 truncate">{res.address}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Active Searched Location Indicator */}
        {activeLocationLabel && (
          <div className="mt-1.5 flex items-center justify-between rounded-lg bg-accent-500/15 border border-accent-400/40 px-2.5 py-1 text-[11px] font-semibold text-accent-300">
            <span className="flex items-center gap-1.5 truncate">
              <Navigation className="h-3 w-3 text-accent-400 shrink-0" />
              <span className="truncate">{activeLocationLabel}</span>
            </span>
            <button
              onClick={() => setActiveLocationLabel(null)}
              className="text-accent-400/70 hover:text-accent-300 ml-1"
              title="Reset location view"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Search Notice / No Results Feedback */}
        {searchNotice && (
          <div className="mt-1.5 flex items-center justify-between rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] text-amber-300">
            <span>{searchNotice}</span>
            <button onClick={() => setSearchNotice(null)} className="text-amber-400/70 hover:text-amber-300">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* MapLibre Container */}
      <div ref={containerRef} className="h-full w-full" />

      {/* Loading overlay */}
      {!mapReady && !mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink-950/80 backdrop-blur-sm z-30">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-accent-400" />
            <p className="text-xs font-medium text-slate-400">Loading OpenFreeMap vector basemap...</p>
          </div>
        </div>
      )}

      {/* Real MapLibre Error & Retry Handling */}
      {mapError && !mapReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink-950/95 p-6 text-center z-30 border border-ink-700">
          <div className="max-w-md space-y-3 rounded-2xl border border-rose-900/40 bg-rose-950/20 p-6 backdrop-blur-md">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-400" />
            <h4 className="text-sm font-bold text-slate-200">Map basemap could not be loaded.</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{mapError}</p>
            <button
              onClick={() => {
                setMapError(null);
                setMapReady(false);
                if (mapRef.current) {
                  try {
                    mapRef.current.setStyle(OPENFREEMAP_STYLE);
                  } catch (e) {
                    void e;
                  }
                }
              }}
              className="mt-2 inline-flex items-center gap-2 rounded-lg bg-accent-600 hover:bg-accent-500 px-4 py-2 text-xs font-semibold text-white transition shadow-md"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry Loading Map</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
