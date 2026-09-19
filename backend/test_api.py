"""
Automated validation test for all FastAPI endpoints (Phase 1 through Phase 9).
"""
import sys
import time
import uuid
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

ENDPOINTS = [
    ("/api/health", 200),
    ("/api/stats/overview", 200),
    ("/api/buses", 200),
    ("/api/buses/PMP-BUS-001", 200),
    ("/api/buses/non-existent-id", 404),
    ("/api/events", 200),
    ("/api/events/recent", 200),
    ("/api/events/EVT-00001", 200),
    ("/api/events/non-existent-id", 404),
    ("/api/defects", 200),
    ("/api/defects/DEF-0001", 200),
    ("/api/defects/non-existent-id", 404),
    ("/api/traffic/congestion", 200),
    ("/api/incidents", 200),
    ("/api/incidents/recent", 200),
    ("/api/incidents/INC-DEMO-0001", 200),
    ("/api/incidents/non-existent-id", 404),
    ("/api/analytics/summary", 200),
    ("/api/analytics/fleet", 200),
    ("/api/analytics/traffic", 200),
    ("/api/analytics/routes", 200),
    ("/api/analytics/congestion", 200),
    ("/api/analytics/hourly-trend", 200),
    ("/api/analytics/weekly-defects", 200),
    ("/api/analytics/area-distribution", 200),
    ("/api/analytics/event-types", 200),
    ("/api/ai/traffic/status", 200),
    ("/api/ai/anpr/status", 200),
    ("/api/ai/road-damage/status", 200),
    ("/api/ai/reliability/status", 200),
    ("/api/digital-twin/state", 200),
    ("/api/digital-twin/summary", 200),
    ("/api/digital-twin/roads", 200),
    ("/api/digital-twin/traffic", 200),
    ("/api/digital-twin/fleet", 200),
    ("/api/digital-twin/assets", 200),
    ("/api/digital-twin/observations", 200),
    ("/api/digital-twin/entity/ROAD-01", 200),
    ("/api/digital-twin/entity/non-existent-id", 404),
    ("/api/edge/queue/status", 200),
    ("/api/edge/queue/events", 200),
    ("/api/edge/queue/health", 200),
    ("/api/live-monitor/status", 200),
    ("/api/event-correlation/summary", 200),
    ("/api/event-correlation/events", 200),
    ("/api/event-correlation/health", 200),
    ("/api/reviews/summary", 200),
    ("/api/reviews/queue", 200),
    ("/api/reviews/feedback", 200),
    ("/api/reviews/health", 200),
    ("/api/authority-actions/summary", 200),
    ("/api/authority-actions/queue", 200),
    ("/api/authority-actions/health", 200),
    ("/api/reobservation/summary", 200),
    ("/api/reobservation/queue", 200),
    ("/api/reobservation/health", 200),
    ("/api/predictive/summary", 200),
    ("/api/predictive/forecasts", 200),
    ("/api/predictive/warnings", 200),
    ("/api/predictive/hotspots", 200),
    ("/api/predictive/health", 200),
    ("/api/system/health", 200),
]


def test_post_event_from_detection():
    payload = {
        "event_type": "ROAD_POTHOLE",
        "confidence": 0.76,
        "detection": {
            "class_name": "pothole",
            "bbox": [120.0, 80.0, 350.0, 240.0],
        },
        "bus_id": "PMP-BUS-001",
        "camera_id": "CAM-FRONT-01",
        "frame_index": 42,
        "timestamp_sec": 1.68,
    }
    res = client.post("/api/events/from-detection", json=payload)
    assert res.status_code == 200, f"Failed: {res.text}"
    data = res.json()
    assert data["event_type"] == "ROAD_POTHOLE"
    assert data["severity"] == "HIGH"
    assert data["confidence"] == 0.76
    assert data["gps"]["is_simulated"] is True
    assert data["event_id"].startswith("EVT-")
    assert "reliability" in data
    assert data["operational_confidence"] <= data["confidence"]
    print(" [PASS] POST /api/events/from-detection -> 200 (created event: " + data["event_id"] + ")")


def test_events_recent_filtering():
    # 1. Base endpoint
    res = client.get("/api/events/recent")
    assert res.status_code == 200
    events = res.json()
    assert len(events) >= 1
    assert "gps" in events[0]
    assert events[0]["gps"]["is_simulated"] is True
    assert "reliability" in events[0]
    assert "operational_confidence" in events[0]
    assert events[0]["operational_confidence"] <= events[0]["confidence"]
    print(" [PASS] GET /api/events/recent -> 200 (returned " + str(len(events)) + " events)")

    # 2. Filter by event_type
    res = client.get("/api/events/recent?event_type=ROAD_POTHOLE")
    assert res.status_code == 200
    potholes = res.json()
    assert all(e["event_type"] == "ROAD_POTHOLE" for e in potholes)
    print(" [PASS] GET /api/events/recent?event_type=ROAD_POTHOLE -> 200 (filtered)")

    # 3. Filter by severity
    res = client.get("/api/events/recent?severity=HIGH")
    assert res.status_code == 200
    highs = res.json()
    assert all(e["severity"] == "HIGH" for e in highs)
    print(" [PASS] GET /api/events/recent?severity=HIGH -> 200 (filtered)")

    # 4. Filter by event_type + severity
    res = client.get("/api/events/recent?event_type=ROAD_POTHOLE&severity=HIGH")
    assert res.status_code == 200
    combined = res.json()
    assert all(e["event_type"] == "ROAD_POTHOLE" and e["severity"] == "HIGH" for e in combined)
    print(" [PASS] GET /api/events/recent?event_type=ROAD_POTHOLE&severity=HIGH -> 200 (combined)")

    # 5. Invalid event_type returns 400
    res = client.get("/api/events/recent?event_type=INVALID_TYPE")
    assert res.status_code == 400
    print(" [PASS] GET /api/events/recent?event_type=INVALID_TYPE -> 400 (validated)")

    # 6. Invalid severity returns 400
    res = client.get("/api/events/recent?severity=SUPER_HIGH")
    assert res.status_code == 400
    print(" [PASS] GET /api/events/recent?severity=SUPER_HIGH -> 400 (validated)")

    # 7. Get demo event by ID
    res = client.get("/api/events/EVT-DEMO-0001")
    assert res.status_code == 200
    demo_evt = res.json()
    assert demo_evt["event_id"] == "EVT-DEMO-0001"
    assert demo_evt["event_type"] == "ROAD_POTHOLE"
    print(" [PASS] GET /api/events/EVT-DEMO-0001 -> 200 (fetched demo urban event)")


