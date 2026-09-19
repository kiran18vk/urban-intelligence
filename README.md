# AI-Powered Urban Intelligence Platform Using Public Transport Fleet
**Smart India Hackathon (SIH 2026) — Problem Statement PS 26124**

> **Classification**: Prototype Urban Intelligence Platform for Mobile Sensing & Municipal Decision Support  
> **Testbed Focus**: Pune Urban Mobility Testbed (PMPML Transit Fleet Corridor Pilot)  
> **Honesty Notice**: All road geometries, simulated telemetry, and synthetic defect/ANPR datasets are designed for testbed verification. This platform operates as an explainable decision-support system requiring human validation. It does **not** claim live telecom network control, official RTO database integration, automated municipal dispatch certification, or physical repair certification without human review.

---

## 1. Executive Platform Summary

The **AI-Powered Urban Intelligence Platform Using Public Transport Fleet** turns routine public transit bus fleets into distributed, mobile edge perception networks. As transit vehicles traverse urban corridors, onboard multi-task perception models detect road hazards, traffic congestion, pedestrian risk, and license plates.

Observations are processed through an end-to-end traceable operational pipeline:

```
Camera / Video Stream
      │
      ▼
Edge AI Perception (Multi-Task YOLOv8, ByteTrack, OCR)
      │
      ▼
Sensor Reliability Calibration (Lighting, Weather, Occlusion)
      │
      ▼
Urban Events & Offline Store-and-Forward Sync
      │
      ▼
Multi-Bus Spatio-Temporal Correlation (Consensus Scoring)
      │
      ▼
Human-in-the-Loop Review Center (Dual-Approval & Audit)
      │
      ▼
Authority Alert & Action Center (SLA Tracking & Work-Orders)
      │
      ▼
Closed-Loop Re-Observation (Multi-Pass Re-Surveys)
      │
      ▼
Outcome Verification Engine (Resolved / Unresolved / Escalated)
      │
      ▼
Predictive Urban Intelligence (Risk Forecasting & Deterioration Curves)
      │
      ▼
Urban Digital Twin & Corridor GIS Analytics
```

---

## 2. Feature Classification Matrix

To ensure absolute technical transparency for judges and evaluators, all capabilities are classified into three distinct categories:

### A. IMPLEMENTED (Active Algorithmic Code & Production APIs)
1. **Edge AI Perception Pipeline**: Multi-task inference for traffic object detection, lane tracking, ANPR OCR syntax validation, and road damage bounding boxes.
2. **Reliability Calibration Layer**: Operational confidence weighting that discounts raw detection confidence based on environmental and optical degradation factors.
3. **Offline Store-and-Forward Edge Queue**: SQLite persistent buffer guaranteeing zero data loss during simulated edge connectivity blackouts with automatic synchronization on link restoration.
4. **Multi-Bus Event Correlation Engine**: Spatio-temporal clustering (DBSCAN + spatial hashing) correlating observations across overlapping transit corridors to eliminate false positives.
5. **Human Review & Model Feedback Center**: Operator review interface with dual approval queues, evidence inspectors, and exportable feedback datasets for continuous model refinement.
6. **Authority Alert & Action Center**: Protocol-ready operational dispatch assigning verified events to PWD, Traffic Police, and Municipal Maintenance teams with SLA tracking and state validation.
7. **Closed-Loop Re-Observation & Outcome Verification**: Automated re-survey dispatch routing downstream buses to re-scan repair locations and compute empirical resolution scores.
8. **Predictive Urban Intelligence & Risk Forecasting**: Deterministic deterioration curve forecasting, monsoon vulnerability modeling, persistent hotspot detection, and proactive intervention generation.
9. **Urban Digital Twin & Scenario Simulator**: Real-time state engine maintaining road segments, traffic corridors, and assets with interactive what-if simulation models (maintenance, congestion surges, defect escalation).
10. **GIS & MapLibre Mapping**: Geospatial vector mapping with automatic raster fallback, marker clustering, H3 corridor indexing, and deep-linked inspector popups.

### B. SIMULATED / TESTBED (Deterministic Demonstrator Data)
- **Pune PMPML Transit Testbed**: Pilot geometries and corridor waypoints across Pune (FC Road, JM Road, Karve Road, Tilak Road, Pune-Mumbai Highway, Baner-Hinjewadi).
- **Synthetic Bus Telemetry**: Deterministic GPS coordinates, timestamps, speeds, and camera IDs.
- **ANPR Test Dataset**: Synthetic Indian license plate patterns (e.g., `MH-12-XX-0000`) for privacy compliance and pattern validation.
- **Incident Video Streams & Testbed Feeds**: Video assets and synthetic event injection controls for verification.

