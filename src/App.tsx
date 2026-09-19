import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { OverviewPage } from '@/pages/OverviewPage';
import { MapPage } from '@/pages/MapPage';
import { TrafficPage } from '@/pages/TrafficPage';
import { DefectsPage } from '@/pages/DefectsPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { DigitalTwinPage } from '@/pages/DigitalTwinPage';

function App() {
  return (
    <HashRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/traffic" element={<TrafficPage />} />
          <Route path="/defects" element={<DefectsPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/digital-twin" element={<DigitalTwinPage />} />
        </Routes>
      </AppLayout>
    </HashRouter>
  );
}

export default App;