def test_incident_endpoints():
    # 1. GET /api/incidents/recent
    res = client.get("/api/incidents/recent")
    assert res.status_code == 200
    incidents = res.json()
    assert len(incidents) >= 1
    assert "gps" in incidents[0]
    assert incidents[0]["gps"]["is_simulated"] is True
    assert "operational_confidence" in incidents[0]
    assert incidents[0]["operational_confidence"] <= incidents[0]["confidence"]
    print(" [PASS] GET /api/incidents/recent -> 200 (returned " + str(len(incidents)) + " incidents)")

    # 2. Filter by severity
    res = client.get("/api/incidents/recent?severity=CRITICAL")
    assert res.status_code == 200
    crits = res.json()
    assert all(i["severity"] == "CRITICAL" for i in crits)
    print(" [PASS] GET /api/incidents/recent?severity=CRITICAL -> 200 (filtered)")

    # 3. Filter by status
    res = client.get("/api/incidents/recent?status=NEW")
    assert res.status_code == 200
    news = res.json()
    assert all(i["status"] == "NEW" for i in news)
    print(" [PASS] GET /api/incidents/recent?status=NEW -> 200 (filtered)")

    # 4. POST /api/incidents/from-trigger
    trigger_payload = {
        "trigger_type": "HIT_AND_RUN_SUSPECT",
        "track_id": 99,
        "confidence": 0.85,
        "description": "Suspicious rapid departure after interaction",
        "bus_id": "PMP-BUS-001",
        "camera_id": "CAM-FRONT-01",
        "plate_text": "SYNTHETIC-DEMO-X",
        "is_demo": True,
    }
    res = client.post("/api/incidents/from-trigger", json=trigger_payload)
    assert res.status_code == 200
    created = res.json()
    assert created["incident_id"].startswith("INC-")
    assert created["plate_text"] == "SYNTHETIC-DEMO-X"
    assert created["status"] == "NEW"
    print(" [PASS] POST /api/incidents/from-trigger -> 200 (created: " + created["incident_id"] + ")")

    # 5. PATCH status transition NEW -> REVIEW
    res = client.patch(f"/api/incidents/{created['incident_id']}/status", json={"status": "REVIEW"})
    assert res.status_code == 200
    updated = res.json()
    assert updated["status"] == "REVIEW"
    print(" [PASS] PATCH /api/incidents/{id}/status -> 200 (updated to REVIEW)")


def test_analytics_endpoints():
    # 1. Summary
    res = client.get("/api/analytics/summary")
    assert res.status_code == 200
    data = res.json()
    assert "fleet" in data
    assert "events" in data
    assert "traffic" in data
    assert "corridors" in data
    assert "reliability" in data
    assert "data_source" in data
    assert len(data["corridors"]) >= 1
    print(" [PASS] GET /api/analytics/summary -> 200 (fleet, events, corridors verified)")

    # 2. Fleet
    res = client.get("/api/analytics/fleet")
    assert res.status_code == 200
    fleet = res.json()["fleet"]
    assert fleet["total_buses"] >= 1
    assert "fleet_utilization_pct" in fleet
    print(" [PASS] GET /api/analytics/fleet -> 200 (utilization: " + str(fleet["fleet_utilization_pct"]) + "%)")

    # 3. Traffic & Distribution
    res = client.get("/api/analytics/traffic")
    assert res.status_code == 200
    traffic = res.json()["traffic"]
    assert "vehicle_distribution" in traffic
    assert len(traffic["vehicle_distribution"]) >= 1
    print(" [PASS] GET /api/analytics/traffic -> 200 (vehicle classes: " + str(len(traffic["vehicle_distribution"])) + ")")

    # 4. Routes
    res = client.get("/api/analytics/routes")
    assert res.status_code == 200
    routes = res.json()
    assert len(routes) >= 1
    assert "estimated_delay_min" in routes[0]
    print(" [PASS] GET /api/analytics/routes -> 200 (" + str(len(routes)) + " corridors returned)")


