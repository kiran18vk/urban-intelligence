import { useNavigate } from 'react-router-dom';
import { 
  Video, 
  Layers, 
  GitMerge, 
  UserCheck, 
  Send, 
  RefreshCw, 
  TrendingUp, 
  Globe, 
  BarChart3, 
  X, 
  ArrowRight,
  Compass
} from 'lucide-react';

interface SIHWorkflowTourModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WorkflowStep {
  step: number;
  title: string;
  badge: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  highlight: string;
  color: string;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: 'Edge AI Perception & Live Monitor',
    badge: 'Edge Perception',
    path: '/live-monitor',
    icon: Video,
    description: 'Real-time multi-task perception pipeline: Traffic, OCR / ANPR, and Road Damage bounding boxes running on simulated bus feeds.',
    highlight: 'Real-time video inference, FPS benchmark, deterministic synthetic overlay.',
    color: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30 text-blue-400'
  },
  {
    step: 2,
    title: 'GIS Intelligence & Defect Registry',
    badge: 'Spatial Indexing',
    path: '/defects',
    icon: Layers,
    description: 'Geospatially clustered road defects, potholes, cracks, and road hazards with automated severity rating and simulated GPS coordinates.',
    highlight: 'Pothole clustering, H3 / geo-hash spatial aggregation, severity matrix.',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/30 text-amber-400'
  },
  {
    step: 3,
    title: 'Multi-Bus Event Correlation',
    badge: 'Cross-Vehicle Consensus',
    path: '/event-correlation',
    icon: GitMerge,
    description: 'Spatio-temporal clustering engine merging observations from multiple buses traveling along intersecting transit routes.',
    highlight: 'DBSCAN clustering, consensus scoring, false-positive elimination.',
    color: 'from-purple-500/20 to-pink-500/20 border-purple-500/30 text-purple-400'
  },
  {
    step: 4,
    title: 'Human Review & Verification Center',
    badge: 'Human-in-the-Loop',
    path: '/review-center',
    icon: UserCheck,
    description: 'Operator review interface providing visual evidence cards, confidence breakdowns, and manual action verification.',
    highlight: 'Zero-hallucination workflow, dual approval queues, audit trails.',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-400'
  },
  {
    step: 5,
    title: 'Authority Alert & Action Center',
    badge: 'Operational Dispatch',
    path: '/authority-actions',
    icon: Send,
    description: 'Protocol-ready authority dispatch routing verified incidents to PWD, Traffic Police, and Municipal Maintenance teams.',
    highlight: 'SLA tracking, priority scoring, automated work-order generation.',
    color: 'from-cyan-500/20 to-sky-500/20 border-cyan-500/30 text-cyan-400'
  },
  {
    step: 6,
    title: 'Closed-Loop Re-Observation',
    badge: 'Outcome Verification',
    path: '/reobservation',
    icon: RefreshCw,
    description: 'Automated verification requesting downstream buses to re-scan repaired road sections and physically confirm defect resolution.',
    highlight: 'Automated re-survey triggers, multi-pass confirmation, resolution audit.',
    color: 'from-teal-500/20 to-emerald-500/20 border-teal-500/30 text-teal-400'
  },
  {
    step: 7,
    title: 'Predictive Urban Intelligence',
    badge: 'Risk Forecasting',
    path: '/predictive',
    icon: TrendingUp,
    description: 'Temporal deterioration forecasting predicting pavement decay, monsoon damage vulnerability, and high-risk traffic zones.',
    highlight: 'Deterioration curves, monsoon surge modeling, proactive interventions.',
    color: 'from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-400'
  },
  {
    step: 8,
    title: 'Urban Digital Twin',
    badge: 'Unified City State',
    path: '/digital-twin',
    icon: Globe,
    description: '3D spatial representation unifying real-time transit telemetry, road health indices, live incidents, and predictive alerts.',
    highlight: 'H3 hexagon mesh, layer toggles, simulated fleet trajectory tracking.',
    color: 'from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-400'
  },
  {
    step: 9,
    title: 'Fleet & City Analytics',
    badge: 'Executive Insights',
    path: '/analytics',
    icon: BarChart3,
    description: 'Comprehensive metrics detailing fleet coverage, detection accuracy benchmarks, SLA resolution rates, and road health trends.',
    highlight: 'Reliability metrics, edge queue store-and-forward telemetry, KPI reports.',
    color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30 text-blue-400'
  }
];

export function SIHWorkflowTourModal({ isOpen, onClose }: SIHWorkflowTourModalProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleNavigate = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ink-800 px-6 py-4 bg-ink-850">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-400 border border-accent-500/20">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Platform Operational Workflow Tour</h3>
              <p className="text-xs text-slate-400">Complete end-to-end intelligence cycle: Edge AI → Verification → Action → Prediction</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-ink-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Workflow Diagram & Steps */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="p-3.5 rounded-xl border border-accent-500/20 bg-accent-500/5 text-xs text-accent-300 flex items-center gap-2">
            <span className="font-semibold">Evaluation Guide:</span> Click any module below to jump directly into the live deterministic workflow for that stage.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {WORKFLOW_STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  onClick={() => handleNavigate(s.path)}
                  className="group relative flex flex-col justify-between p-4 rounded-xl border border-ink-750 bg-ink-850/80 hover:bg-ink-800 hover:border-accent-500/50 transition cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink-700 text-xs font-bold text-slate-300 group-hover:bg-accent-500 group-hover:text-white transition">
                        {s.step}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${s.color}`}>
                        {s.badge}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 my-2">
                      <div className="p-2 rounded-lg bg-ink-750 text-slate-200 group-hover:text-accent-400 transition">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-100 group-hover:text-accent-300 transition line-clamp-1">
                        {s.title}
                      </h4>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                      {s.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-ink-750 flex items-center justify-between text-[10px] text-slate-500 group-hover:text-accent-400">
                    <span className="truncate pr-2 font-mono">{s.highlight}</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-ink-800 px-6 py-3 bg-ink-850 flex items-center justify-between text-xs text-slate-500">
          <span>Prototype urban intelligence platform • Deterministic testbed data & simulated GPS</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-ink-700 text-slate-200 hover:bg-ink-600 transition font-medium"
          >
            Close Tour
          </button>
        </div>
      </div>
    </div>
  );
}
