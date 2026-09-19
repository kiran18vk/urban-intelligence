# AI-Powered Mobile Urban Intelligence Platform Using Public Transport Fleet
**Smart India Hackathon (SIH 2026) — Problem Statement PS 26124**

> **Classification**: Prototype Urban Digital Twin for Mobile Sensing  
> **Notice**: This platform is an edge-assisted, perception-driven urban intelligence prototype tested with realistic Pune City pilot corridors (FC Road, JM Road, Karve Road, Pune-Mumbai Hwy, Senapati Bapat Road). It does **NOT** claim complete city-wide real-world digital-twin sensor coverage; all spatial geometries, simulated telemetry, and synthetic ANPR datasets are designed for testbed verification and demonstration.

---

## 1. Project Overview

The **Urban Intelligence Platform** turns routine public transit bus fleets into distributed, mobile sensing networks. As transit vehicles traverse urban corridors, onboard cameras capture real-time road conditions, traffic density, vehicle interactions, and infrastructure safety metrics.

Edge inference models run locally to detect defects (potholes, cracks), classify vehicle density, detect license plates, and trigger incident alerts. These edge events are synchronized with a FastAPI backend, processed through spatial clustering and reliability calibration layers, and synthesized into a **Mobile Sensing Urban Digital Twin** with interactive "What-If" scenario simulations.

---

## 2. Target Architecture

```
                                +-----------------------------------+
                                |     Edge Bus Fleet Cameras        |
                                | (YOLO, ByteTrack, ANPR, Road AI)  |
                                +-----------------+-----------------+
                                                  | Edge Ingestion
                                                  v
+-----------------------------------------------------------------------------------+
|                                FastAPI Backend                                    |
|  +---------------------+  +---------------------+  +---------------------------+  |
|  |   /api/health       |  |   /api/stats        |  |   /api/buses & /api/events|  |
|  +---------------------+  +---------------------+  +---------------------------+  |
|  +---------------------+  +---------------------+  +---------------------------+  |
|  | /api/defects & road |  | /api/traffic & anpr |  |   /api/incidents          |  |
|  +---------------------+  +---------------------+  +---------------------------+  |
|  +---------------------+  +---------------------+  +---------------------------+  |
|  | /api/analytics      |  | /api/reliability    |  |   /api/digital-twin       |  |
|  +---------------------+  +---------------------+  +---------------------------+  |
|                                                                                   |
|  [Static Asset Mounter] -> Serves Production React dist/ (index.html, /assets/*)  |
+-----------------------------------------+-----------------------------------------+
                                          | Single-URL Serving (Port 8000)
                                          v
+-----------------------------------------------------------------------------------+
|                        React 18 + TypeScript Client SPA                           |
|  - HashRouter client-side routing (no server rewrite required)                    |
|  - MapLibre GL spatial visualization & heatmaps                                   |
|  - Routes: #/ (Overview), #/map, #/traffic, #/defects, #/incidents,               |
|            #/analytics, #/digital-twin                                            |
|  - Resilient API Service Layer (graceful mock data fallback)                      |
+-----------------------------------------------------------------------------------+
```

---

## 3. Local Setup & Requirements

- **Python**: 3.10+ (tested on Python 3.10 / 3.11 / 3.12)
- **Node.js**: 18+ (with npm 9+)
- **OS**: Windows, macOS, or Linux

Clone the repository:
```bash
git clone <repository-url>
cd urban-intelligence
```

---

## 4. Backend Setup

1. Install Python dependencies:
```bash
pip install -r backend/requirements.txt
```
*(Core packages: `fastapi`, `uvicorn`, `pydantic`, `pytest`, `httpx`)*

2. Run backend test suite:
```bash
python backend/test_api.py
```

3. Start backend development server:
```bash
uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 5. Frontend Setup

1. Install Node dependencies:
```bash
npm install
```

2. Start frontend development server:
```bash
npm run dev
```
Development app will run at `http://localhost:5173/` (Vite automatically proxies `/api` requests to `http://127.0.0.1:8000`).

