import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  AlertTriangle,
  Filter,
  Download,
  Search,
  Eye,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  FileSpreadsheet,
  Info,
  ChevronRight,
  Bus,
  Layers,
  Camera,
  Activity,
  UserCheck,
  ShieldAlert,
  ZoomIn,
} from 'lucide-react';
import { api } from '@/services/api';
import { ImageLightboxModal } from '@/components/ui/ImageLightboxModal';
import type {
  ReviewRecord,
  ReviewSummary,
  FeedbackRecord,
  ReviewDecision,
  ReviewStatus,
  ReviewReason
} from '@/types';

export const ReviewCenterPage: React.FC = () => {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [queueItems, setQueueItems] = useState<ReviewRecord[]>([]);
  const [feedbackRecords, setFeedbackRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [decisionFilter, setDecisionFilter] = useState<string>('ALL');
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [busFilter, setBusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'queue' | 'feedback' | 'metrics'>('queue');

  // Inspector Modal State
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [reviewerId, setReviewerId] = useState<string>('operator-01');
  const [decision, setDecision] = useState<ReviewDecision>('CONFIRMED');
  const [reason, setReason] = useState<ReviewReason | ''>('TRUE_POSITIVE');
  const [correctedType, setCorrectedType] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    attribution?: string;
  } | null>(null);

  const getEvidenceAssetForReview = (review: ReviewRecord): string | null => {
    const type = review.original_event_type?.toUpperCase() || '';
    if (type === 'HIT_AND_RUN') {
      if (
        review.target_id?.toUpperCase().includes('COLLISION') ||
        review.target_id?.includes('0002') ||
        review.evidence_reference?.includes('collision')
      ) {
        return '/assets/incidents/vehicle-collision-real-01.jpg';
      }
      return '/assets/incidents/road-incident-real-01.jpg';
    }
    if (type === 'ROAD_POTHOLE') {
      return '/assets/road-defects/pothole-real-01.jpg';
    }
    if (type === 'ROAD_CRACK') {
      return '/assets/road-defects/road-crack-real-01.jpg';
    }
    if (review.evidence_reference && review.evidence_reference.trim().length > 0) {
      const ref = review.evidence_reference.trim().toLowerCase();
      if (ref.includes('pothole')) return '/assets/road-defects/pothole-real-01.jpg';
      if (ref.includes('crack')) return '/assets/road-defects/road-crack-real-01.jpg';
      if (ref.includes('collision')) return '/assets/incidents/vehicle-collision-real-01.jpg';
      if (ref.includes('incident') || ref.includes('hit-and-run')) return '/assets/incidents/road-incident-real-01.jpg';
    }
    return null;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, queueRes, fbkRes] = await Promise.all([
        api.getReviewSummary(),
        api.getReviewQueue({
          status: statusFilter,
          severity: severityFilter,
          decision: decisionFilter,
          event_type: eventTypeFilter,
          bus_id: busFilter,
          search: searchTerm,
        }),
        api.getFeedbackRecords(),
      ]);
      setSummary(sumRes);
      setQueueItems(queueRes.items);
      setFeedbackRecords(fbkRes);
      setError(null);
    } catch (err: any) {
      console.error('Error loading review center data:', err);
      setError('Failed to load review center data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, severityFilter, decisionFilter, eventTypeFilter, busFilter, searchTerm]);

  const handleOpenReview = async (item: ReviewRecord) => {
    setSelectedReview(item);
    setDecision((item.decision as ReviewDecision) || 'CONFIRMED');
    setReason((item.reason as ReviewReason) || (item.decision === 'REJECTED' ? 'FALSE_POSITIVE' : 'TRUE_POSITIVE'));
    setCorrectedType(item.corrected_event_type || '');
    setNotes(item.notes || '');
    setActionSuccess(null);

    // If pending, mark as in review
    if (item.status === 'PENDING') {
      try {
        await api.startReview(item.review_id, reviewerId);
        item.status = 'IN_REVIEW';
        item.reviewer_id = reviewerId;
      } catch (err) {
        console.warn('Could not transition review to in_review status:', err);
      }
    }
  };

  const handleSaveDecision = async () => {
    if (!selectedReview) return;
    try {
      setIsSubmitting(true);
      await api.submitReviewDecision(selectedReview.review_id, {
        decision: correctedType.trim() ? 'LABEL_CORRECTED' : decision,
        reason: reason || null,
        notes: notes || null,
        corrected_event_type: correctedType.trim() || null,
        reviewer_id: reviewerId || 'operator-01',
      });

      setActionSuccess(`Review ${selectedReview.review_id} saved as ${decision}. Original AI event remains unchanged.`);
      setTimeout(() => {
        setSelectedReview(null);
        setActionSuccess(null);
        fetchData();
      }, 1200);
    } catch (err: any) {
      alert(`Failed to save review: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAuthorityAction = async () => {
    if (!selectedReview) return;
    try {
      setIsSubmitting(true);
      const created = await api.createAuthorityAction({
        target_id: selectedReview.target_id,
        target_type: (selectedReview.target_type as any) || 'REVIEW_ITEM',
        event_type: correctedType.trim() || selectedReview.original_event_type,
        title: `Authority Action: ${correctedType.trim() || selectedReview.original_event_type} (${selectedReview.target_id})`,
        description: `Prototype authority action created from confirmed human review ${selectedReview.review_id}. Notes: ${notes || selectedReview.notes || 'Human confirmed observation.'}`,
        severity: (selectedReview.severity as any) || 'MEDIUM',
        review_id: selectedReview.review_id,
        correlation_id: selectedReview.correlation_id || undefined,
        source_bus_ids: selectedReview.source_bus_id ? [selectedReview.source_bus_id] : undefined,
        evidence_refs: selectedReview.evidence_reference ? [selectedReview.evidence_reference] : undefined,
        operational_confidence: selectedReview.original_operational_confidence,
        reliability: selectedReview.original_reliability,
        simulated_gps: true,
        action_type: selectedReview.original_event_type.includes('POTHOLE') || selectedReview.original_event_type.includes('CRACK')
          ? 'REPAIR'
          : selectedReview.original_event_type.includes('PEDESTRIAN')
          ? 'SAFETY_INTERVENTION'
          : selectedReview.original_event_type.includes('CONGESTION')
          ? 'TRAFFIC_CONTROL'
          : 'INSPECT',
        assigned_team: selectedReview.original_event_type.includes('PEDESTRIAN')
          ? 'Public Safety'
          : selectedReview.original_event_type.includes('CONGESTION')
          ? 'Traffic Operations'
          : 'Road Maintenance',
      });
      setActionSuccess(`Authority Action ${created.action_id} created successfully! Redirecting to Action Center...`);
      setTimeout(() => {
        window.location.hash = '#/authority-actions';
      }, 1000);
    } catch (err: any) {
      alert(`Failed to create action: ${err.message || 'Error occurred'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export functions
  const exportFeedbackCSV = () => {
    if (!feedbackRecords || feedbackRecords.length === 0) {
      alert('No feedback records available for export.');
      return;
    }
    const headers = [
      'feedback_id',
      'review_id',
      'target_type',
      'target_id',
      'event_type',
      'original_confidence',
      'operational_confidence',
      'reliability',
      'decision',
      'reason',
      'corrected_event_type',
      'reviewer_id',
      'reviewed_at',
      'notes',
    ];
    const rows = feedbackRecords.map((f) => [
      f.feedback_id,
      f.review_id,
      f.target_type,
      f.target_id,
      f.event_type,
      f.original_confidence,
      f.operational_confidence,
      f.reliability,
      f.decision,
      f.reason || '',
      f.corrected_event_type || '',
      f.reviewer_id,
      f.reviewed_at,
      `"${(f.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `model_feedback_dataset_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportFeedbackJSON = () => {
    if (!feedbackRecords || feedbackRecords.length === 0) {
      alert('No feedback records available for export.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(feedbackRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `model_feedback_dataset_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-900/40 text-amber-300 border border-amber-500/30">PENDING</span>;
      case 'IN_REVIEW':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-900/40 text-blue-300 border border-blue-500/30">IN REVIEW</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-500/30">COMPLETED</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const getDecisionBadge = (d: string | null | undefined) => {
    if (!d) return <span className="text-xs text-slate-500 italic">Unreviewed</span>;
    switch (d.toUpperCase()) {
      case 'CONFIRMED':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">CONFIRMED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-rose-950/60 text-rose-400 border border-rose-500/40">REJECTED</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-950/60 text-amber-400 border border-amber-500/40">NEEDS REVIEW</span>;
      case 'LABEL_CORRECTED':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-950/60 text-purple-400 border border-purple-500/40">LABEL CORRECTED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-300">{d}</span>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-950/80 text-red-400 border border-red-500/40">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-950/80 text-orange-400 border border-orange-500/40">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-950/60 text-amber-400 border border-amber-500/30">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-400">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300">{sev}</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="h-7 w-7 text-indigo-400" />
              HUMAN REVIEW CENTER
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 rounded-full">
              HUMAN-IN-THE-LOOP
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Human-in-the-loop validation of AI observations
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={exportFeedbackCSV}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition"
          >
            <Download className="h-3.5 w-3.5" />
            EXPORT FEEDBACK (CSV)
          </button>
        </div>
      </div>

      {/* Disclosures banner */}
      <div className="rounded-lg bg-slate-900/80 border border-indigo-500/30 p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-medium text-slate-200">
            Auditability &amp; Model Evaluation Protocol:
          </p>
          <p className="text-slate-400">
            Human feedback is stored separately from original AI observations and is available for future offline model evaluation/retraining.
            Original AI detection scores remain permanently immutable for audit integrity.
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase tracking-wider">
              <span>PENDING</span>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.pending}</div>
            <span className="text-[11px] text-slate-400 mt-1">Awaiting review</span>
          </div>

          <div className="bg-slate-900/90 border border-blue-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-blue-400 font-semibold uppercase tracking-wider">
              <span>IN REVIEW</span>
              <Activity className="h-4 w-4 text-blue-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.in_review}</div>
            <span className="text-[11px] text-slate-400 mt-1">Under inspection</span>
          </div>

          <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase tracking-wider">
              <span>CONFIRMED</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.confirmed}</div>
            <span className="text-[11px] text-slate-400 mt-1">Verified true</span>
          </div>

          <div className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-rose-400 font-semibold uppercase tracking-wider">
              <span>REJECTED</span>
              <XCircle className="h-4 w-4 text-rose-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.rejected}</div>
            <span className="text-[11px] text-slate-400 mt-1">Flagged false</span>
          </div>

          <div className="bg-slate-900/90 border border-purple-500/20 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-purple-400 font-semibold uppercase tracking-wider">
              <span>NEEDS REVIEW</span>
              <HelpCircle className="h-4 w-4 text-purple-400" />
            </div>
            <div className="mt-2 text-2xl font-bold text-white">{summary.needs_review}</div>
            <span className="text-[11px] text-slate-400 mt-1">Inconclusive</span>
          </div>

          <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold uppercase tracking-wider">
              <span>CONFIRMATION RATE</span>
              <UserCheck className="h-4 w-4 text-indigo-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5 text-2xl font-bold text-indigo-200">
              <span>{(summary.confirmation_rate * 100).toFixed(1)}%</span>
              <span className="text-xs font-mono font-normal text-indigo-300/70">
                (n={summary.completed})
              </span>
            </div>
            {summary.completed < 5 ? (
              <span className="text-[10px] text-amber-300/90 mt-1 leading-tight font-medium">
                Small sample (n &lt; 5) — not representative of model accuracy.
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 mt-1 leading-tight line-clamp-2">
                Human confirmation rate among reviewed events (≠ model accuracy)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'queue'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="h-4 w-4" />
          Review Queue ({queueItems.length})
        </button>

        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'feedback'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          Future Model Improvement Dataset ({feedbackRecords.length})
        </button>

        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'metrics'
              ? 'border-indigo-500 text-indigo-400 bg-slate-900/50'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="h-4 w-4" />
          Review Metrics &amp; Analytics
        </button>
      </div>

      {activeTab === 'queue' && (
        <>
          {/* Filters Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Filter className="h-3.5 w-3.5 text-indigo-400" />
              <span>QUEUE FILTERS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Event Type Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Event Type</label>
                <select
                  value={eventTypeFilter}
                  onChange={(e) => setEventTypeFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Event Types</option>
                  <option value="ROAD_POTHOLE">ROAD_POTHOLE</option>
                  <option value="ROAD_CRACK">ROAD_CRACK</option>
                  <option value="TRAFFIC_CONGESTION">TRAFFIC_CONGESTION</option>
                  <option value="PEDESTRIAN_RISK">PEDESTRIAN_RISK</option>
                  <option value="HIT_AND_RUN">HIT_AND_RUN</option>
                  <option value="ANPR_DETECTION">ANPR_DETECTION</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Review Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="IN_REVIEW">IN REVIEW</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
              </div>

              {/* Severity Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Severity</label>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">CRITICAL</option>
                  <option value="HIGH">HIGH</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="LOW">LOW</option>
                </select>
              </div>

              {/* Decision Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Human Decision</label>
                <select
                  value={decisionFilter}
                  onChange={(e) => setDecisionFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">All Decisions</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="NEEDS_REVIEW">NEEDS REVIEW</option>
                  <option value="LABEL_CORRECTED">LABEL CORRECTED</option>
                </select>
              </div>

              {/* Bus ID Filter */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Bus ID</label>
                <input
                  type="text"
                  placeholder="e.g. PMP-BUS-001"
                  value={busFilter}
                  onChange={(e) => setBusFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Search text */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Search ID / Notes</label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Search query..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Queue Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Review ID</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Event Type</th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3 text-right">AI Conf</th>
                    <th className="px-4 py-3 text-right">Reliability</th>
                    <th className="px-4 py-3">Bus / Source</th>
                    <th className="px-4 py-3">Correlation</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Decision</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {queueItems.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-slate-500 font-sans text-xs">
                        No review items matching the selected filters.
                      </td>
                    </tr>
                  ) : (
                    queueItems.map((item) => (
                      <tr key={item.review_id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-bold text-indigo-300">{item.review_id}</td>
                        <td className="px-4 py-3 text-slate-300">{item.target_id}</td>
                        <td className="px-4 py-3 font-semibold text-white">{item.original_event_type}</td>
                        <td className="px-4 py-3">{getSeverityBadge(item.severity)}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-200">
                          {(item.original_confidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-400">
                          {(item.original_reliability * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-slate-300">{item.source_bus_id || 'FLEET'}</td>
                        <td className="px-4 py-3">
                          {item.correlation_id ? (
                            <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-500/30 text-[10px]">
                              {item.correlation_id}
                            </span>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            item.priority_rank === 'CRITICAL' ? 'text-red-400' :
                            item.priority_rank === 'HIGH' ? 'text-orange-400' :
                            item.priority_rank === 'MEDIUM' ? 'text-amber-400' : 'text-slate-400'
                          }`}>
                            {item.priority_rank || 'NORMAL'}
                          </span>
                        </td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3">{getDecisionBadge(item.decision)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleOpenReview(item)}
                            className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-600/80 hover:bg-indigo-600 text-white shadow-sm transition"
                          >
                            <Eye className="h-3 w-3" />
                            REVIEW
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
                Future Model Improvement Dataset
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Available for future offline model evaluation/retraining. Feedback records preserve structured human confirmation and correction data.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportFeedbackCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
              <button
                onClick={exportFeedbackJSON}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              >
                <Download className="h-3.5 w-3.5" />
                Export JSON
              </button>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Feedback ID</th>
                    <th className="px-4 py-3">Target ID</th>
                    <th className="px-4 py-3">AI Label</th>
                    <th className="px-4 py-3">Human Decision</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3 text-right">AI Conf</th>
                    <th className="px-4 py-3 text-right">Reliability</th>
                    <th className="px-4 py-3">Reviewer</th>
                    <th className="px-4 py-3">Reviewed At</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {feedbackRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500 font-sans text-xs">
                        No completed feedback records generated yet. Review pending items in the queue to create dataset entries.
                      </td>
                    </tr>
                  ) : (
                    feedbackRecords.map((f) => (
                      <tr key={f.feedback_id} className="hover:bg-slate-800/40 transition">
                        <td className="px-4 py-3 font-bold text-indigo-300">{f.feedback_id}</td>
                        <td className="px-4 py-3 text-slate-300">{f.target_id}</td>
                        <td className="px-4 py-3 font-semibold text-white">{f.event_type}</td>
                        <td className="px-4 py-3">{getDecisionBadge(f.decision)}</td>
                        <td className="px-4 py-3 text-slate-300">{f.reason || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-200">
                          {(f.original_confidence * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-400">
                          {(f.reliability * 100).toFixed(0)}%
                        </td>
                        <td className="px-4 py-3 text-slate-400">{f.reviewer_id}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(f.reviewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-slate-400 font-sans max-w-xs truncate">{f.notes || '—'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Descriptive Statistics */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-400" />
              Human Review Descriptive Statistics
            </h3>
            <p className="text-xs text-slate-400">
              Descriptive comparisons between confirmed and rejected observations among reviewed testbed events.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400 font-medium">Avg AI Conf (Confirmed)</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {(summary.avg_confidence_confirmed * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400 font-medium">Avg AI Conf (Rejected)</div>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  {(summary.avg_confidence_rejected * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400 font-medium">Avg Reliability (Confirmed)</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">
                  {(summary.avg_reliability_confirmed * 100).toFixed(1)}%
                </div>
              </div>
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3">
                <div className="text-[11px] text-slate-400 font-medium">Avg Reliability (Rejected)</div>
                <div className="text-xl font-bold text-rose-400 mt-1">
                  {(summary.avg_reliability_rejected * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 italic border-t border-slate-800/80 pt-3">
              Note: These are descriptive queue statistics only, not formal precision/recall metrics.
            </div>
          </div>

          {/* Rejection Reasons Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Recorded Rejection &amp; Correction Reasons
            </h3>
            <p className="text-xs text-slate-400">
              Reasons recorded by human reviewers when rejecting observations or adjusting labels.
            </p>

            <div className="space-y-2 pt-1">
              {Object.keys(summary.rejection_reasons).length === 0 ? (
                <div className="text-xs text-slate-500 italic py-4">No rejections recorded yet.</div>
              ) : (
                Object.entries(summary.rejection_reasons).map(([reasonKey, count]) => (
                  <div key={reasonKey} className="flex items-center justify-between text-xs bg-slate-950/60 px-3 py-2 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-300">{reasonKey.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300 font-bold">{count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* REVIEW INSPECTOR MODAL */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                    {selectedReview.review_id}
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-400">Target: {selectedReview.target_id}</span>
                </div>
                <h2 className="text-lg font-bold text-white mt-0.5">
                  Review AI Observation: {selectedReview.original_event_type}
                </h2>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* AI Observation Summary */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
              <div className="text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                AI OBSERVATION (IMMUTABLE)
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <div className="text-slate-500 text-[11px]">Event Type</div>
                  <div className="font-bold text-white mt-0.5">{selectedReview.original_event_type}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Raw AI Confidence</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {(selectedReview.original_confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Operational Conf</div>
                  <div className="font-bold text-blue-300 mt-0.5">
                    {(selectedReview.original_operational_confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Reliability Score</div>
                  <div className="font-bold text-emerald-400 mt-0.5">
                    {(selectedReview.original_reliability * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-900">
                <div>
                  <div className="text-slate-500 text-[11px]">Severity</div>
                  <div className="mt-0.5">{getSeverityBadge(selectedReview.severity)}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">Source Bus</div>
                  <div className="font-mono text-slate-300 mt-0.5">{selectedReview.source_bus_id || 'FLEET'}</div>
                </div>
                <div>
                  <div className="text-slate-500 text-[11px]">GPS Positioning</div>
                  <div className="text-slate-400 mt-0.5">Simulated GPS</div>
                </div>
              </div>

              {/* Evidence Section */}
              {(() => {
                const evidenceUrl = getEvidenceAssetForReview(selectedReview);
                return (
                  <div className="pt-2">
                    <div className="text-[11px] text-slate-400 mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-300">
                        <Camera className="h-3.5 w-3.5 text-indigo-400" />
                        Evidence Reference:
                      </span>
                      {evidenceUrl ? (
                        <span className="rounded bg-sky-500/15 border border-sky-500/30 px-2 py-0.5 text-[10px] font-semibold text-sky-300">
                          VISUAL REFERENCE
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                          METADATA ONLY
                        </span>
                      )}
                    </div>

                    {evidenceUrl ? (
                      <div className="rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 p-3 space-y-2.5">
                        <div
                          className="relative group cursor-pointer rounded-lg overflow-hidden border border-slate-800 bg-black max-h-52 flex items-center justify-center shadow-inner"
                          onClick={() =>
                            setPreviewImage({
                              url: evidenceUrl,
                              title: `${selectedReview.original_event_type} (${selectedReview.target_id})`,
                              subtitle: `Source Bus: ${selectedReview.source_bus_id || 'Transit Fleet'} • Confidence: ${(selectedReview.original_confidence * 100).toFixed(0)}% • Reliability: ${(selectedReview.original_reliability * 100).toFixed(0)}%`,
                              attribution: 'Reference image — not a live bus-camera capture or legal evidence.',
                            })
                          }
                        >
                          <img
                            src={evidenceUrl}
                            alt={`Visual reference for ${selectedReview.original_event_type}`}
                            className="object-cover w-full h-44 group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs text-white font-medium backdrop-blur-[1px]">
                            <ZoomIn className="h-4 w-4 text-indigo-300" />
                            <span>Click to enlarge full resolution</span>
                          </div>
                        </div>

                        {/* Visual Reference Details */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] border-t border-slate-900">
                          <div>
                            <span className="text-slate-500 block">Event Type:</span>
                            <span className="text-slate-200 font-semibold">{selectedReview.original_event_type}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Source Bus:</span>
                            <span className="text-indigo-300 font-mono font-medium">{selectedReview.source_bus_id || 'FLEET'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Raw AI / Op Conf:</span>
                            <span className="text-blue-300 font-medium">
                              {(selectedReview.original_confidence * 100).toFixed(0)}% / {(selectedReview.original_operational_confidence * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Reliability Score:</span>
                            <span className="text-emerald-400 font-medium">
                              {(selectedReview.original_reliability * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>

                        {/* Honesty Disclosure */}
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-md border border-slate-800">
                          <Info className="h-3.5 w-3.5 text-slate-500 flex-shrink-0" />
                          <span>Reference image — not a live bus-camera capture or legal evidence.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-slate-900/60 rounded-lg text-xs text-slate-400 italic border border-dashed border-slate-800">
                        Evidence reference unavailable (metadata only)
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Correlation context if available */}
            {selectedReview.correlation_id && (
              <div className="rounded-xl bg-blue-950/30 border border-blue-500/30 p-3.5 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-blue-300 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Multi-Bus Correlation: {selectedReview.correlation_id}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-900/60 rounded text-[10px] text-blue-200">
                    CORRELATED OBSERVATION
                  </span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Corroborated across independent transit passes. Reviewing this record assesses the correlated event condition while preserving individual source bus traces.
                </p>
              </div>
            )}

            {/* Human Review Form */}
            <div className="space-y-4 pt-1">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-indigo-400" />
                RECORD HUMAN DECISION
              </div>

              {/* Decision Buttons */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setDecision('CONFIRMED');
                    setReason('TRUE_POSITIVE');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                    decision === 'CONFIRMED'
                      ? 'bg-emerald-900/80 border-emerald-500 text-emerald-200 shadow-md shadow-emerald-950/50'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  CONFIRMED
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDecision('REJECTED');
                    setReason('FALSE_POSITIVE');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                    decision === 'REJECTED'
                      ? 'bg-rose-900/80 border-rose-500 text-rose-200 shadow-md shadow-rose-950/50'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <XCircle className="h-4 w-4" />
                  REJECTED
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDecision('NEEDS_REVIEW');
                    setReason('INSUFFICIENT_EVIDENCE');
                  }}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                    decision === 'NEEDS_REVIEW'
                      ? 'bg-amber-900/80 border-amber-500 text-amber-200 shadow-md shadow-amber-950/50'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <HelpCircle className="h-4 w-4" />
                  NEEDS REVIEW
                </button>
              </div>

              {/* Reason and Corrected Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Structured Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as ReviewReason)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="TRUE_POSITIVE">TRUE POSITIVE</option>
                    <option value="FALSE_POSITIVE">FALSE POSITIVE</option>
                    <option value="WRONG_EVENT_TYPE">WRONG EVENT TYPE</option>
                    <option value="LOW_IMAGE_QUALITY">LOW IMAGE QUALITY</option>
                    <option value="OCCLUSION">OCCLUSION</option>
                    <option value="DUPLICATE_EVENT">DUPLICATE EVENT</option>
                    <option value="INSUFFICIENT_EVIDENCE">INSUFFICIENT EVIDENCE</option>
                    <option value="LOCATION_MISMATCH">LOCATION MISMATCH</option>
                    <option value="TEMPORAL_MISMATCH">TEMPORAL MISMATCH</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Corrected Label (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ROAD_CRACK"
                    value={correctedType}
                    onChange={(e) => setCorrectedType(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Reviewer ID & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Reviewer ID</label>
                  <input
                    type="text"
                    value={reviewerId}
                    onChange={(e) => setReviewerId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500">Prototype reviewer ID</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Operator Notes</label>
                  <input
                    type="text"
                    placeholder="Provide audit context or rationale..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {actionSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
                {actionSuccess}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div>
                {(decision === 'CONFIRMED' || selectedReview.decision === 'CONFIRMED') && (
                  <button
                    type="button"
                    onClick={handleCreateAuthorityAction}
                    disabled={isSubmitting}
                    className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950 transition flex items-center gap-1.5"
                  >
                    <ShieldAlert className="h-3.5 w-3.5" />
                    CREATE AUTHORITY ACTION
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveDecision}
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950 transition flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Save Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {previewImage && (
        <ImageLightboxModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          imageUrl={previewImage.url}
          title={previewImage.title}
          subtitle={previewImage.subtitle}
          attribution={previewImage.attribution}
          tag="Visual Reference"
        />
      )}
    </div>
  );
};

export default ReviewCenterPage;
