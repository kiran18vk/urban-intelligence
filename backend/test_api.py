"""
Automated validation test for all FastAPI endpoints (Phase 1 through Phase 9).
"""
import sys
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

    print(f"\nSummary: {passed} passed, {failed} failed.")
    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