---

## 6. Production Build

To bundle the frontend for production:
```bash
npm run build
```
This compiles TypeScript, bundles React assets, and outputs static production files to the `dist/` folder.

---

## 7. Single-URL Operation

In production mode, the entire platform is served from a single FastAPI server instance:

```bash
# Windows / Linux / macOS
uvicorn backend.main:app --host 0.0.0.0 --port 8000
```
Or via Python directly:
```bash
python backend/main.py
```

Access the single-URL application:
- **Application UI**: `http://127.0.0.1:8000/`
- **Map View**: `http://127.0.0.1:8000/#/map`
- **Traffic Intelligence**: `http://127.0.0.1:8000/#/traffic`
- **Road Defects**: `http://127.0.0.1:8000/#/defects`
- **Incident Intelligence**: `http://127.0.0.1:8000/#/incidents`
- **Analytics**: `http://127.0.0.1:8000/#/analytics`
- **Digital Twin**: `http://127.0.0.1:8000/#/digital-twin`
- **Interactive API Docs (Swagger)**: `http://127.0.0.1:8000/docs`

---

## 8. API Health Endpoint

Check service health at `GET /api/health`:

**Request**:
```http
GET /api/health HTTP/1.1
Host: 127.0.0.1:8000
```

**Response**:
```json
{
  "status": "ok",
  "service": "urban-intelligence-api",
  "environment": "production",
  "timestamp": "2026-09-18T05:30:00.000000+00:00"
}
```

---

## 9. AI Modules

1. **Traffic Perception (`ai/traffic/`)**:
   - YOLOv8/v11 vehicle detection across classes (car, bus, truck, motorcycle, auto-rickshaw).
   - ByteTrack multi-object tracking for persistent ID association and trajectory tracking.
   - Dynamic density estimation and congestion index calculation.

2. **ANPR & OCR Engine (`ai/anpr/`)**:
   - High-precision license plate region bounding and character segmentation.
   - Regular expression validation conforming to Indian standard registration formats (e.g., `MH-12-XX-0000`).
   - Synthetic test generator for edge verification.

3. **Road Damage Perception (`ai/road_damage/`)**:
   - Multi-defect classification (potholes, longitudinal/transverse cracks, surface alligatoring).
   - Severity scoring based on bounding box dimensions and road footprint ratios.

4. **Reliability & Calibration Layer (`ai/reliability/`)**:
   - Multimodal confidence recalibration combining optical confidence, environmental conditions, and camera angle.
   - Dampens false positives and filters transient occlusions before spatial persistence.

---

## 10. GIS & Spatial Perception Engine

- **Spatial Geometries**: Real-world pilot coordinates covering key Pune transport corridors.
- **DBSCAN / Spatial Clustering**: Consolidates multiple sightings of the same pothole or defect from multiple bus passes into a canonical defect entity.
- **MapLibre GL Integration**: Vector tile rendering, layer toggles, real-time vehicle breadcrumbs, and defect heatmaps.

---

## 11. Incident Intelligence

- **Automated Trigger Detection**: Detects suspect incidents such as hit-and-run departures, lane blockages, and severe congestion bottlenecks.
- **Human-in-the-Loop Review**: Incident workflow transitions (`NEW` &rarr; `REVIEW` &rarr; `RESOLVED`) requiring human operator oversight before municipal dispatch.

---

## 12. Analytics Suite

- **Fleet Utilization**: Real-time tracking of active bus fleets, mileage, and camera uptimes.
- **Corridor Transit Times**: Delay estimation and peak-hour congestion curves.
- **Defect Density**: Longitudinal progression tracking of road deterioration.

---

## 13. Urban Digital Twin & What-If Simulator

