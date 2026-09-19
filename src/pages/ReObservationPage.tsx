import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  Bus,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Camera,
  Layers,
  Sparkles,
  Info,
  ChevronRight,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { api } from '@/services/api';
import { MapComponent } from '@/components/Map/MapComponent';
import type {
  ReObservation,
  ReObservationSummary,
  ReObservationHistoryEntry,
  ReObservationOutcome,
  ReObservationVerificationStatus,
} from '@/types';

export const ReObservationPage: React.FC = () => {
  const [summary, setSummary] = useState<ReObservationSummary | null>(null);
  const [queueItems, setQueueItems] = useState<ReObservation[]>([]);
  const [selectedReObs, setSelectedReObs] = useState<ReObservation | null>(null);
  const [history, setHistory] = useState<ReObservationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [outcomeFilter, setOutcomeFilter] = useState<string>('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & Action States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<'verify' | 'escalate' | 'request_another' | null>(null);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [operatorId, setOperatorId] = useState<string>('operator-01');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, queueRes] = await Promise.all([
        api.getReObservationSummary(),
        api.getReObservationQueue({
          outcome: outcomeFilter,
          target_type: targetTypeFilter,
          verification_status: statusFilter,
          bus_id: busFilter,
          search: searchTerm,
        }),
      ]);
      setSummary(sumRes);
      setQueueItems(queueRes.items);

      if (queueRes.items.length > 0) {
        if (!selectedReObs) {
          setSelectedReObs(queueRes.items[0]);
        } else {
          const updated = queueRes.items.find((i) => i.reobservation_id === selectedReObs.reobservation_id);
          if (updated) setSelectedReObs(updated);
        }
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading re-observation data:', err);
      setError('Failed to load outcome verification data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [outcomeFilter, targetTypeFilter, statusFilter, busFilter, searchTerm]);

  // Load audit history when selected item changes
  useEffect(() => {
    if (!selectedReObs) {
      setHistory([]);
      return;
    }
    const loadHist = async () => {
      try {
        const histData = await api.getReObservationHistory(selectedReObs.reobservation_id);
        setHistory(histData);
      } catch (err) {
        console.warn('Failed to load history:', err);
      }
    };
    loadHist();
  }, [selectedReObs?.reobservation_id]);

  const handleVerify = async () => {
    if (!selectedReObs) return;
    try {
      setIsSubmitting(true);
      const updated = await api.verifyReObservationOutcome(selectedReObs.reobservation_id, {
        operator: operatorId,
        notes: modalNotes || 'Verified outcome matches mobile observations.',
      });
      setSelectedReObs(updated);
      setActionSuccess(`Outcome for ${selectedReObs.reobservation_id} verified.`);
      setActiveModal(null);
      setModalNotes('');
      await fetchData();
    } catch (err: any) {
      alert(`Verification failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEscalate = async () => {
    if (!selectedReObs) return;
    try {
      setIsSubmitting(true);
      await api.escalateReObservation(selectedReObs.reobservation_id, {
        operator: operatorId,
        escalation_notes: modalNotes || 'Condition persistent/worsened after action. Escalated for priority crew response.',
      });
      setActionSuccess(`Re-observation ${selectedReObs.reobservation_id} escalated.`);
      setActiveModal(null);
      setModalNotes('');
      await fetchData();
    } catch (err: any) {
      alert(`Escalation failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAnother = async () => {
    if (!selectedReObs) return;
    try {
      setIsSubmitting(true);
      const updated = await api.requestAnotherObservation(selectedReObs.reobservation_id, {
        operator: operatorId,
        notes: modalNotes || 'Requested follow-up transit pass for clearer camera observation.',
      });
      setSelectedReObs(updated);
      setActionSuccess(`Follow-up observation requested for ${selectedReObs.reobservation_id}.`);
      setActiveModal(null);
      setModalNotes('');
      await fetchData();
    } catch (err: any) {
      alert(`Request failed: ${err.message || 'Error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome.toUpperCase()) {
      case 'IMPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm">
            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
            IMPROVED
          </span>
        );
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/40">
            <Clock className="h-3 w-3 text-amber-400" />
            UNCHANGED
          </span>
        );
      case 'WORSENED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="h-3 w-3 text-rose-400" />
            WORSENED
          </span>
        );
      case 'INSUFFICIENT_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            <HelpCircle className="h-3 w-3 text-slate-400" />
            INSUFFICIENT DATA
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'VERIFIED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">VERIFIED</span>;
      case 'ESCALATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">ESCALATED</span>;
      case 'PENDING_REOBSERVATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-500/30">PENDING PASS</span>;
      case 'REQUIRES_REVIEW':
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">REQUIRES REVIEW</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Mandatory Honest Disclosure */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <RotateCcw className="h-6 w-6 text-emerald-400" />
              Re-Observation &amp; Outcome Verification
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Closed-Loop Feedback
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-4xl">
            Compares mobile bus observations before and after authority actions to deterministically verify whether urban conditions improved, remained unchanged, worsened, or require further observation.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Mandatory Prototype Disclosure Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 text-xs text-emerald-200/90 flex items-start gap-2.5 shadow-sm">
        <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold text-emerald-300">Prototype Closed-Loop Verification:</span>
          <p className="leading-relaxed text-slate-300 text-[11px]">
            Outcomes compare available observations and do not independently verify physical repair completion. Verification score represents evidence sufficiency, not statistical probability.
          </p>
        </div>
      </div>

      {/* 2. Top KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Pending Re-Obs</span>
            <span className="text-2xl font-bold font-mono text-blue-400 mt-1 block">
              {summary.pending_reobservation}
            </span>
            <span className="text-[10px] text-slate-500">Scheduled mobile pass</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Verified Improved</span>
            <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
              {summary.verified_improved}
            </span>
            <span className="text-[10px] text-emerald-400/70">Defects diminished</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Unchanged</span>
            <span className="text-2xl font-bold font-mono text-amber-400 mt-1 block">
              {summary.unchanged}
            </span>
            <span className="text-[10px] text-amber-400/70">Persistent condition</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Worsened</span>
            <span className="text-2xl font-bold font-mono text-rose-400 mt-1 block">
              {summary.worsened}
            </span>
            <span className="text-[10px] text-rose-400/70">Deterioration detected</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Insufficient Data</span>
            <span className="text-2xl font-bold font-mono text-slate-400 mt-1 block">
              {summary.insufficient_data}
            </span>
            <span className="text-[10px] text-slate-500">Quality / spatial mismatch</span>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 block font-medium">Escalated</span>
            <span className="text-2xl font-bold font-mono text-purple-300 mt-1 block">
              {summary.escalated}
            </span>
            <span className="text-[10px] text-purple-400/70">Secondary action required</span>
          </div>
        </div>
      )}

      {/* Feedback Alert Toast */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 font-medium flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white font-bold ml-4">✕</button>
        </div>
      )}

      {/* 3. Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Re-observation Queue (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-emerald-400" />
                Filter Re-Observations
              </h3>
              <span className="text-[10px] font-mono text-slate-400">{queueItems.length} records</span>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Outcome</label>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="IMPROVED">IMPROVED</option>
                  <option value="UNCHANGED">UNCHANGED</option>
                  <option value="WORSENED">WORSENED</option>
                  <option value="INSUFFICIENT_DATA">INSUFFICIENT DATA</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Verification Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="ESCALATED">ESCALATED</option>
                  <option value="PENDING_REOBSERVATION">PENDING REOBSERVATION</option>
                  <option value="REQUIRES_REVIEW">REQUIRES REVIEW</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search target, ID, or condition..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Queue List Cards */}
          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {queueItems.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-500">
                No re-observation records match the selected filters.
              </div>
            ) : (
              queueItems.map((item) => (
                <div
                  key={item.reobservation_id}
                  onClick={() => setSelectedReObs(item)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    selectedReObs?.reobservation_id === item.reobservation_id
                      ? 'border-emerald-500/60 bg-emerald-950/20 shadow-md shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                      : 'border-slate-800 bg-slate-900/90 hover:border-slate-700 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400">{item.reobservation_id}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-slate-300 font-semibold">{item.target_id}</span>
                    </div>
                    {getOutcomeBadge(item.outcome)}
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                    {item.observed_condition}
                  </p>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/80 pt-2">
                    <div className="flex items-center gap-1.5">
                      <Bus className="h-3 w-3 text-sky-400" />
                      <span>{item.source_bus_id} ({item.independent_bus_count} bus)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span className="font-bold text-emerald-300">{item.verification_score}/100</span>
                    </div>
                    <div>{getStatusBadge(item.verification_status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Before / After Inspector (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedReObs ? (
            <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-5">
              {/* Inspector Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-emerald-400">{selectedReObs.reobservation_id}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">Action: {selectedReObs.authority_action_id}</span>
                    <span className="text-xs text-slate-500">•</span>
                    <span className="text-xs text-slate-400">{selectedReObs.target_type}</span>
                  </div>
                  <h2 className="text-lg font-bold text-white mt-1">Outcome Verification Inspector</h2>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="#/authority-actions"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                  >
                    Action Center &rarr;
                  </a>
                </div>
              </div>

              {/* OUTCOME CARD */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                selectedReObs.outcome === 'IMPROVED'
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : selectedReObs.outcome === 'WORSENED'
                  ? 'bg-rose-950/30 border-rose-500/40'
                  : selectedReObs.outcome === 'UNCHANGED'
                  ? 'bg-amber-950/30 border-amber-500/40'
                  : 'bg-slate-900 border-slate-700'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Verification Outcome:</span>
                    {getOutcomeBadge(selectedReObs.outcome)}
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-slate-400">Evidence Sufficiency:</span>
                    <span className="font-bold text-emerald-300">{selectedReObs.evidence_sufficiency}</span>
                    <span className="text-slate-400">Score:</span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 font-bold text-white border border-slate-700">
                      {selectedReObs.verification_score} / 100
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                    Why this outcome?
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {selectedReObs.explanation}
                  </p>
                </div>

                {selectedReObs.recommended_action && (
                  <div className="text-xs text-slate-300 pt-2 border-t border-slate-800/80 flex items-start gap-2">
                    <ArrowRight className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Recommended Action:</strong> {selectedReObs.recommended_action}</span>
                  </div>
                )}
              </div>

              {/* BEFORE ACTION vs AFTER ACTION COMPARISON */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BEFORE ACTION PANEL */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                    <span className="font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      BEFORE ACTION
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Original Baseline</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Severity:</span>
                      <span className="font-bold text-rose-300">{selectedReObs.before_observation?.severity || 'HIGH'}</span>
                    </div>
                    {selectedReObs.before_observation?.defect_count !== undefined && (
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">Defect Count:</span>
                        <span className="font-bold text-white">{selectedReObs.before_observation.defect_count}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">Reliability:</span>
                      <span className="text-emerald-400">{Math.round((selectedReObs.before_observation?.reliability || 0.85) * 100)}%</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">Source Bus:</span>
                      <span className="text-slate-300">{selectedReObs.before_observation?.source_bus_id || 'PMP-BUS-001'}</span>
                    </div>
                  </div>

                  {/* Before Evidence Image */}
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-500 mb-1 block">Baseline Evidence:</span>
                    <div className="h-28 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                      <img
                        src="/assets/road-defects/pothole-real-01.jpg"
                        alt="Before condition"
                        className="object-cover w-full h-full"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-500 italic mt-1 block">Real-world reference</span>
                  </div>
                </div>

                {/* AFTER ACTION PANEL */}
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs border-b border-slate-900 pb-2">
                    <span className="font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <RotateCcw className="h-3.5 w-3.5" />
                      AFTER ACTION (RE-OBS)
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">Transit Pass</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Severity:</span>
                      <span className="font-bold text-emerald-300">{selectedReObs.after_observation?.severity || selectedReObs.severity}</span>
                    </div>
                    {selectedReObs.defect_count !== null && selectedReObs.defect_count !== undefined && (
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">Defect Count:</span>
                        <span className="font-bold text-white">{selectedReObs.defect_count}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">Reliability:</span>
                      <span className="text-emerald-400">{Math.round((selectedReObs.reliability || 0.88) * 100)}%</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span className="text-slate-400">Source Bus:</span>
                      <span className="text-slate-300">{selectedReObs.source_bus_id} ({selectedReObs.independent_bus_count} bus)</span>
                    </div>
                  </div>

                  {/* After Evidence Image */}
                  <div className="pt-2">
                    <span className="text-[10px] text-slate-500 mb-1 block">Re-Observation Evidence:</span>
                    <div className="h-28 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex items-center justify-center">
                      <img
                        src="/assets/road-defects/crack-real-01.jpg"
                        alt="After condition"
                        className="object-cover w-full h-full"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-[9.5px] text-slate-500 italic mt-1 block">Real-world reference</span>
                  </div>
                </div>
              </div>

              {/* TRANSITION DELTA STRIP */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono bg-slate-950 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Spatial Distance</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{selectedReObs.spatial_distance_m} m</span>
                  <span className={`text-[9px] ${selectedReObs.spatial_match ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedReObs.spatial_match ? '✓ Within 150m' : '✕ Out of range'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Temporal Delta</span>
                  <span className="font-bold text-slate-200 mt-0.5 block">{selectedReObs.temporal_delta_hours} hrs</span>
                  <span className="text-[9px] text-slate-400">Observation elapsed</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Defect Change</span>
                  <span className={`font-bold mt-0.5 block ${
                    selectedReObs.outcome === 'IMPROVED' ? 'text-emerald-400' : selectedReObs.outcome === 'WORSENED' ? 'text-rose-400' : 'text-slate-300'
                  }`}>
                    {selectedReObs.before_observation?.defect_count !== undefined && selectedReObs.defect_count !== undefined
                      ? `${selectedReObs.before_observation.defect_count} → ${selectedReObs.defect_count}`
                      : 'N/A'}
                  </span>
                  <span className="text-[9px] text-slate-400">Observed count</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Corroboration</span>
                  <span className="font-bold text-sky-400 mt-0.5 block">{selectedReObs.independent_bus_count} Bus(es)</span>
                  <span className="text-[9px] text-slate-400">{selectedReObs.corroboration_level.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {/* GIS LOCATION MAP */}
              <div className="rounded-xl border border-slate-800 p-4 space-y-2 bg-slate-950/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1.5 uppercase">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    Spatial Verification Geolocation
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                    Simulated GPS (Deterministic)
                  </span>
                </div>

                <div className="rounded-lg overflow-hidden border border-slate-800">
                  <MapComponent
                    center={{ lat: selectedReObs.latitude, lng: selectedReObs.longitude }}
                    zoom={15}
                    height="200px"
                  />
                </div>
              </div>

              {/* ACTION BUTTON CONTROLS */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  {selectedReObs.verification_status !== 'VERIFIED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('verify');
                        setModalNotes('Verified outcome based on post-action visual evidence.');
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      VERIFY OUTCOME
                    </button>
                  )}

                  {(selectedReObs.outcome === 'UNCHANGED' || selectedReObs.outcome === 'WORSENED') && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModal('escalate');
                        setModalNotes('Condition persistent after action; requesting secondary field inspection.');
                      }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-950 transition flex items-center gap-1.5"
                    >
                      <ShieldAlert className="h-3.5 w-3.5" />
                      ESCALATE
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setActiveModal('request_another');
                      setModalNotes('Requesting additional transit observation pass.');
                    }}
                    className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    REQUEST ANOTHER OBSERVATION
                  </button>
                </div>

                <div className="text-[11px] text-slate-500 font-mono">
                  Target: {selectedReObs.target_id}
                </div>
              </div>

              {/* IMMUTABLE AUDIT HISTORY TIMELINE */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Re-Observation Audit History
                </span>
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-2">No history entries recorded.</div>
                  ) : (
                    history.map((entry) => (
                      <div key={entry.entry_id} className="text-xs font-mono bg-slate-900/80 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-emerald-400">{entry.action_type}</span>
                          <span className="text-slate-500">
                            {typeof entry.timestamp === 'number' ? new Date(entry.timestamp * 1000).toLocaleString() : entry.timestamp}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-[10.5px]">
                          <span>Operator: <span className="text-slate-200">{entry.operator}</span></span>
                          <span>•</span>
                          <span>Transition: <span className="text-slate-200">{entry.from_status} → {entry.to_status}</span></span>
                        </div>
                        {entry.notes && <p className="text-slate-300 font-sans text-xs pt-0.5">{entry.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
              <RotateCcw className="h-10 w-10 text-slate-600 mx-auto" />
              <h4 className="text-base font-bold text-slate-300">No Re-Observation Selected</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an item from the queue to inspect before/after comparisons, spatial proximity, and verification score.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ACTION MODAL */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white capitalize">
                {activeModal === 'verify' ? 'Verify Re-Observation Outcome' : activeModal === 'escalate' ? 'Escalate Condition' : 'Request Follow-Up Observation'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Operator ID</label>
                <input
                  type="text"
                  value={operatorId}
                  onChange={(e) => setOperatorId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Operator Rationale &amp; Notes</label>
                <textarea
                  rows={3}
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Provide audit notes for this action..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={activeModal === 'verify' ? handleVerify : activeModal === 'escalate' ? handleEscalate : handleRequestAnother}
                disabled={isSubmitting}
                className={`px-5 py-2 text-xs font-bold rounded-lg text-white transition flex items-center gap-1.5 ${
                  activeModal === 'escalate' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {isSubmitting ? 'Saving...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReObservationPage;
