import { lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';

// Route-level lazy loading
const OverviewPage = lazy(() => import('@/pages/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const MapPage = lazy(() => import('@/pages/MapPage').then((m) => ({ default: m.MapPage })));
const PedestrianSafetyPage = lazy(() => import('@/pages/PedestrianSafetyPage').then((m) => ({ default: m.PedestrianSafetyPage })));
const TrafficPage = lazy(() => import('@/pages/TrafficPage').then((m) => ({ default: m.TrafficPage })));
const DefectsPage = lazy(() => import('@/pages/DefectsPage').then((m) => ({ default: m.DefectsPage })));
const IncidentsPage = lazy(() => import('@/pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })));
const DigitalTwinPage = lazy(() => import('@/pages/DigitalTwinPage').then((m) => ({ default: m.DigitalTwinPage })));
const EdgeQueuePage = lazy(() => import('@/pages/EdgeQueuePage').then((m) => ({ default: m.EdgeQueuePage })));
const LiveMonitorPage = lazy(() => import('@/pages/LiveMonitorPage').then((m) => ({ default: m.LiveMonitorPage })));
const EventCorrelationPage = lazy(() => import('@/pages/EventCorrelationPage').then((m) => ({ default: m.EventCorrelationPage })));
const ReviewCenterPage = lazy(() => import('@/pages/ReviewCenterPage').then((m) => ({ default: m.ReviewCenterPage })));
const AuthorityActionCenterPage = lazy(() => import('@/pages/AuthorityActionCenterPage').then((m) => ({ default: m.AuthorityActionCenterPage })));
const ReObservationPage = lazy(() => import('@/pages/ReObservationPage').then((m) => ({ default: m.ReObservationPage })));
const PredictiveIntelligencePage = lazy(() => import('@/pages/PredictiveIntelligencePage').then((m) => ({ default: m.PredictiveIntelligencePage })));

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 animate-fade-in text-slate-400">
      <div className="h-8 w-8 rounded-full border-2 border-accent-500/30 border-t-accent-500 animate-spin" />
      <span className="text-xs font-mono uppercase tracking-wider text-slate-500">Loading Route Module...</span>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/authority-actions" element={<AuthorityActionCenterPage />} />
            <Route path="/reobservation" element={<ReObservationPage />} />
            <Route path="/predictive" element={<PredictiveIntelligencePage />} />
            <Route path="/review-center" element={<ReviewCenterPage />} />
            <Route path="/live-monitor" element={<LiveMonitorPage />} />
            <Route path="/event-correlation" element={<EventCorrelationPage />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/pedestrian-safety" element={<PedestrianSafetyPage />} />
            <Route path="/traffic" element={<TrafficPage />} />
            <Route path="/defects" element={<DefectsPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/digital-twin" element={<DigitalTwinPage />} />
            <Route path="/edge-queue" element={<EdgeQueuePage />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </HashRouter>
  );
}

export default App;
