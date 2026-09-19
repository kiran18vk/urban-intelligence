import React, { useState, useEffect } from 'react';
import {
  Layers,
  Users,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  MapPin,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
  Car,
  FileText,
  Activity,
  Flame,
  CheckCircle2,
  Sliders,
  Sparkles,
  ArrowRight,
  Eye,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { apiService } from '@/services/api';
import type {
  CorrelatedEvent,
  CorrelationSummary,
  CorrelationLevel,
  CorrelationSourceAudit,
} from '@/types';

export const EventCorrelationPage: React.FC = () => {
  const [summary, setSummary] = useState<CorrelationSummary | null>(null);
  const [events, setEvents] = useState<CorrelatedEvent[]>([]);
  const [selectedCorrelation, setSelectedCorrelation] = useState<CorrelatedEvent | null>(null);
  const [sourceAudit, setSourceAudit] = useState<CorrelationSourceAudit | null>(null);
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [busSearch, setBusSearch] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecomputing, setIsRecomputing] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Load correlation summary and filtered events
  const loadData = async () => {
    try {
      const [sumData, evtsData] = await Promise.all([
        apiService.getCorrelationSummary(),
        apiService.getCorrelatedEvents({
          event_type: selectedEventType,
          correlation_level: selectedLevel,
          status: selectedStatus,
          bus_id: busSearch,
          severity: selectedSeverity,
        }),
      ]);
      setSummary(sumData);
      setEvents(evtsData);

      // Default select the first event if none selected
      if (!selectedCorrelation && evtsData.length > 0) {
        setSelectedCorrelation(evtsData[0]);
      } else if (selectedCorrelation) {
        const updated = evtsData.find((e) => e.correlation_id === selectedCorrelation.correlation_id);
        if (updated) setSelectedCorrelation(updated);
      }
    } catch (err) {
      console.error('Failed to load correlation data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventType, selectedLevel, selectedSeverity, selectedStatus, busSearch]);

  // Load audit details when selection changes
  useEffect(() => {
    if (!selectedCorrelation) {
      setSourceAudit(null);
      return;
    }
    const loadAudit = async () => {
      try {
        const audit = await apiService.getSourceEventsForCorrelation(selectedCorrelation.correlation_id);
        setSourceAudit(audit);
      } catch (err) {
        console.warn('Failed to load source event audit:', err);
      }
    };
    loadAudit();
  }, [selectedCorrelation]);

  const handleRecompute = async () => {
    setIsRecomputing(true);
    try {
      const res = await apiService.recomputeCorrelations();
      setActionFeedback(res.message || 'Correlations recomputed across all active source events.');
      await loadData();
    } catch (err) {
      console.error('Failed to recompute:', err);
      setActionFeedback('Recomputation failed.');
    } finally {
      setIsRecomputing(false);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleCreateAuthorityAction = async () => {
    if (!selectedCorrelation) return;
    try {
      const created = await apiService.createAuthorityAction({
        target_id: selectedCorrelation.correlation_id,
        target_type: 'CORRELATED_EVENT',
        event_type: selectedCorrelation.event_type,
        title: `Corroborated Action: ${selectedCorrelation.event_type.replace(/_/g, ' ')} (${selectedCorrelation.correlation_id})`,
        description: `Corroborated across ${selectedCorrelation.independent_bus_count} buses (${selectedCorrelation.bus_ids.join(', ')}). ${selectedCorrelation.explanation?.statement || 'Correlated urban issue.'}`,
        severity: (selectedCorrelation.severity as any) || 'MEDIUM',
        correlation_id: selectedCorrelation.correlation_id,
        source_bus_ids: selectedCorrelation.bus_ids,
        latitude: selectedCorrelation.latitude ?? selectedCorrelation.canonical_location?.latitude ?? 18.5204,
        longitude: selectedCorrelation.longitude ?? selectedCorrelation.canonical_location?.longitude ?? 73.8567,
        operational_confidence: selectedCorrelation.max_operational_confidence ?? selectedCorrelation.average_operational_confidence ?? 0.85,
        reliability: selectedCorrelation.average_reliability,
        simulated_gps: true,
        action_type: selectedCorrelation.event_type.includes('POTHOLE') || selectedCorrelation.event_type.includes('CRACK')
          ? 'REPAIR'
          : selectedCorrelation.event_type.includes('PEDESTRIAN')
          ? 'SAFETY_INTERVENTION'
          : selectedCorrelation.event_type.includes('CONGESTION')
          ? 'TRAFFIC_CONTROL'
          : 'INSPECT',
        assigned_team: selectedCorrelation.event_type.includes('PEDESTRIAN')
          ? 'Public Safety'
          : selectedCorrelation.event_type.includes('CONGESTION')
          ? 'Traffic Operations'
          : 'Road Maintenance',
      });
      setActionFeedback(`Authority Action ${created.action_id} created successfully. Redirecting to Action Center...`);
      setTimeout(() => {
        window.location.hash = '#/authority-actions';
      }, 1000);
    } catch (err: any) {
      alert(`Failed to create authority action: ${err.message || 'Error'}`);
    }
  };

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'MULTI_BUS_CONSENSUS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MULTI_BUS_CORROBORATION':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'SINGLE_BUS_OBSERVATION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  const getSeverityBadgeClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      default:
        return 'bg-secondary text-muted-foreground border-border';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Layers className="h-6 w-6 text-primary" />
              Generic Multi-Bus Event Correlation
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/30">
              Spatial-Temporal Corroboration Engine
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Correlates discrete transit bus observations into unified, traceable urban issues based on spatial-temporal proximity and independent-bus corroboration.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRecompute}
            disabled={isRecomputing}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRecomputing ? 'animate-spin' : ''}`} />
            {isRecomputing ? 'RECOMPUTING...' : 'RECOMPUTE CLUSTERS'}
          </button>
        </div>
      </div>

      {/* Action Feedback Notification */}
      {actionFeedback && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30 text-primary text-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="font-medium">{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback(null)} className="text-xs text-muted-foreground hover:text-foreground">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Top Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>TOTAL CORRELATED</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-foreground">
            {summary?.total_correlated_events || events.length} Correlated Issues
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Deduplicated condition clusters</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>3+ BUS CONSENSUS</span>
            <Users className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">
            {summary?.multi_bus_consensus || 0} Issues
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">High corroboration confidence</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>2-BUS CORROBORATION</span>
            <CheckCircle2 className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-blue-400">
            {summary?.multi_bus_corroborated || 0} Issues
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Moderate corroboration strength</div>
        </div>

        <div className="bg-card/70 backdrop-blur-sm border border-border p-3.5 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>AVG INDEPENDENT BUSES</span>
            <TrendingUp className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-cyan-400">
            {summary?.average_independent_buses || 2.25} Buses / Issue
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">Independent corroboration depth</div>
        </div>
      </div>

      {/* 3. Filters Toolbar */}
      <div className="bg-card border border-border p-3.5 rounded-xl flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
          <Filter className="h-3.5 w-3.5" />
          <span>Filters:</span>
        </div>

        {/* Event Type Filter */}
        <select
          value={selectedEventType}
          onChange={(e) => setSelectedEventType(e.target.value)}
          className="bg-secondary text-foreground px-2.5 py-1.5 rounded-lg border border-border focus:outline-none"
        >
          <option value="ALL">All Event Types</option>
          <option value="ROAD_POTHOLE">Road Pothole</option>
          <option value="ROAD_CRACK">Road Crack</option>
          <option value="TRAFFIC_CONGESTION">Traffic Congestion</option>
          <option value="PEDESTRIAN_RISK">Pedestrian Risk</option>
          <option value="HIT_AND_RUN">Hit & Run Suspect</option>
          <option value="ANPR_DETECTION">Plate Observation</option>
        </select>

        {/* Correlation Level Filter */}
        <select
          value={selectedLevel}
          onChange={(e) => setSelectedLevel(e.target.value)}
          className="bg-secondary text-foreground px-2.5 py-1.5 rounded-lg border border-border focus:outline-none"
        >
          <option value="ALL">All Corroboration Levels</option>
          <option value="MULTI_BUS_CONSENSUS">Multi-Bus Consensus (3+ buses)</option>
          <option value="MULTI_BUS_CORROBORATION">Multi-Bus Corroboration (2 buses)</option>
          <option value="SINGLE_BUS_OBSERVATION">Single Bus Observation (1 bus)</option>
        </select>

        {/* Severity Filter */}
        <select
          value={selectedSeverity}
          onChange={(e) => setSelectedSeverity(e.target.value)}
          className="bg-secondary text-foreground px-2.5 py-1.5 rounded-lg border border-border focus:outline-none"
        >
          <option value="ALL">All Severities</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-secondary text-foreground px-2.5 py-1.5 rounded-lg border border-border focus:outline-none"
        >
          <option value="ALL">All Lifecycle Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="AGING">Aging</option>
          <option value="STALE">Stale</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        {/* Bus Search */}
        <div className="relative ml-auto">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bus (e.g. PMP-BUS-001)..."
            value={busSearch}
            onChange={(e) => setBusSearch(e.target.value)}
            className="bg-secondary text-foreground pl-8 pr-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none w-52"
          />
        </div>
      </div>

      {/* 4. Main Two-Column Master-Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Correlated Events List (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span className="font-semibold uppercase tracking-wider">Correlated Urban Issues ({events.length})</span>
            <span>Spatial Radius: 150m</span>
          </div>

          <div className="space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
            {events.length > 0 ? (
              events.map((ev) => {
                const isSelected = selectedCorrelation?.correlation_id === ev.correlation_id;
                const levelBadge = getLevelBadgeClass(ev.correlation_level);
                const sevBadge = getSeverityBadgeClass(ev.severity);

                return (
                  <div
                    key={ev.correlation_id}
                    onClick={() => setSelectedCorrelation(ev)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 border-primary shadow-md ring-1 ring-primary/40'
                        : 'bg-card border-border hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-foreground">{ev.correlation_id}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sevBadge}`}>
                          {ev.severity}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelBadge}`}>
                        {ev.correlation_level.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="text-sm font-semibold text-foreground mb-1 flex items-center justify-between">
                      <span>{ev.event_type.replace(/_/g, ' ')}</span>
                      {ev.road_id && (
                        <span className="text-xs font-mono font-normal text-muted-foreground">
                          {ev.road_id}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-muted-foreground mt-2 border-t border-border/50 pt-2">
                      <div className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span>{ev.independent_bus_count} Buses ({ev.observation_count} obs)</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end">
                        <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
                        <span>Rel: {Math.round(ev.average_reliability * 100)}%</span>
                      </div>
                    </div>

                    {/* Bus ID Badges */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {ev.bus_ids.map((b) => (
                        <span key={b} className="text-[10px] font-mono px-1.5 py-0.5 bg-secondary rounded border border-border/60 text-foreground">
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-card border border-border rounded-xl text-xs text-muted-foreground">
                No correlated events match the selected criteria.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Correlation Inspector & Source Evidence Graph (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCorrelation ? (
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3.5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-base font-bold text-foreground font-mono">
                      {selectedCorrelation.correlation_id}
                    </h2>
                    <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getLevelBadgeClass(selectedCorrelation.correlation_level)}`}>
                      {selectedCorrelation.correlation_level.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      Status: <span className="text-emerald-400 font-semibold">{selectedCorrelation.status}</span>
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-primary mt-1">
                    {selectedCorrelation.event_type.replace(/_/g, ' ')}
                  </div>
                </div>

                {/* Quick Cross-Navigation Links & Action Creation */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateAuthorityAction}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" /> Action
                  </button>
                  <a
                    href="#/map"
                    className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors flex items-center gap-1"
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" /> GIS Map
                  </a>
                  {selectedCorrelation.road_id && (
                    <a
                      href="#/digital-twin"
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors flex items-center gap-1"
                    >
                      <Sliders className="h-3.5 w-3.5 text-emerald-400" /> Digital Twin
                    </a>
                  )}
                  {selectedCorrelation.event_type.includes('PEDESTRIAN') && (
                    <a
                      href="#/pedestrian-safety"
                      className="px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 text-foreground text-xs font-medium border border-border transition-colors flex items-center gap-1"
                    >
                      <Flame className="h-3.5 w-3.5 text-rose-400" /> Safety
                    </a>
                  )}
                </div>
              </div>

              {/* 1. WHY THIS EVENT WAS CORRELATED (Auditable Explanation) */}
              <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide">
                    Why This Urban Issue Was Correlated
                  </h3>
                </div>

                <div className="text-sm font-semibold text-foreground">
                  {selectedCorrelation.explanation.statement}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-muted-foreground pt-1 border-t border-border/50">
                  <div>Spatial Proximity: <span className="text-foreground">{selectedCorrelation.explanation.spatial_proximity}</span></div>
                  <div>Temporal Window: <span className="text-foreground">{selectedCorrelation.explanation.temporal_window}</span></div>
                  <div>Independent Confirmations: <span className="text-primary font-bold">{selectedCorrelation.independent_bus_count} distinct buses</span></div>
                  <div>Corroboration Strength: <span className="text-cyan-400 font-bold">{selectedCorrelation.correlation_strength * 100}%</span></div>
                </div>

                {selectedCorrelation.explanation.pedestrian_note && (
                  <div className="text-xs text-rose-300 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                    {selectedCorrelation.explanation.pedestrian_note}
                  </div>
                )}
              </div>

              {/* 2. Multi-Bus Observation Traceability Visual */}
              <div className="p-4 rounded-xl bg-secondary/20 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Independent Fleet Corroboration Traceability
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {selectedCorrelation.independent_bus_count} unique buses • {selectedCorrelation.observation_count} observations
                  </span>
                </div>

                {/* CSS Node Diagram */}
                <div className="p-3 bg-background/60 rounded-lg border border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex flex-wrap sm:flex-col gap-1.5">
                    {selectedCorrelation.bus_ids.map((bId) => (
                      <div key={bId} className="px-2.5 py-1 rounded bg-secondary border border-border text-foreground font-semibold">
                        {bId}
                      </div>
                    ))}
                  </div>

                  <div className="hidden sm:flex flex-col items-center justify-center text-muted-foreground text-[10px]">
                    <span>Haversine $\le$ 150m</span>
                    <ArrowRight className="h-4 w-4 text-primary my-0.5" />
                    <span>Temporal Match</span>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/40 text-center">
                    <div className="font-bold text-primary">{selectedCorrelation.correlation_id}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {selectedCorrelation.correlation_level.replace(/_/g, ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Source Observations Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider">Source Observations ({selectedCorrelation.source_event_ids.length})</span>
                  <span>Auditable Event IDs</span>
                </div>

                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {sourceAudit?.source_events && sourceAudit.source_events.length > 0 ? (
                    sourceAudit.source_events.map((src, idx) => (
                      <div
                        key={src.event_id || idx}
                        className="p-2.5 rounded-lg bg-secondary/30 border border-border text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{src.bus_id}</span>
                          <span className="text-muted-foreground">|</span>
                          <span className="font-mono text-muted-foreground">{src.event_id}</span>
                        </div>
                        <div className="flex items-center gap-3 font-mono text-[11px]">
                          <span>Conf: {src.confidence || selectedCorrelation.max_raw_confidence}</span>
                          <span className="text-cyan-400">Rel: {src.reliability?.score || selectedCorrelation.average_reliability}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    selectedCorrelation.source_event_ids.map((id, idx) => (
                      <div key={id} className="p-2.5 rounded-lg bg-secondary/30 border border-border text-xs flex items-center justify-between">
                        <span className="font-mono text-primary">{selectedCorrelation.bus_ids[idx % selectedCorrelation.bus_ids.length]}</span>
                        <span className="font-mono text-foreground">{id}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* 4. Confidence & Reliability Metrics Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border text-xs font-mono">
                <div className="p-2 rounded bg-secondary/20 border border-border/60">
                  <div className="text-muted-foreground text-[10px]">MAX RAW CONF</div>
                  <div className="font-bold text-foreground mt-0.5">{selectedCorrelation.max_raw_confidence}</div>
                </div>
                <div className="p-2 rounded bg-secondary/20 border border-border/60">
                  <div className="text-muted-foreground text-[10px]">MAX OP CONF</div>
                  <div className="font-bold text-primary mt-0.5">{selectedCorrelation.max_operational_confidence}</div>
                </div>
                <div className="p-2 rounded bg-secondary/20 border border-border/60">
                  <div className="text-muted-foreground text-[10px]">AVG OP CONF</div>
                  <div className="font-bold text-foreground mt-0.5">{selectedCorrelation.average_operational_confidence}</div>
                </div>
                <div className="p-2 rounded bg-secondary/20 border border-border/60">
                  <div className="text-muted-foreground text-[10px]">AVG RELIABILITY</div>
                  <div className="font-bold text-cyan-400 mt-0.5">{Math.round(selectedCorrelation.average_reliability * 100)}%</div>
                </div>
              </div>

            </div>
          ) : (
            <div className="p-12 text-center bg-card border border-border rounded-xl text-muted-foreground">
              Select a correlated event from the list to view detailed corroboration analysis.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default EventCorrelationPage;
