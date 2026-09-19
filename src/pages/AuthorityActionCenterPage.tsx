import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RotateCcw,
  XCircle,
  Filter,
  Search,
  RefreshCw,
  UserCheck,
  Send,
  Camera,
  MapPin,
  Layers,
  ChevronRight,
  Info,
  Sliders,
  Flame,
  Radio,
  ExternalLink,
  History,
  Activity,
  AlertOctagon,
  Wrench,
  Truck,
  TrafficCone,
  FileText,
  Sparkles,
} from 'lucide-react';
import { api } from '@/services/api';
import type {
  AuthorityAction,
  AuthorityActionSummary,
  ActionHistoryEntry,
  AuthorityActionType,
  AuthorityActionStatus,
  AuthorityActionPriority
} from '@/types';

export const AuthorityActionCenterPage: React.FC = () => {
  const [summary, setSummary] = useState<AuthorityActionSummary | null>(null);
  const [actions, setActions] = useState<AuthorityAction[]>([]);
  const [selectedAction, setSelectedAction] = useState<AuthorityAction | null>(null);
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('ALL');
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>('ALL');
  const [teamFilter, setTeamFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal / Transition State
  const [activeModal, setActiveModal] = useState<'assign' | 'action' | 'reobserve' | 'close' | 'cancel' | null>(null);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [selectedTeam, setSelectedTeam] = useState<string>('Road Maintenance');
  const [selectedOperator, setSelectedOperator] = useState<string>('crew-lead-01');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sumRes, queueRes] = await Promise.all([
        api.getAuthorityActionsSummary(),
        api.getAuthorityActionsQueue({
          status: statusFilter,
          priority: priorityFilter,
          action_type: actionTypeFilter,
          target_type: targetTypeFilter,
          assigned_team: teamFilter,
          bus_id: busFilter,
          search: searchTerm,
        }),
      ]);
      setSummary(sumRes);
      setActions(queueRes.items);
      if (queueRes.items.length > 0 && !selectedAction) {
        setSelectedAction(queueRes.items[0]);
      } else if (selectedAction) {
        // Keep updated record
        const updated = queueRes.items.find((a) => a.action_id === selectedAction.action_id);
        if (updated) setSelectedAction(updated);
      }
      setError(null);
    } catch (err: any) {
      console.error('Error loading action center data:', err);
      setError('Failed to load Authority Action Center data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter, actionTypeFilter, targetTypeFilter, teamFilter, busFilter, searchTerm]);

  // Load audit history whenever selected action changes
  useEffect(() => {
    if (!selectedAction) {
      setActionHistory([]);
      return;
    }
    api.getAuthorityActionHistory(selectedAction.action_id).then((hist) => {
      setActionHistory(hist);
    }).catch((err) => {
      console.warn('Could not load action history:', err);
    });
  }, [selectedAction?.action_id, selectedAction?.status]);

  const handleSelectAction = (action: AuthorityAction) => {
    setSelectedAction(action);
    setActionFeedback(null);
  };

  // State Transition Handlers
  const handleAssign = async () => {
    if (!selectedAction) return;
    try {
      setIsProcessing(true);
      const updated = await api.assignAuthorityAction(selectedAction.action_id, {
        assigned_team: selectedTeam,
        assigned_operator: selectedOperator,
        notes: modalNotes.trim() || `Assigned to ${selectedTeam}`,
      });
      setSelectedAction(updated);
      setActionFeedback(`Action ${selectedAction.action_id} assigned to ${selectedTeam}.`);
      setActiveModal(null);
      setModalNotes('');
      loadData();
    } catch (err: any) {
      alert(`Assignment failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkActioned = async () => {
    if (!selectedAction) return;
    if (!modalNotes.trim()) {
      alert('Please provide resolution action notes.');
      return;
    }
    try {
      setIsProcessing(true);
      const updated = await api.markAuthorityActionActioned(selectedAction.action_id, {
        action_notes: modalNotes.trim(),
        operator: selectedOperator,
      });
      setSelectedAction(updated);
      setActionFeedback(`Action ${selectedAction.action_id} marked as ACTIONED.`);
      setActiveModal(null);
      setModalNotes('');
      loadData();
    } catch (err: any) {
      alert(`Action completion failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReobserve = async () => {
    if (!selectedAction) return;
    try {
      setIsProcessing(true);
      const updated = await api.markAuthorityActionReobserve(selectedAction.action_id, {
        notes: modalNotes.trim() || 'Transitioned to mobile fleet re-observation mode.',
        operator: selectedOperator,
      });
      setSelectedAction(updated);
      setActionFeedback(`Action ${selectedAction.action_id} transitioned to REOBSERVE mode.`);
      setActiveModal(null);
      setModalNotes('');
      loadData();
    } catch (err: any) {
      alert(`Transition failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = async () => {
    if (!selectedAction) return;
    if (!modalNotes.trim()) {
      alert('Please provide closure verification notes.');
      return;
    }
    try {
      setIsProcessing(true);
      const updated = await api.closeAuthorityAction(selectedAction.action_id, {
        closure_notes: modalNotes.trim(),
        operator: selectedOperator,
      });
      setSelectedAction(updated);
      setActionFeedback(`Action ${selectedAction.action_id} successfully closed.`);
      setActiveModal(null);
      setModalNotes('');
      loadData();
    } catch (err: any) {
      alert(`Closure failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedAction) return;
    if (!modalNotes.trim()) {
      alert('Please provide a cancellation reason.');
      return;
    }
    try {
      setIsProcessing(true);
      const updated = await api.cancelAuthorityAction(selectedAction.action_id, {
        cancellation_reason: modalNotes.trim(),
        operator: selectedOperator,
      });
      setSelectedAction(updated);
      setActionFeedback(`Action ${selectedAction.action_id} cancelled.`);
      setActiveModal(null);
      setModalNotes('');
      loadData();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Badges
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'NEW':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-sky-950/80 text-sky-300 border border-sky-500/30">NEW</span>;
      case 'ASSIGNED':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">ASSIGNED</span>;
      case 'ACTIONED':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-blue-950/80 text-blue-300 border border-blue-500/30">ACTIONED</span>;
      case 'REOBSERVE':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">REOBSERVE</span>;
      case 'CLOSED':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">CLOSED</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-800 text-slate-400 border border-slate-700">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 text-[11px] rounded bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-red-950 text-red-400 border border-red-500/50">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-orange-950 text-orange-400 border border-orange-500/50">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-amber-950/80 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-800 text-slate-400">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300">{priority}</span>;
    }
  };

  const getActionTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'SAFETY_INTERVENTION':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-rose-950/70 text-rose-300 border border-rose-500/30">SAFETY INTERVENTION</span>;
      case 'REPAIR':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-950/70 text-amber-300 border border-amber-500/30">REPAIR</span>;
      case 'TRAFFIC_CONTROL':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-blue-950/70 text-blue-300 border border-blue-500/30">TRAFFIC CONTROL</span>;
      case 'DISPATCH':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-950/70 text-purple-300 border border-purple-500/30">DISPATCH</span>;
      case 'INSPECT':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-cyan-950/70 text-cyan-300 border border-cyan-500/30">INSPECT</span>;
      case 'REOBSERVE':
        return <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-950/70 text-emerald-300 border border-emerald-500/30">REOBSERVE</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300">{type}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="h-7 w-7 text-rose-500" />
              AUTHORITY ALERT &amp; ACTION CENTER
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-rose-950 text-rose-300 border border-rose-500/40 rounded-full">
              OPERATIONAL DISPATCH
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Coordinated municipal response orchestration for confirmed urban hazards and multi-bus consensus events
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Mandatory Disclosures banner */}
      <div className="rounded-lg bg-slate-900/90 border border-rose-500/30 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-slate-100">
            Prototype Authority Workflow Disclosure:
          </p>
          <p className="text-slate-400">
            Assignments and action states are simulated application records and are not connected to municipal dispatch systems.
            Simulated GPS and testbed observations provide decision support for prototype verification.
          </p>
        </div>
      </div>

      {/* Top KPI Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-slate-900/90 border border-sky-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-sky-400 font-semibold uppercase tracking-wider">
              <span>OPEN ACTIONS</span>
              <AlertTriangle className="h-4 w-4 text-sky-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.open_count}</div>
            <span className="text-[11px] text-slate-400 mt-1">Active response pipeline</span>
          </div>

          <div className="bg-slate-900/90 border border-red-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-red-400 font-semibold uppercase tracking-wider">
              <span>CRITICAL</span>
              <Flame className="h-4 w-4 text-red-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-red-300">{summary.critical_count}</div>
            <span className="text-[11px] text-slate-400 mt-1">Immediate priority</span>
          </div>

          <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <span>ASSIGNED</span>
              <UserCheck className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.assigned_count}</div>
            <span className="text-[11px] text-slate-400 mt-1">Dispatched to team</span>
          </div>

          <div className="bg-slate-900/90 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold uppercase tracking-wider">
              <span>ACTIONED</span>
              <Wrench className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.actioned_count}</div>
            <span className="text-[11px] text-slate-400 mt-1">Field intervention done</span>
          </div>

          <div className="bg-slate-900/90 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-purple-400 font-semibold uppercase tracking-wider">
              <span>REOBSERVE</span>
              <RotateCcw className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.reobserve_count}</div>
            <span className="text-[11px] text-slate-400 mt-1">Mobile fleet verifying</span>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              <span>CLOSED</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-300">{summary.closed_count}</div>
            <span className="text-[11px] text-slate-400 mt-1">Verified resolved</span>
          </div>
        </div>
      )}

      {/* Prototype Alert Notifications Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-4 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Radio className="h-4 w-4 text-rose-500 animate-pulse" />
          <span>Operational Notifications &amp; Alerts (Prototype)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
          <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-200">
            <AlertOctagon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <span>Critical pedestrian safety intervention awaiting assignment at Karve Road corridor.</span>
          </div>
          <div className="p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-lg flex items-start gap-2 text-amber-200">
            <Wrench className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <span>High-priority road maintenance action awaiting inspection dispatch on Route 03.</span>
          </div>
          <div className="p-2.5 bg-blue-950/40 border border-blue-500/30 rounded-lg flex items-start gap-2 text-blue-200">
            <Layers className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <span>Multi-bus corroborated traffic congestion event at Swargate Junction ready for signal timing review.</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Command Center Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Queue & Filters (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Filter className="h-3.5 w-3.5 text-rose-400" />
              <span>ACTION QUEUE FILTERS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="NEW">NEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="ACTIONED">ACTIONED</option>
                  <option value="REOBSERVE">REOBSERVE</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Priority</label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Action Type</label>
                <select
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="ALL">All Types</option>
                  <option value="SAFETY_INTERVENTION">SAFETY INTERVENTION</option>
                  <option value="REPAIR">REPAIR</option>
                  <option value="TRAFFIC_CONTROL">TRAFFIC CONTROL</option>
                  <option value="DISPATCH">DISPATCH</option>
                  <option value="INSPECT">INSPECT</option>
                  <option value="REOBSERVE">REOBSERVE</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Assigned Team</label>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                >
                  <option value="ALL">All Teams</option>
                  <option value="Road Maintenance">Road Maintenance</option>
                  <option value="Traffic Operations">Traffic Operations</option>
                  <option value="Public Safety">Public Safety</option>
                  <option value="Field Inspection">Field Inspection</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bus ID Filter</label>
                <input
                  type="text"
                  placeholder="e.g. PMP-BUS-001"
                  value={busFilter}
                  onChange={(e) => setBusFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Search Action / Target</label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Action Cards Queue */}
          <div className="space-y-2.5 max-h-[700px] overflow-y-auto pr-1">
            {actions.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
                No authority actions matching current filter criteria.
              </div>
            ) : (
              actions.map((act) => {
                const isSelected = selectedAction?.action_id === act.action_id;
                return (
                  <div
                    key={act.action_id}
                    onClick={() => handleSelectAction(act)}
                    className={`cursor-pointer rounded-xl border p-4 transition ${
                      isSelected
                        ? 'border-rose-500/70 bg-slate-900 shadow-lg shadow-rose-950/30'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-rose-400">{act.action_id}</span>
                          {getPriorityBadge(act.priority)}
                          {getActionTypeBadge(act.action_type)}
                          {getStatusBadge(act.status)}
                        </div>
                        <h4 className="text-sm font-bold text-white leading-snug">{act.title}</h4>
                      </div>
                      <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${isSelected ? 'rotate-90 text-rose-400' : ''}`} />
                    </div>

                    <p className="text-xs text-slate-300 mt-2 line-clamp-2">{act.description}</p>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Target</span>
                        <span className="font-mono text-slate-300 truncate block">{act.target_id}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Team</span>
                        <span className="text-slate-300 truncate block">{act.assigned_team || 'Unassigned'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Fleet Sources</span>
                        <span className="text-slate-300 block">{act.source_bus_ids.length} bus(es)</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Correlation</span>
                        <span className="font-mono text-blue-400 block">{act.correlation_id || '—'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Action Inspector & Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedAction ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-5">
              {/* Header */}
              <div className="border-b border-slate-800 pb-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-rose-400">{selectedAction.action_id}</span>
                  {getStatusBadge(selectedAction.status)}
                </div>
                <h3 className="text-base font-bold text-white mt-1 leading-snug">{selectedAction.title}</h3>
                <div className="flex items-center gap-2 mt-2">
                  {getPriorityBadge(selectedAction.priority)}
                  {getActionTypeBadge(selectedAction.action_type)}
                </div>
              </div>

              {actionFeedback && (
                <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
                  {actionFeedback}
                </div>
              )}

              {/* ACTION DETAILS */}
              <div className="space-y-3 rounded-lg bg-slate-950/70 border border-slate-800 p-3.5 text-xs">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-rose-400" />
                  ACTION CONTEXT &amp; AUDIT METADATA
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Target Record</span>
                    <span className="font-mono text-slate-200 font-semibold">{selectedAction.target_id} ({selectedAction.target_type})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Event Type</span>
                    <span className="font-semibold text-white">{selectedAction.event_type}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Assigned Team</span>
                    <span className="text-slate-200">{selectedAction.assigned_team || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Operator / Lead</span>
                    <span className="text-slate-200">{selectedAction.assigned_operator || 'None'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Operational Conf</span>
                    <span className="text-sky-400 font-mono font-bold">{(selectedAction.operational_confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Reliability Score</span>
                    <span className="text-emerald-400 font-mono font-bold">{(selectedAction.reliability * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>GPS: {selectedAction.latitude.toFixed(4)}, {selectedAction.longitude.toFixed(4)}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-500/20 text-[10px]">
                    Simulated GPS
                  </span>
                </div>
              </div>

              {/* WHY THIS ACTION */}
              <div className="rounded-lg bg-slate-950/50 border border-slate-800 p-3 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Why This Action Was Triggered:
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {selectedAction.priority_explanation || 'Assigned based on severity and multi-bus observation corroboration.'}
                </p>
              </div>

              {/* RECOMMENDED RESPONSE */}
              <div className="rounded-lg bg-slate-950/50 border border-slate-800 p-3 space-y-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Recommended Response Protocol:
                </span>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {selectedAction.recommended_response || 'Follow standard municipal response protocols.'}
                </p>
              </div>

              {/* Photographic Evidence Preview if available */}
              {selectedAction.evidence_refs && selectedAction.evidence_refs.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Camera className="h-3 w-3 text-slate-400" />
                    Evidence Reference
                  </span>
                  <div className="rounded-lg overflow-hidden border border-slate-800 bg-slate-950 max-h-40 flex items-center justify-center">
                    <img
                      src={`/${selectedAction.evidence_refs[0].replace(/^\/+/, '')}`}
                      alt="Action evidence reference"
                      className="object-cover w-full h-36"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              {/* CONTEXTUAL ACTION CONTROLS */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Dispatch &amp; Lifecycle Controls:
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {selectedAction.status === 'NEW' && (
                    <button
                      onClick={() => {
                        setActiveModal('assign');
                        setModalNotes('');
                      }}
                      className="col-span-2 py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <UserCheck className="h-4 w-4" />
                      ASSIGN TO TEAM
                    </button>
                  )}

                  {selectedAction.status === 'ASSIGNED' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveModal('assign');
                          setModalNotes('');
                        }}
                        className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition"
                      >
                        REASSIGN TEAM
                      </button>
                      <button
                        onClick={() => {
                          setActiveModal('action');
                          setModalNotes('');
                        }}
                        className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <Wrench className="h-4 w-4" />
                        MARK ACTIONED
                      </button>
                    </>
                  )}

                  {selectedAction.status === 'ACTIONED' && (
                    <>
                      <button
                        onClick={() => {
                          setActiveModal('reobserve');
                          setModalNotes('');
                        }}
                        className="py-2 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <RotateCcw className="h-4 w-4" />
                        START RE-OBSERVATION
                      </button>
                      <button
                        onClick={() => {
                          setActiveModal('close');
                          setModalNotes('');
                        }}
                        className="py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        CLOSE ACTION
                      </button>
                    </>
                  )}

                  {selectedAction.status === 'REOBSERVE' && (
                    <button
                      onClick={() => {
                        setActiveModal('close');
                        setModalNotes('');
                      }}
                      className="col-span-2 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      CLOSE ACTION (VERIFIED)
                    </button>
                  )}

                  {selectedAction.status !== 'CLOSED' && selectedAction.status !== 'CANCELLED' && (
                    <button
                      onClick={() => {
                        setActiveModal('cancel');
                        setModalNotes('');
                      }}
                      className="col-span-2 py-1.5 px-3 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 font-semibold text-xs transition"
                    >
                      Cancel Action
                    </button>
                  )}
                </div>
              </div>

              {/* QUICK NAVIGATION */}
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 flex-wrap">
                <a
                  href="#/map"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  <MapPin className="h-3 w-3 text-sky-400" /> OPEN IN GIS
                </a>
                <a
                  href="#/reobservation"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/80 transition"
                >
                  <RotateCcw className="h-3 w-3 text-indigo-400" /> RE-OBSERVATION
                </a>
                <a
                  href="#/predictive"
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-sky-950/80 border border-sky-500/30 text-sky-300 hover:bg-sky-900/80 transition"
                >
                  <Sparkles className="h-3 w-3 text-sky-400" /> PREDICTIVE INTEL
                </a>
                {selectedAction.review_id && (
                  <a
                    href="#/review-center"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                  >
                    <UserCheck className="h-3 w-3 text-indigo-400" /> OPEN REVIEW
                  </a>
                )}
                {selectedAction.correlation_id && (
                  <a
                    href="#/event-correlation"
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                  >
                    <Layers className="h-3 w-3 text-blue-400" /> VIEW CORRELATION
                  </a>
                )}
              </div>

              {/* AUDIT HISTORY TIMELINE */}
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase tracking-wider">
                  <History className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Audit History Timeline</span>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {actionHistory.length === 0 ? (
                    <div className="text-xs text-slate-500 italic">No previous state transitions recorded.</div>
                  ) : (
                    actionHistory.map((h) => (
                      <div key={h.entry_id} className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-indigo-300 font-bold">
                            {h.from_status} → {h.to_status}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(h.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Operator: <span className="text-slate-300 font-semibold">{h.operator}</span>
                        </div>
                        {h.notes && <p className="text-[11px] text-slate-300 italic">{h.notes}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
              Select an authority action from the queue to view full context, audit trail, and dispatch controls.
            </div>
          )}
        </div>
      </div>

      {/* ACTION MODAL DIALOG */}
      {activeModal && selectedAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {activeModal === 'assign' && 'Assign Authority Action'}
                {activeModal === 'action' && 'Mark Action as Completed'}
                {activeModal === 'reobserve' && 'Schedule Re-Observation'}
                {activeModal === 'close' && 'Close Authority Action'}
                {activeModal === 'cancel' && 'Cancel Authority Action'}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {activeModal === 'assign' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Select Response Team</label>
                  <select
                    value={selectedTeam}
                    onChange={(e) => setSelectedTeam(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  >
                    <option value="Road Maintenance">Road Maintenance (Potholes &amp; Structural Defect Crew)</option>
                    <option value="Traffic Operations">Traffic Operations (Signals &amp; Corridor Queues)</option>
                    <option value="Public Safety">Public Safety (Pedestrian Protection &amp; Crossings)</option>
                    <option value="Field Inspection">Field Inspection (Incident &amp; Obstruction Audit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Operator Identifier</label>
                  <input
                    type="text"
                    value={selectedOperator}
                    onChange={(e) => setSelectedOperator(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-200"
                  />
                  <span className="text-[10px] text-slate-500">Prototype operator identity</span>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Assignment Instructions</label>
                  <textarea
                    rows={3}
                    placeholder="Provide dispatch notes or location instructions..."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>
            )}

            {activeModal === 'action' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">
                  Record on-site resolution work performed by the response crew.
                </p>
                <div>
                  <label className="block text-slate-400 mb-1">Resolution Notes (Required)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Applied cold-mix patch over void; asphalt compacted."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>
            )}

            {activeModal === 'reobserve' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">
                  Schedules mobile bus fleet cameras on upcoming route passes to automatically verify repaired or cleared condition.
                </p>
                <div>
                  <label className="block text-slate-400 mb-1">Re-Observation Parameters</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Verify road surface stability across next 3 scheduled bus passes."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>
            )}

            {activeModal === 'close' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">
                  Confirm resolution and mark this authority action record as permanently closed.
                </p>
                <div>
                  <label className="block text-slate-400 mb-1">Closure Notes (Required)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Verified by field inspection; corridor restored to normal transit service."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>
            )}

            {activeModal === 'cancel' && (
              <div className="space-y-3 text-xs">
                <p className="text-slate-400">
                  Provide cancellation justification for audit record.
                </p>
                <div>
                  <label className="block text-slate-400 mb-1">Cancellation Reason (Required)</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Duplicate action created; condition resolved under prior work order."
                    value={modalNotes}
                    onChange={(e) => setModalNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                Back
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (activeModal === 'assign') handleAssign();
                  else if (activeModal === 'action') handleMarkActioned();
                  else if (activeModal === 'reobserve') handleReobserve();
                  else if (activeModal === 'close') handleClose();
                  else if (activeModal === 'cancel') handleCancel();
                }}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md transition"
              >
                {isProcessing ? 'Processing...' : 'Confirm Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthorityActionCenterPage;
