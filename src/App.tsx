import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { OverviewPage } from '@/pages/OverviewPage';
import { MapPage } from '@/pages/MapPage';
import { PedestrianSafetyPage } from '@/pages/PedestrianSafetyPage';
import { TrafficPage } from '@/pages/TrafficPage';
import { DefectsPage } from '@/pages/DefectsPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { DigitalTwinPage } from '@/pages/DigitalTwinPage';
import { EdgeQueuePage } from '@/pages/EdgeQueuePage';
import { LiveMonitorPage } from '@/pages/LiveMonitorPage';
import { EventCorrelationPage } from '@/pages/EventCorrelationPage';
import { ReviewCenterPage } from '@/pages/ReviewCenterPage';
import { AuthorityActionCenterPage } from '@/pages/AuthorityActionCenterPage';
import { ReObservationPage } from '@/pages/ReObservationPage';
import { PredictiveIntelligencePage } from '@/pages/PredictiveIntelligencePage';

function App() {
  return (
    <HashRouter>
      <AppLayout>
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
      </AppLayout>
    </HashRouter>
  );
}

export default App;