- **Entity Model**: Digital representations of road segments (`TwinRoadSegment`), traffic zones (`TwinTrafficZone`), and urban assets (`TwinUrbanAsset`).
- **State Updates**: Real-time ingestion of mobile observations updating segment health scores and delay estimates.
- **What-If Simulation Engine**:
  - *Congestion Surge*: Evaluates impact of sudden density spikes on downstream corridor transit times.
  - *Road Defect Cluster*: Models road condition index degradation and computes maintenance advisory thresholds.

---

## 14. Real vs. Simulated Components

| Component | Nature / Implementation Status |
| :--- | :--- |
| **YOLO Detection & Tracking Logic** | Real algorithmic implementation (`ai/traffic`, `ai/road_damage`) |
| **ANPR / OCR Logic & Format Validator** | Real algorithmic implementation (`ai/anpr`) |
| **Reliability Scoring & Calibration** | Real algorithmic math (`ai/reliability`) |
| **Digital Twin Simulation Engine** | Real deterministic model (`ai/digital_twin`) |
| **GPS Telemetry & Transit Feeds** | Deterministic simulation across Pune pilot corridors |
| **License Plate Test Datasets** | Synthetic/demo test plates for privacy compliance |
| **Incident Triggers** | Algorithmic triggers with simulated video streams |
| **Municipal Dispatch** | Human review required; advisory alerts |

---

## 15. Known Limitations

1. **Hardware Edge Sensing**: Live camera ingestion in this repository uses simulated video and test image feeds; on-vehicle edge deployment requires Jetson/Raspberry Pi hardware interfacing.
2. **City-Wide Coverage**: The digital twin covers demonstrator pilot corridors; full metropolitan scaling requires fleet-wide telematics integration.
3. **Environmental Variability**: Extreme weather (monsoon downpours, glare) uses calibration confidence dampening rather than specialized radar/LiDAR fusion.

---

## 16. Render Cloud Deployment (Single Web Service)

The platform is packaged as a **single unified Web Service** using a multi-stage Docker build. Render builds the React production dist in Stage 1 and serves both the API and the single-page application directly from FastAPI in Stage 2.

### Architecture Comparison

| Execution Mode | Role & Capabilities | Hardware / Runtime |
| :--- | :--- | :--- |
| **Local Development** | Full developer debugging, Vite HMR, pytest suites, backend hot reload. | Local PC / Workstation |
| **Render Demo Deployment** | Cloud-hosted single-URL command center, REST API, GIS map, Digital Twin simulation, testbed demonstration. | Render Free Web Service (Docker container) |
| **Edge AI Inference** | Heavy GPU/NPU video stream processing (YOLO, ByteTrack, EasyOCR). | On-bus Edge Hardware (Jetson Orin, Raspberry Pi 5) |

### Deployment Configuration

- **Service Type**: Render Web Service (`render.yaml`)
- **Runtime**: Docker (`./Dockerfile`)
- **Plan**: Free / Hobby
- **Health Check Path**: `/api/health`
- **Build Sequence (Multi-stage Dockerfile)**:
  - *Stage 1 (Frontend)*: `npm ci && npm run build` (outputs `dist/`)
  - *Stage 2 (Backend)*: `pip install -r backend/requirements.txt`
- **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`

### Environment Variables

| Variable Name | Purpose | Recommended Production Value |
| :--- | :--- | :--- |
| `ENVIRONMENT` | Declares operational environment | `production` |
| `VITE_API_BASE_URL` | Frontend API target (build-time) | `/api` |
| `PORT` | Dynamic web port assigned by Render | Automatically injected by Render |
| `CORS_ORIGINS` | Allowed external origins (optional) | Leave empty or set specific domain |

### Free-Tier Behavior
- On Render's Free tier, the service automatically spins down after 15 minutes of inactivity. Incoming HTTP requests wake the service in approximately 30–50 seconds.
- Heavy continuous GPU inference is not executed on the free cloud instance; cloud deployment hosts the operational dashboard, GIS layers, analytical algorithms, and Digital Twin scenario modeling.