### C. PROPOSED / FUTURE (Engineering Scope Roadmap)
- **Direct Municipal ERP Linkage**: Bi-directional integration with external legacy government enterprise ERP systems.
- **Official RTO Database Access**: Secured government vehicle registry database lookup.
- **Physical Sensor Fusion**: Sub-surface Ground Penetrating Radar (GPR) and Falling Weight Deflectometer (FWD) integration.

---

## 3. Platform Navigation & Routes

The application uses hash-based client routing (`#/`) ensuring flawless browser refreshes and SPA serving without complex server rewrites:

| Route | Page | Purpose |
| :--- | :--- | :--- |
| `#/` | **Overview Dashboard** | Executive summary, 9-stage operational pipeline overview, KPIs |
| `#/live-monitor` | **Live Monitor** | Real-time multi-task video inference, bounding boxes, FPS metrics |
| `#/defects` | **Road Defects Registry** | Defect clustering, severity ratings, 6-stage lifecycle tracking |
| `#/map` | **Live GIS Map** | MapLibre geospatial viewer with raster fallback and corridor layers |
| `#/event-correlation` | **Event Correlation** | Spatio-temporal multi-bus clustering and consensus metrics |
| `#/review-center` | **Human Review Center** | Human-in-the-loop review queue, evidence cards, audit logs |
| `#/authority-actions` | **Authority Action Center** | SLA tracking, action dispatch, lifecycle transitions |
| `#/reobservation` | **Closed-Loop Re-Observation** | Outcome verification, pre/post comparison, resolution audits |
| `#/predictive` | **Predictive Intelligence** | Deterioration curves, monsoon surge risks, proactive actions |
| `#/digital-twin` | **Urban Digital Twin** | 3D spatial state, H3 hexagon mesh, what-if scenario simulations |
| `#/traffic` | **Traffic Intelligence** | Congestion levels, speed profiles, vehicle classification |
| `#/pedestrian-safety` | **Pedestrian Safety** | High-risk pedestrian zones, conflict hotspots, zebra compliance |
| `#/incidents` | **Incident Response** | Traffic incident logs, ANPR detections, evidence inspector |
| `#/edge-queue` | **Edge Queue** | Offline store-and-forward telemetry, connectivity toggles |
| `#/analytics` | **Fleet & City Analytics** | Historical trends, fleet utilization, reliability benchmarks |

---

## 4. Local Installation & Development

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.10, 3.11, 3.12)
- **Node.js**: 18+ (with npm 9+)
- **OS**: Windows, macOS, or Linux

### Quick Setup

1. **Install Frontend Dependencies & Build Bundle**:
   ```bash
   npm install
   npm run build
   ```

2. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Launch Platform Server**:
   ```bash
   python backend/main.py
   ```
   Open **http://localhost:8000** in your browser.

---

## 5. Automated Test Suite

The platform includes full test suites covering both the AI algorithmic layer and the FastAPI backend layer:

### Run AI Perception & Intelligence Unit Tests (103 Tests)
```bash
python -m unittest discover -s ai
```

### Run Backend API Integration Tests (77 Tests)
```bash
python backend/test_api.py
```

### Run Frontend Production Build Check
```bash
npm run build
```

---

## 6. System Health & Diagnostics

The platform includes a dedicated diagnostic subsystem:
- **`GET /api/system/health`**: Aggregates health status of all 5 SQLite databases (`authority_actions.db`, `reobservation.db`, `predictive_intelligence.db`, `human_review.db`, `edge_queue.db`), 11 AI perception and intelligence engines, and gateway services.
- **`POST /api/system/reset-testbed`**: Deterministic testbed data refresher resetting initial evaluation baseline on demand without modifying core code.
- **Global TopBar**: Live system health indicator, data mode badges, simulated GPS status, edge queue link, and the interactive **Workflow Tour**.

---

## 7. License & Disclosures

Developed for the **Smart India Hackathon 2026** (Problem Statement PS 26124).  
All mock data, simulated GPS paths, and synthetic video frames are strictly designed for prototype evaluation and decision-support demonstration.