def test_digital_twin_endpoints():
    # 1. Summary snapshot
    res = client.get("/api/digital-twin/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "roads" in summary
    assert "traffic_zones" in summary
    assert "assets" in summary
    assert "disclaimer" in summary
    assert len(summary["roads"]) >= 1
    print(" [PASS] GET /api/digital-twin/summary -> 200 (roads, zones, assets verified)")

    # 2. Roads
    res = client.get("/api/digital-twin/roads")
    assert res.status_code == 200
    roads = res.json()
    assert len(roads) >= 1
    assert "condition_state" in roads[0]
    assert "freshness" in roads[0]
    print(" [PASS] GET /api/digital-twin/roads -> 200 (" + str(len(roads)) + " road segments)")

    # 3. Traffic
    res = client.get("/api/digital-twin/traffic")
    assert res.status_code == 200
    zones = res.json()
    assert len(zones) >= 1
    assert "congestion_level" in zones[0]
    print(" [PASS] GET /api/digital-twin/traffic -> 200 (" + str(len(zones)) + " traffic zones)")

    # 4. Assets
    res = client.get("/api/digital-twin/assets")
    assert res.status_code == 200
    assets = res.json()
    assert len(assets) >= 1
    assert "asset_type" in assets[0]
    print(" [PASS] GET /api/digital-twin/assets -> 200 (" + str(len(assets)) + " urban assets)")

    # 5. What-If Simulation - Road Defect
    defect_sim = {
        "scenario_type": "ROAD_DEFECT",
        "target_id": "ROAD-01",
        "parameters": {"additional_defects": 3},
    }
    res = client.post("/api/digital-twin/simulate", json=defect_sim)
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_type"] == "ROAD_DEFECT"
    assert "delta" in data
    assert "disclaimer" in data
    print(" [PASS] POST /api/digital-twin/simulate (ROAD_DEFECT) -> 200 (delta: " + str(data["delta"]) + ")")

    # 6. What-If Simulation - Congestion Surge
    congestion_sim = {
        "scenario_type": "CONGESTION_SURGE",
        "target_id": "ZONE-02",
        "parameters": {"target_congestion_level": "HIGH"},
    }
    res = client.post("/api/digital-twin/simulate", json=congestion_sim)
    assert res.status_code == 200
    data = res.json()
    assert data["scenario_type"] == "CONGESTION_SURGE"
    assert "delay_increase_min" in data["delta"]
    print(" [PASS] POST /api/digital-twin/simulate (CONGESTION_SURGE) -> 200 (delay increase: +" + str(data["delta"]["delay_increase_min"]) + " min)")

    # 6. Test MAINTENANCE_INTERVENTION Simulation
    sim_maint_res = client.post(
        "/api/digital-twin/simulate",
        json={
            "scenario_type": "MAINTENANCE_INTERVENTION",
            "target_id": "ROAD-02",
            "parameters": {"defects_to_repair": 2, "unit_cost_inr": 12500},
        },
    )
    assert sim_maint_res.status_code == 200
    maint_data = sim_maint_res.json()
    assert maint_data["scenario_type"] == "MAINTENANCE_INTERVENTION"
    assert "defect_reduction" in maint_data["delta"]
    print(" [PASS] POST /api/digital-twin/simulate (MAINTENANCE_INTERVENTION) -> 200 (defect reduction: " + str(maint_data["delta"]["defect_reduction"]) + ")")

    # 7. Test DEFECT_ESCALATION Simulation
    sim_esc_res = client.post(
        "/api/digital-twin/simulate",
        json={
            "scenario_type": "DEFECT_ESCALATION",
            "target_id": "ROAD-04",
            "parameters": {"delay_days": 60},
        },
    )
    assert sim_esc_res.status_code == 200
    esc_data = sim_esc_res.json()
    assert esc_data["scenario_type"] == "DEFECT_ESCALATION"
    assert "cost_escalation_pct" in esc_data["delta"]
    print(" [PASS] POST /api/digital-twin/simulate (DEFECT_ESCALATION) -> 200 (escalation penalty: +" + str(esc_data["delta"]["cost_escalation_pct"]) + "%)")

    # 8. Test Defect Lifecycle PATCH
    patch_defect_res = client.patch(
        "/api/defects/DEF-0001/status",
        json={"status": "PRIORITIZED", "note": "Assigned high priority in queue"},
    )
    assert patch_defect_res.status_code == 200
    defect_obj = patch_defect_res.json()
    assert defect_obj["status"] == "prioritized"
    print(" [PASS] PATCH /api/defects/DEF-0001/status -> 200 (updated to PRIORITIZED)")


def test_phase9_production_integration():
    """Phase 9 specific tests: health format, docs, root, assets, and route isolation."""
    # 1. Health check payload contract
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ok"
    assert data.get("service") == "urban-intelligence-api"
    assert data.get("environment") in ["development", "production"]
    assert "timestamp" in data
    # Verify ISO timestamp parsing
    datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    # Verify no secrets or sensitive keys exposed
    assert "secret" not in str(data).lower()
    assert "password" not in str(data).lower()
    assert "key" not in data
    print(" [PASS] Phase 9: GET /api/health format contract verified")

    # 2. Docs verification
    docs_res = client.get("/docs")
    assert docs_res.status_code == 200
    assert "swagger" in docs_res.text.lower() or "html" in docs_res.headers.get("content-type", "")
    print(" [PASS] Phase 9: GET /docs -> 200 (Swagger UI available)")

    api_docs_res = client.get("/api/docs", follow_redirects=True)
    assert api_docs_res.status_code == 200
    print(" [PASS] Phase 9: GET /api/docs -> 200 (Docs redirect alias verified)")

    # 3. Root SPA serving
    root_res = client.get("/")
    assert root_res.status_code == 200
    print(" [PASS] Phase 9: GET / -> 200 (Root entrypoint verified)")

    # 4. Static assets serving check
    dist_assets = list((BASE_DIR.parent / "dist" / "assets").glob("*.js")) + list((BASE_DIR.parent / "dist" / "assets").glob("*.css"))
    if dist_assets:
        asset_name = dist_assets[0].name
        asset_res = client.get(f"/assets/{asset_name}")
        assert asset_res.status_code == 200
        print(f" [PASS] Phase 9: GET /assets/{asset_name} -> 200 (Static asset serving verified)")

    # 5. API Route Isolation: Unmatched /api/* routes must return 404 and NEVER be intercepted by SPA index.html
    unmatched_res = client.get("/api/nonexistent-route-xyz")
    assert unmatched_res.status_code == 404
    assert unmatched_res.headers.get("content-type", "").startswith("application/json")
    print(" [PASS] Phase 9: GET /api/nonexistent-route-xyz -> 404 JSON (API route isolation verified)")


def test_pedestrian_risk_endpoints():
    # 1. GET /api/pedestrian-risk/hotspots
    res = client.get("/api/pedestrian-risk/hotspots")
    assert res.status_code == 200
    hotspots = res.json()
    assert len(hotspots) >= 3
    h0 = hotspots[0]
    assert "current_risk_score" in h0
    assert "risk_level" in h0
    assert "data_sufficiency" in h0
    assert "trend" in h0
    assert "risk_factors" in h0
    assert "recommendations" in h0
    assert "consensus_status" in h0
    assert "unique_bus_count" in h0
    assert "confirming_bus_ids" in h0
    assert "consensus_strength" in h0
    assert "consensus_freshness" in h0
    assert h0["disclaimer"] == "Prototype risk score based on observed indicators"
    
    # Check multi-bus consensus hotspot (Karve Road)
    karve = next((h for h in hotspots if "Karve" in h["name"]), None)
    assert karve is not None
    assert karve["consensus_status"] == "MULTI_BUS_CONSENSUS"
    assert karve["unique_bus_count"] == 4
    assert len(karve["confirming_bus_ids"]) == 4

    # Check multi-bus corroboration hotspot (Shivajinagar)
    shivaji = next((h for h in hotspots if "Shivajinagar" in h["name"]), None)
    assert shivaji is not None
    assert shivaji["consensus_status"] == "MULTI_BUS_CORROBORATION"
    assert shivaji["unique_bus_count"] == 2

    # Check single-bus observation hotspot (FC Road)
    fc = next((h for h in hotspots if "Fergusson" in h["name"] or "FC" in h["name"]), None)
    assert fc is not None
    assert fc["consensus_status"] == "SINGLE_BUS_OBSERVATION"
    assert fc["unique_bus_count"] == 1

    print(f" [PASS] GET /api/pedestrian-risk/hotspots -> 200 ({len(hotspots)} hotspots returned with consensus data)")

    # 2. Filter by level
    res = client.get("/api/pedestrian-risk/hotspots?level=HIGH")
    assert res.status_code == 200
    high_spots = res.json()
    assert all(h["risk_level"] == "HIGH" for h in high_spots)
    print(" [PASS] GET /api/pedestrian-risk/hotspots?level=HIGH -> 200 (filtered)")

    # 3. GET /api/pedestrian-risk/hotspots/{id}
    res = client.get(f"/api/pedestrian-risk/hotspots/{h0['hotspot_id']}")
    assert res.status_code == 200
    assert res.json()["hotspot_id"] == h0["hotspot_id"]
    assert "consensus_status" in res.json()
    print(f" [PASS] GET /api/pedestrian-risk/hotspots/{h0['hotspot_id']} -> 200")

    # 4. 404 on non-existent hotspot
    res = client.get("/api/pedestrian-risk/hotspots/NON-EXISTENT-ID")
    assert res.status_code == 404
    print(" [PASS] GET /api/pedestrian-risk/hotspots/NON-EXISTENT-ID -> 404")

    # 5. GET /api/pedestrian-risk/summary
    res = client.get("/api/pedestrian-risk/summary")
    assert res.status_code == 200
    summary = res.json()
    assert "total_hotspots" in summary
    assert "high_critical_count" in summary
    assert "peak_observed_period" in summary
    assert "single_bus_count" in summary
    assert "multi_bus_corroborated_count" in summary
    assert "multi_bus_consensus_count" in summary
    assert "average_independent_buses" in summary
    assert summary["single_bus_count"] >= 1
    assert summary["multi_bus_corroborated_count"] >= 1
    assert summary["multi_bus_consensus_count"] >= 1
    print(" [PASS] GET /api/pedestrian-risk/summary -> 200 (consensus metrics verified)")

    # 6. GET /api/pedestrian-risk/timeseries
    res = client.get("/api/pedestrian-risk/timeseries")
    assert res.status_code == 200
    ts = res.json()
    assert len(ts["time_distribution"]) == 4
    print(" [PASS] GET /api/pedestrian-risk/timeseries -> 200")

    # 7. POST /api/pedestrian-risk/simulate
    res = client.post(
        "/api/pedestrian-risk/simulate",
        json={"hotspot_id": h0["hotspot_id"], "scenario_type": "CROSSING_IMPROVEMENT"},
    )
    assert res.status_code == 200
    sim = res.json()
    assert sim["score_delta"] == -18
    assert sim["simulated_score"] < sim["baseline_score"]
    assert sim["disclaimer"] == "Scenario estimate — decision support only"
    print(" [PASS] POST /api/pedestrian-risk/simulate -> 200 (delta: " + str(sim["score_delta"]) + ")")


def test_edge_queue_endpoints():
    # 1. GET /api/edge/queue/status
    res = client.get("/api/edge/queue/status")
    assert res.status_code == 200
    st = res.json()
    assert "connectivity" in st
    assert "pending" in st
    assert "syncing" in st
    assert "failed" in st
    assert "synced" in st
    assert "queue_capacity" in st
    print(f" [PASS] GET /api/edge/queue/status -> 200 (connectivity: {st['connectivity']}, pending: {st['pending']})")

    # 2. GET /api/edge/queue/events
    res = client.get("/api/edge/queue/events")
    assert res.status_code == 200
    events = res.json()
    assert isinstance(events, list)
    print(f" [PASS] GET /api/edge/queue/events -> 200 ({len(events)} events listed)")

    # 3. POST /api/edge/queue/connectivity -> Set OFFLINE simulation
    res = client.post("/api/edge/queue/connectivity", json={"state": "OFFLINE"})
    assert res.status_code == 200
    assert res.json()["current_connectivity"] == "OFFLINE"
    assert res.json()["is_simulation_active"] is True
    print(" [PASS] POST /api/edge/queue/connectivity -> 200 (switched to OFFLINE simulation)")

    # 4. POST /api/edge/queue/enqueue while OFFLINE
    test_evt_id = f"EVT-OFFLINE-TEST-{int(datetime.now().timestamp() * 1000)}"
    payload = {
        "event_id": test_evt_id,
        "event_type": "ROAD_POTHOLE",
        "bus_id": "PMP-BUS-001",
        "camera_id": "CAM-FRONT-01",
        "latitude": 18.5204,
        "longitude": 73.8567,
        "confidence": 0.88,
        "severity": "HIGH",
        "evidence_reference": "assets/road-defects/pothole-real-01.jpg",
    }
    res = client.post("/api/edge/queue/enqueue", json=payload)
    assert res.status_code == 200
    queued = res.json()
    assert queued["event_id"] == test_evt_id
    assert queued["status"] == "PENDING"
    print(f" [PASS] POST /api/edge/queue/enqueue (OFFLINE) -> 200 (queued as PENDING: {queued['queue_id']})")

    # 5. POST /api/events/from-detection while OFFLINE (verifies end-to-end integration)
    detection_payload = {
        "event_type": "ROAD_CRACK",
        "confidence": 0.74,
        "detection": {"class_name": "crack", "bbox": [100.0, 100.0, 200.0, 200.0]},
        "bus_id": "PMP-BUS-007",
        "camera_id": "CAM-FRONT-01",
    }
    res_det = client.post("/api/events/from-detection", json=detection_payload)
    assert res_det.status_code == 200
    det_event = res_det.json()
    assert det_event.get("queue_status") == "PENDING"
    assert det_event.get("sync_status") == "QUEUED_LOCALLY"
    print(" [PASS] POST /api/events/from-detection while OFFLINE -> 200 (automatically stored in edge queue)")

    # 6. POST /api/edge/queue/connectivity -> Return ONLINE (triggers automatic sync)
    res_online = client.post("/api/edge/queue/connectivity", json={"state": "ONLINE"})
    assert res_online.status_code == 200
    assert res_online.json()["current_connectivity"] == "ONLINE"
    print(" [PASS] POST /api/edge/queue/connectivity -> 200 (switched back to ONLINE, triggered auto-sync)")

    # 7. Check that events synced
    res_status2 = client.get("/api/edge/queue/status")
    assert res_status2.status_code == 200
    st2 = res_status2.json()
    assert st2["synced"] >= 1
    print(f" [PASS] Edge sync confirmed: {st2['synced']} events synced to central platform")

    # 8. GET /api/edge/queue/health
    res_health = client.get("/api/edge/queue/health")
    assert res_health.status_code == 200
    health = res_health.json()
    assert health["status"] == "healthy"
    assert health["db_exists"] is True
    print(" [PASS] GET /api/edge/queue/health -> 200 (SQLite store healthy)")

    # 9. Clear simulation override
    client.post("/api/edge/queue/connectivity", json={"state": "AUTO"})


def test_live_monitor_endpoints():
    res = client.get("/api/live-monitor/status?bus_id=PMP-BUS-001&camera_id=CAM-FRONT-01")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert "stream" in data
    assert data["stream"]["status"] == "TEST_STREAM"
    assert "Prototype" in data["stream"]["label"] or "Test Stream" in data["stream"]["label"]
    assert "ai_status" in data
    assert data["ai_status"]["traffic_analysis"] is True
    assert data["ai_status"]["road_damage_analysis"] is True
    assert data["ai_status"]["reliability_scoring"] is True
    assert "current_observations" in data
    assert "reliability" in data["current_observations"]
    assert "traffic" in data["current_observations"]
    assert "pedestrian_risk" in data["current_observations"]
    assert "road_damage" in data["current_observations"]
    assert "anpr" in data["current_observations"]
    assert "connectivity" in data
    assert "fleet_overview" in data
    assert len(data["fleet_overview"]) >= 4
    assert "latest_events" in data
    print(" [PASS] GET /api/live-monitor/status -> 200 (Live monitor full state verified)")


def test_event_correlation_endpoints():
    # 1. Summary check
    res_summary = client.get("/api/event-correlation/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_correlated_events"] >= 4
    assert summary["multi_bus_consensus"] >= 1
    assert summary["average_independent_buses"] >= 1.0
    assert "disclaimer" in summary
    print(" [PASS] GET /api/event-correlation/summary -> 200 (Summary metrics verified)")

    # 2. Events list & filtering
    res_events = client.get("/api/event-correlation/events")
    assert res_events.status_code == 200
    events = res_events.json()
    assert len(events) >= 4
    first_id = events[0]["correlation_id"]

    res_filtered = client.get("/api/event-correlation/events?event_type=ROAD_POTHOLE")
    assert res_filtered.status_code == 200
    potholes = res_filtered.json()
    assert len(potholes) >= 1
    assert all(p["event_type"] == "ROAD_POTHOLE" for p in potholes)
    print(" [PASS] GET /api/event-correlation/events?event_type=ROAD_POTHOLE -> 200 (Filtered)")

    # 3. Single event lookup
    res_single = client.get(f"/api/event-correlation/events/{first_id}")
    assert res_single.status_code == 200
    single = res_single.json()
    assert single["correlation_id"] == first_id
    assert "explanation" in single
    assert "canonical_location" in single
    print(f" [PASS] GET /api/event-correlation/events/{first_id} -> 200 (Single item lookup)")

    # 4. Source event audit
    res_sources = client.get(f"/api/event-correlation/source-events/{first_id}")
    assert res_sources.status_code == 200
    sources = res_sources.json()
    assert "source_events" in sources
    assert len(sources["source_events"]) >= 1
    print(f" [PASS] GET /api/event-correlation/source-events/{first_id} -> 200 (Source observations audited)")

    # 5. Recompute
    res_recompute = client.post("/api/event-correlation/recompute")
    assert res_recompute.status_code == 200
    assert res_recompute.json()["status"] == "ok"
    print(" [PASS] POST /api/event-correlation/recompute -> 200 (Recompute verified)")


def test_human_review_endpoints():
    # 1. Summary
    res_summary = client.get("/api/reviews/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total"] >= 5
    assert "confirmation_rate" in summary
    print(" [PASS] GET /api/reviews/summary -> 200 (Review summary metrics verified)")

    # 2. Queue with pagination and filtering
    res_queue = client.get("/api/reviews/queue?page=1&page_size=10")
    assert res_queue.status_code == 200
    q_data = res_queue.json()
    assert "items" in q_data
    assert len(q_data["items"]) >= 1
    target_review = q_data["items"][0]
    rev_id = target_review["review_id"]
    print(" [PASS] GET /api/reviews/queue -> 200 (Paginated queue verified)")

    # 3. Get single review
    res_single = client.get(f"/api/reviews/{rev_id}")
    assert res_single.status_code == 200
    assert res_single.json()["review_id"] == rev_id
    print(f" [PASS] GET /api/reviews/{rev_id} -> 200 (Single item lookup verified)")

    # 4. Enqueue a new test review item
    create_payload = {
        "target_type": "URBAN_EVENT",
        "target_id": "EVT-TEST-API-001",
        "original_event_type": "ROAD_POTHOLE",
        "original_confidence": 0.82,
        "severity": "HIGH",
        "original_operational_confidence": 0.75,
        "original_reliability": 0.88,
        "evidence_reference": "assets/road-defects/pothole-real-01.jpg",
        "source_bus_id": "PMP-BUS-001",
    }
    res_create = client.post("/api/reviews", json=create_payload)
    assert res_create.status_code == 200
    new_rev = res_create.json()["review"]
    new_rev_id = new_rev["review_id"]
    print(f" [PASS] POST /api/reviews -> 200 (Enqueued new review item: {new_rev_id})")

    # 5. Start review
    res_start = client.post(f"/api/reviews/{new_rev_id}/start", json={"reviewer_id": "operator-01"})
    assert res_start.status_code == 200
    assert res_start.json()["review"]["status"] == "IN_REVIEW"
    print(f" [PASS] POST /api/reviews/{new_rev_id}/start -> 200 (Lock transitioned to IN_REVIEW)")

    # 6. Submit decision
    decision_payload = {
        "decision": "CONFIRMED",
        "reviewer_id": "operator-01",
        "reason": "TRUE_POSITIVE",
        "notes": "Verified severe pothole via reference photography.",
    }
    res_decision = client.post(f"/api/reviews/{new_rev_id}/decision", json=decision_payload)
    assert res_decision.status_code == 200
    assert res_decision.json()["review"]["status"] == "COMPLETED"
    assert res_decision.json()["review"]["decision"] == "CONFIRMED"
    print(f" [PASS] POST /api/reviews/{new_rev_id}/decision -> 200 (Completed with CONFIRMED)")

    # 7. Query feedback export records
    res_feedback = client.get("/api/reviews/feedback?decision=CONFIRMED")
    assert res_feedback.status_code == 200
    fb_data = res_feedback.json()
    assert "feedback_records" in fb_data
    assert len(fb_data["feedback_records"]) >= 1
    print(" [PASS] GET /api/reviews/feedback -> 200 (Model feedback evaluation dataset verified)")


def test_authority_actions_endpoints():
    # 1. Summary
    res_sum = client.get("/api/authority-actions/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert "open_count" in sum_data
    assert "critical_count" in sum_data
    assert "disclaimer" in sum_data
    print(" [PASS] GET /api/authority-actions/summary -> 200 (Summary metrics verified)")

    # 2. Queue with filters & pagination
    res_q = client.get("/api/authority-actions/queue?page=1&page_size=10")
    assert res_q.status_code == 200
    q_data = res_q.json()
    assert "items" in q_data
    assert len(q_data["items"]) >= 1
    target_action = q_data["items"][0]
    act_id = target_action["action_id"]
    print(f" [PASS] GET /api/authority-actions/queue -> 200 (Queue returned {len(q_data['items'])} items)")

    # 3. Single action lookup
    res_single = client.get(f"/api/authority-actions/{act_id}")
    assert res_single.status_code == 200
    assert res_single.json()["action_id"] == act_id
    assert "priority_explanation" in res_single.json()
    assert "recommended_response" in res_single.json()
    print(f" [PASS] GET /api/authority-actions/{act_id} -> 200 (Action inspector details verified)")

    # 4. Create new authority action
    create_payload = {
        "target_id": f"EVT-TEST-API-ACT-{uuid.uuid4().hex[:6]}",
        "target_type": "ROAD_DEFECT",
        "event_type": "ROAD_POTHOLE",
        "title": "API Test Road Pothole Action",
        "description": "Severe road void requiring maintenance dispatch.",
        "severity": "CRITICAL",
        "action_type": "REPAIR",
        "source_bus_ids": ["PMP-BUS-001", "PMP-BUS-007", "PMP-BUS-012"],
        "correlation_id": "CORR-000001",
        "review_id": "REV-00001",
        "review_decision": "CONFIRMED",
        "latitude": 18.5089,
        "longitude": 73.8340,
        "created_by": "operator-01",
    }
    res_create = client.post("/api/authority-actions", json=create_payload)
    assert res_create.status_code == 201
    new_act = res_create.json()
    new_act_id = new_act["action_id"]
    assert new_act["priority"] == "CRITICAL"
    print(f" [PASS] POST /api/authority-actions -> 201 (Created action: {new_act_id} with CRITICAL priority)")

    # 5. Assign action
    res_assign = client.post(
        f"/api/authority-actions/{new_act_id}/assign",
        json={
            "assigned_team": "Road Maintenance",
            "assigned_operator": "crew-lead-04",
            "notes": "Assigned road patch team.",
        },
    )
    assert res_assign.status_code == 200
    assert res_assign.json()["status"] == "ASSIGNED"
    print(f" [PASS] POST /api/authority-actions/{new_act_id}/assign -> 200 (Status: ASSIGNED)")

    # 6. Mark Actioned
    res_actioned = client.post(
        f"/api/authority-actions/{new_act_id}/action",
        json={"action_notes": "Patch applied with cold-mix asphalt.", "operator": "crew-lead-04"},
    )
    assert res_actioned.status_code == 200
    assert res_actioned.json()["status"] == "ACTIONED"
    print(f" [PASS] POST /api/authority-actions/{new_act_id}/action -> 200 (Status: ACTIONED)")

    # 7. Mark Reobserve
    res_reobs = client.post(
        f"/api/authority-actions/{new_act_id}/reobserve",
        json={"notes": "Scheduled for mobile fleet pass verification.", "operator": "operator-01"},
    )
    assert res_reobs.status_code == 200
    assert res_reobs.json()["status"] == "REOBSERVE"
    print(f" [PASS] POST /api/authority-actions/{new_act_id}/reobserve -> 200 (Status: REOBSERVE)")

    # 8. Close Action
    res_close = client.post(
        f"/api/authority-actions/{new_act_id}/close",
        json={"closure_notes": "Pass-by verification confirmed smooth road surface.", "operator": "operator-01"},
    )
    assert res_close.status_code == 200
    assert res_close.json()["status"] == "CLOSED"
    print(f" [PASS] POST /api/authority-actions/{new_act_id}/close -> 200 (Status: CLOSED)")

    # 9. Get History
    res_hist = client.get(f"/api/authority-actions/{new_act_id}/history")
    assert res_hist.status_code == 200
    history_entries = res_hist.json()
    assert len(history_entries) >= 4
    print(f" [PASS] GET /api/authority-actions/{new_act_id}/history -> 200 ({len(history_entries)} audit entries)")


def test_reobservation_endpoints():
    # 1. Summary
    res_sum = client.get("/api/reobservation/summary")
    assert res_sum.status_code == 200
    sum_data = res_sum.json()
    assert "total_reobservations" in sum_data
    assert "verified_improved" in sum_data
    assert "disclaimer" in sum_data
    print(" [PASS] GET /api/reobservation/summary -> 200 (Summary KPIs verified)")

    # 2. Queue with pagination & filtering
    res_q = client.get("/api/reobservation/queue?page=1&page_size=10")
    assert res_q.status_code == 200
    q_data = res_q.json()
    assert "items" in q_data
    assert len(q_data["items"]) >= 1
    target_item = q_data["items"][0]
    robs_id = target_item["reobservation_id"]
    print(f" [PASS] GET /api/reobservation/queue -> 200 (Queue returned {len(q_data['items'])} items)")

    # 3. Single item lookup
    res_single = client.get(f"/api/reobservation/{robs_id}")
    assert res_single.status_code == 200
    assert res_single.json()["reobservation_id"] == robs_id
    assert "explanation" in res_single.json()
    assert "verification_score" in res_single.json()
    print(f" [PASS] GET /api/reobservation/{robs_id} -> 200 (Single item lookup verified)")

    # 4. Create new re-observation
    create_payload = {
        "authority_action_id": "ACT-FDBF74E3",
        "target_id": f"ROAD-TEST-{uuid.uuid4().hex[:6]}",
        "target_type": "ROAD_DEFECT",
        "source_bus_id": "PMP-BUS-007",
        "source_bus_ids": ["PMP-BUS-007", "PMP-BUS-012"],
        "before_observation": {
            "defect_count": 4,
            "severity": "CRITICAL",
            "latitude": 18.5204,
            "longitude": 73.8567,
            "timestamp": time.time() - 86400.0,
            "reliability": 0.85,
        },
        "after_observation": {
            "defect_count": 1,
            "severity": "LOW",
            "latitude": 18.5205,
            "longitude": 73.8568,
            "timestamp": time.time(),
            "reliability": 0.90,
            "operational_confidence": 0.88,
            "observed_condition": "Deep void filled with cold-mix asphalt patch.",
            "evidence_refs": ["assets/road-defects/pothole-real-01.jpg"],
        },
    }
    res_create = client.post("/api/reobservation", json=create_payload)
    assert res_create.status_code == 201
    new_reobs = res_create.json()
    new_robs_id = new_reobs["reobservation_id"]
    assert new_reobs["outcome"] == "IMPROVED"
    assert new_reobs["verification_score"] >= 75.0
    print(f" [PASS] POST /api/reobservation -> 201 (Created: {new_robs_id}, Outcome: IMPROVED, Score: {new_reobs['verification_score']})")

    # 5. Verify outcome
    res_verify = client.post(
        f"/api/reobservation/{new_robs_id}/verify",
        json={"operator": "operator-01", "notes": "Verified surface smoothness."},
    )
    assert res_verify.status_code == 200
    assert res_verify.json()["verification_status"] == "VERIFIED"
    print(f" [PASS] POST /api/reobservation/{new_robs_id}/verify -> 200 (Status: VERIFIED)")

    # 6. Request Another Observation
    res_req_another = client.post(
        f"/api/reobservation/{new_robs_id}/request-another",
        json={"operator": "operator-01", "notes": "Request secondary verification pass."},
    )
    assert res_req_another.status_code == 200
    assert res_req_another.json()["verification_status"] == "PENDING_REOBSERVATION"
    print(f" [PASS] POST /api/reobservation/{new_robs_id}/request-another -> 200 (Status: PENDING_REOBSERVATION)")

    # 7. Compare action preview
    res_comp = client.get("/api/reobservation/compare/ACT-FDBF74E3")
    assert res_comp.status_code == 200
    print(" [PASS] GET /api/reobservation/compare/ACT-FDBF74E3 -> 200 (Action comparison preview verified)")

    # 8. History
    res_hist = client.get(f"/api/reobservation/{new_robs_id}/history")
    assert res_hist.status_code == 200
    assert len(res_hist.json()) >= 3
    print(f" [PASS] GET /api/reobservation/{new_robs_id}/history -> 200 ({len(res_hist.json())} history entries)")


def test_predictive_intelligence_endpoints():
    # 1. Summary
    res = client.get("/api/predictive/summary")
    assert res.status_code == 200
    summary = res.json()
    assert summary["active_forecasts"] >= 6
    assert summary["warnings"] >= 1
    assert "average_confidence" in summary
    print(" [PASS] GET /api/predictive/summary -> 200 (Predictive summary verified)")

    # 2. List Forecasts with Filters
    res_list = client.get("/api/predictive/forecasts?target_type=ROAD_DETERIORATION")
    assert res_list.status_code == 200
    data = res_list.json()
    assert data["total"] >= 1
    assert len(data["items"]) >= 1
    print(" [PASS] GET /api/predictive/forecasts?target_type=ROAD_DETERIORATION -> 200 (Filtered forecasts)")

    # 3. Early Warnings
    res_warn = client.get("/api/predictive/warnings")
    assert res_warn.status_code == 200
    assert len(res_warn.json()["items"]) >= 1
    print(f" [PASS] GET /api/predictive/warnings -> 200 ({len(res_warn.json()['items'])} early warnings)")

    # 4. Persistent Hotspots
    res_hot = client.get("/api/predictive/hotspots")
    assert res_hot.status_code == 200
    assert res_hot.json()["total"] >= 1
    print(" [PASS] GET /api/predictive/hotspots -> 200 (Persistent hotspots verified)")

    # 5. Get Single Forecast
    res_single = client.get("/api/predictive/forecasts/FCST-ROAD-001")
    assert res_single.status_code == 200
    fcst = res_single.json()
    assert fcst["target_id"] == "ROAD-01"
    assert "timeseries_points" in fcst
    print(" [PASS] GET /api/predictive/forecasts/FCST-ROAD-001 -> 200 (Single item lookup)")

    # 6. Trend for target
    res_trend = client.get("/api/predictive/trends/ROAD_DETERIORATION/ROAD-01")
    assert res_trend.status_code == 200
    assert res_trend.json()["forecast_id"] == "FCST-ROAD-001"
    print(" [PASS] GET /api/predictive/trends/ROAD_DETERIORATION/ROAD-01 -> 200 (Target trend lookup)")

    # 7. Recompute
    res_recomp = client.post("/api/predictive/recompute")
    assert res_recomp.status_code == 200
    assert res_recomp.json()["status"] == "SUCCESS"
    print(" [PASS] POST /api/predictive/recompute -> 200 (Recomputed forecasts)")

    # 8. Create Authority Action Hook
    res_act = client.post(
        "/api/predictive/FCST-ROAD-001/create-action",
        json={"operator": "Tester", "custom_notes": "Preventative patch test"},
    )
    assert res_act.status_code == 200
    assert res_act.json()["status"] == "SUCCESS"
    print(" [PASS] POST /api/predictive/FCST-ROAD-001/create-action -> 200 (Created action from forecast)")

    # 9. History
    res_hist = client.get("/api/predictive/FCST-ROAD-001/history")
    assert res_hist.status_code == 200
    assert len(res_hist.json()) >= 2
    print(f" [PASS] GET /api/predictive/FCST-ROAD-001/history -> 200 ({len(res_hist.json())} history entries)")


def run_tests():
    passed = 0
    failed = 0
    print("=== Testing FastAPI Endpoints ===")
    for path, expected_status in ENDPOINTS:
        try:
            res = client.get(path)
            if res.status_code == expected_status:
                print(f" [PASS] {path} -> {res.status_code}")
                passed += 1
            else:
                print(f" [FAIL] {path} -> Expected {expected_status}, got {res.status_code}: {res.text}")
                failed += 1
        except Exception as e:
            print(f" [ERROR] {path} -> {e}")
            failed += 1

    try:
        test_post_event_from_detection()
        passed += 1
    except Exception as e:
        print(f" [ERROR] POST /api/events/from-detection -> {e}")
        failed += 1

    try:
        test_events_recent_filtering()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_events_recent_filtering -> {e}")
        failed += 1

    try:
        test_incident_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_incident_endpoints -> {e}")
        failed += 1

    try:
        test_analytics_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_analytics_endpoints -> {e}")
        failed += 1

    try:
        test_digital_twin_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_digital_twin_endpoints -> {e}")
        failed += 1

    try:
        test_phase9_production_integration()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_phase9_production_integration -> {e}")
        failed += 1

    try:
        test_pedestrian_risk_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_pedestrian_risk_endpoints -> {e}")
        failed += 1

    try:
        test_edge_queue_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_edge_queue_endpoints -> {e}")
        failed += 1

    try:
        test_live_monitor_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_live_monitor_endpoints -> {e}")
        failed += 1

    try:
        test_event_correlation_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_event_correlation_endpoints -> {e}")
        failed += 1

def test_system_endpoints():
    # 1. System Health
    res = client.get("/api/system/health")
    assert res.status_code == 200
    health = res.json()
    assert health["platform_status"] in ["HEALTHY", "DEGRADED"]
    assert "subsystems" in health
    print(" [PASS] GET /api/system/health -> 200 (Platform health verified)")

    # 2. Reset Testbed (Validation failure when unconfirmed)
    res_bad = client.post("/api/system/reset-testbed", json={"confirm_reset": False})
    assert res_bad.status_code == 400
    print(" [PASS] POST /api/system/reset-testbed (unconfirmed) -> 400 (Validation rejected)")

    # 3. Reset Testbed (Success when confirmed)
    res_ok = client.post("/api/system/reset-testbed", json={"confirm_reset": True, "operator": "Test Suite"})
    assert res_ok.status_code == 200
    assert res_ok.json()["status"] == "SUCCESS"
    print(" [PASS] POST /api/system/reset-testbed (confirmed) -> 200 (Testbed data refreshed)")


def run_tests():
    passed = 0
    failed = 0
    print("=== Testing FastAPI Endpoints ===")
    for path, expected_status in ENDPOINTS:
        try:
            res = client.get(path)
            if res.status_code == expected_status:
                print(f" [PASS] {path} -> {res.status_code}")
                passed += 1
            else:
                print(f" [FAIL] {path} -> Expected {expected_status}, got {res.status_code}: {res.text}")
                failed += 1
        except Exception as e:
            print(f" [ERROR] {path} -> {e}")
            failed += 1

    try:
        test_post_event_from_detection()
        passed += 1
    except Exception as e:
        print(f" [ERROR] POST /api/events/from-detection -> {e}")
        failed += 1

    try:
        test_events_recent_filtering()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_events_recent_filtering -> {e}")
        failed += 1

    try:
        test_incident_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_incident_endpoints -> {e}")
        failed += 1

    try:
        test_analytics_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_analytics_endpoints -> {e}")
        failed += 1

    try:
        test_digital_twin_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_digital_twin_endpoints -> {e}")
        failed += 1

    try:
        test_phase9_production_integration()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_phase9_production_integration -> {e}")
        failed += 1

    try:
        test_pedestrian_risk_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_pedestrian_risk_endpoints -> {e}")
        failed += 1

    try:
        test_edge_queue_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_edge_queue_endpoints -> {e}")
        failed += 1

    try:
        test_live_monitor_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_live_monitor_endpoints -> {e}")
        failed += 1

    try:
        test_event_correlation_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_event_correlation_endpoints -> {e}")
        failed += 1

    try:
        test_human_review_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_human_review_endpoints -> {e}")
        failed += 1

    try:
        test_authority_actions_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_authority_actions_endpoints -> {e}")
        failed += 1

    try:
        test_reobservation_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_reobservation_endpoints -> {e}")
        failed += 1

    try:
        test_predictive_intelligence_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_predictive_intelligence_endpoints -> {e}")
        failed += 1

    try:
        test_system_endpoints()
        passed += 1
    except Exception as e:
        print(f" [ERROR] test_system_endpoints -> {e}")
        failed += 1

    print(f"\nSummary: {passed} passed, {failed} failed.")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
