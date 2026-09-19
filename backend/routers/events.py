"""
FastAPI router for Urban Event Intelligence (Phase 3B & Phase 4, SIH 2026 PS 26124).
Exposes:
  - GET  /api/events                  (Preserved existing endpoint)
  - GET  /api/events/recent           (Enhanced: returns recent structured urban events with event_type & severity filters)
  - POST /api/events/from-detection   (Preserved endpoint: converts AI detection to standardized urban event)
  - GET  /api/events/{event_id}       (Preserved existing endpoint)
"""

import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Query

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.events.event_builder import EventBuilder
from ai.events.gps import SimulatedGPSProvider
from ai.events.models import EventEvidence, EventStatus, EventType, GPSCoordinates, SeverityLevel, UrbanEvent
from data import EVENTS

router = APIRouter(prefix="/events", tags=["events"])

VALID_EVENT_TYPES = {t.value for t in EventType}
VALID_SEVERITY_LEVELS = {s.value for s in SeverityLevel}

# In-memory registry for dynamic urban events generated from AI perception
LIVE_URBAN_EVENTS: List[Dict[str, Any]] = []

def _seed_demo_urban_events():
    """Initializes realistic demo simulated UrbanEvents with reliability metadata for GIS command center visualization."""
    gps_provider = SimulatedGPSProvider()
    builder = EventBuilder()
    
    demo_records = [
        UrbanEvent(
            event_id="EVT-DEMO-0001",
            event_type=EventType.ROAD_POTHOLE.value,
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp="2026-09-18T00:15:30Z",
            gps=gps_provider.get_location(timestamp_sec=12.0),
            confidence=0.78,
            operational_confidence=0.72,
            severity=SeverityLevel.HIGH.value,
            evidence=EventEvidence(image_path="outputs/demo_pothole_01.jpg"),
            detection={"class_name": "pothole", "bbox": [140.0, 180.0, 320.0, 310.0]},
            reliability={
                "score": 0.92,
                "raw_confidence": 0.78,
                "operational_confidence": 0.72,
                "factors": {"lighting": 0.94, "blur": 0.90, "visibility": 0.92},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["Optimal lighting condition", "High image sharpness (crisp focus)", "Clear visibility and high dynamic range", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=120,
            notes="[DEMO SEED] Deterministic simulation sample event (Road Defect)",
        ),
        UrbanEvent(
            event_id="EVT-DEMO-0002",
            event_type=EventType.ROAD_CRACK.value,
            bus_id="PMP-BUS-003",
            camera_id="CAM-FRONT-01",
            timestamp="2026-09-18T00:18:45Z",
            gps=gps_provider.get_location(timestamp_sec=48.0),
            confidence=0.64,
            operational_confidence=0.48,
            severity=SeverityLevel.LOW.value,
            evidence=EventEvidence(image_path="outputs/demo_crack_01.jpg"),
            detection={"class_name": "longitudinal", "bbox": [60.0, 210.0, 190.0, 340.0]},
            reliability={
                "score": 0.75,
                "raw_confidence": 0.64,
                "operational_confidence": 0.48,
                "factors": {"lighting": 0.88, "blur": 0.58, "visibility": 0.80},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["Optimal lighting condition", "Low image sharpness (blur or motion detected)", "Good scene visibility", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=240,
            notes="[DEMO SEED] Deterministic simulation sample event (Surface Distress)",
        ),
        UrbanEvent(
            event_id="EVT-DEMO-0003",
            event_type=EventType.TRAFFIC_CONGESTION.value,
            bus_id="PMP-BUS-002",
            camera_id="CAM-FRONT-01",
            timestamp="2026-09-18T00:20:10Z",
            gps=gps_provider.get_location(timestamp_sec=95.0),
            confidence=0.89,
            operational_confidence=0.86,
            severity=SeverityLevel.HIGH.value,
            evidence=EventEvidence(video_path="outputs/demo_traffic_01.mp4"),
            detection={"density_level": "HIGH", "vehicle_count": 22, "active_tracks": 17},
            reliability={
                "score": 0.97,
                "raw_confidence": 0.89,
                "operational_confidence": 0.86,
                "factors": {"temporal_stability": 0.98},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["High temporal tracking stability", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=450,
            notes="[DEMO SEED] Deterministic simulation sample event (Traffic Density)",
        ),
        UrbanEvent(
            event_id="EVT-DEMO-0004",
            event_type=EventType.ANPR_DETECTION.value,
            bus_id="PMP-BUS-005",
            camera_id="CAM-FRONT-02",
            timestamp="2026-09-18T00:22:05Z",
            gps=gps_provider.get_location(timestamp_sec=160.0),
            confidence=0.91,
            operational_confidence=0.84,
            severity=SeverityLevel.LOW.value,
            evidence=EventEvidence(image_path="outputs/demo_anpr_01.jpg"),
            detection={"track_id": 8, "vehicle_class": "car", "plate_text": "MH12AB1234", "plate_status": "verified"},
            reliability={
                "score": 0.92,
                "raw_confidence": 0.91,
                "operational_confidence": 0.84,
                "factors": {"lighting": 0.92, "blur": 0.91, "visibility": 0.93, "temporal_stability": 0.88},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["Optimal lighting condition", "High image sharpness (crisp focus)", "Clear visibility and high dynamic range", "Moderate temporal tracking stability", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=610,
            notes="[DEMO SEED] Simulated synthetic OCR plate recognition",
        ),
        UrbanEvent(
            event_id="EVT-DEMO-0005",
            event_type=EventType.VEHICLE_DETECTED.value,
            bus_id="PMP-BUS-004",
            camera_id="CAM-FRONT-01",
            timestamp="2026-09-18T00:24:40Z",
            gps=gps_provider.get_location(timestamp_sec=220.0),
            confidence=0.85,
            operational_confidence=0.74,
            severity=SeverityLevel.LOW.value,
            evidence=EventEvidence(image_path="outputs/demo_vehicle_01.jpg"),
            detection={"class_name": "bus", "bbox": [200.0, 100.0, 500.0, 400.0], "track_id": 14},
            reliability={
                "score": 0.87,
                "raw_confidence": 0.85,
                "operational_confidence": 0.74,
                "factors": {"lighting": 0.86, "blur": 0.85, "visibility": 0.90},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["Optimal lighting condition", "High image sharpness (crisp focus)", "Clear visibility and high dynamic range", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=800,
            notes="[DEMO SEED] Multi-object tracking active record",
        ),
        UrbanEvent(
            event_id="EVT-DEMO-0006",
            event_type=EventType.PEDESTRIAN_RISK.value,
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp="2026-09-18T00:26:15Z",
            gps=gps_provider.get_location(timestamp_sec=290.0),
            confidence=0.74,
            operational_confidence=0.55,
            severity=SeverityLevel.CRITICAL.value,
            evidence=EventEvidence(image_path="outputs/demo_pedestrian_01.jpg"),
            detection={"class_name": "pedestrian", "proximity": "near_lane", "bbox": [310.0, 190.0, 420.0, 390.0]},
            reliability={
                "score": 0.74,
                "raw_confidence": 0.74,
                "operational_confidence": 0.55,
                "factors": {"lighting": 0.70, "blur": 0.72, "visibility": 0.80},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["Acceptable low-light condition", "Moderate image sharpness", "Good scene visibility", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=980,
            notes="[DEMO SEED] Simulated pedestrian proximity alert",
        ),
        UrbanEvent(
            event_id="EVT-DEMO-0007",
            event_type=EventType.HIT_AND_RUN.value,
            bus_id="PMP-BUS-006",
            camera_id="CAM-REAR-01",
            timestamp="2026-09-18T00:28:00Z",
            gps=gps_provider.get_location(timestamp_sec=360.0),
            confidence=0.82,
            operational_confidence=0.70,
            severity=SeverityLevel.CRITICAL.value,
            evidence=EventEvidence(video_path="outputs/demo_hit_run_schema.mp4"),
            detection={"collision_detected": True, "vehicle_leaving": True, "track_id": 99},
            reliability={
                "score": 0.85,
                "raw_confidence": 0.82,
                "operational_confidence": 0.70,
                "factors": {"temporal_stability": 0.85},
                "unavailable_factors": ["occlusion", "camera_angle"],
                "reasons": ["Moderate temporal tracking stability", "Occlusion not measured", "Camera angle metadata unavailable"],
                "is_measured": True,
            },
            frame_index=1200,
            notes="[DEMO SCHEMA ONLY - NO LIVE INCIDENT] Hit-and-run schema event definition",
        ),
    ]
    for r in demo_records:
        LIVE_URBAN_EVENTS.append(r.to_dict())

_seed_demo_urban_events()



class CreateEventFromDetectionRequest(BaseModel):
    """Payload schema for generating an event from raw detection metadata."""
    event_type: str = Field(..., description="e.g. ROAD_POTHOLE, ROAD_CRACK, TRAFFIC_CONGESTION, ANPR_DETECTION")
    confidence: float = Field(..., ge=0.0, le=1.0, description="AI model confidence score")
    detection: Dict[str, Any] = Field(default_factory=dict, description="Raw bounding box and class metadata")
    bus_id: Optional[str] = Field("PMP-BUS-001", description="Vehicle identifier")
    camera_id: Optional[str] = Field("CAM-FRONT-01", description="Source camera identifier")
    frame_index: Optional[int] = Field(0, description="Source video frame index")
    timestamp_sec: Optional[float] = Field(0.0, description="Elapsed timestamp in seconds")
    image_path: Optional[str] = Field(None, description="Path reference to annotated image")
    video_path: Optional[str] = Field(None, description="Path reference to annotated video")
    severity: Optional[str] = Field(None, description="Optional manual severity override (LOW, MEDIUM, HIGH, CRITICAL)")


@router.get("", response_model=List[Dict[str, Any]])
def list_events():
    """Preserved Phase 1 endpoint: returns municipal events."""
    return EVENTS


@router.get("/recent", response_model=List[Dict[str, Any]])
def get_recent_events(
    limit: int = Query(20, ge=1, le=100, description="Max number of recent events to return (1-100)"),
    event_type: Optional[str] = Query(None, description="Filter by event type (e.g. ROAD_POTHOLE, ROAD_CRACK)"),
    severity: Optional[str] = Query(None, description="Filter by severity (e.g. LOW, MEDIUM, HIGH, CRITICAL)"),
):
    """
    Returns recent structured Urban Events generated from perception modules.
    Supports filtering by event_type and severity with validation (returns 400 on invalid filter).
    """
    normalized_event_type = None
    if event_type is not None:
        normalized_event_type = event_type.strip().upper()
        if normalized_event_type not in VALID_EVENT_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid event_type '{event_type}'. Valid values: {sorted(list(VALID_EVENT_TYPES))}",
            )

    normalized_severity = None
    if severity is not None:
        normalized_severity = severity.strip().upper()
        if normalized_severity not in VALID_SEVERITY_LEVELS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid severity '{severity}'. Valid values: {sorted(list(VALID_SEVERITY_LEVELS))}",
            )

    results = list(reversed(LIVE_URBAN_EVENTS))
    if normalized_event_type:
        results = [e for e in results if e.get("event_type", "").upper() == normalized_event_type]
    if normalized_severity:
        results = [e for e in results if e.get("severity", "").upper() == normalized_severity]

    return results[:limit]


@router.post("/from-detection", response_model=Dict[str, Any])
def create_event_from_detection(req: CreateEventFromDetectionRequest):
    """
    Converts an incoming AI perception detection into a geo-referenced, standardized UrbanEvent.
    """
    builder = EventBuilder(
        bus_id=req.bus_id or "PMP-BUS-001",
        camera_id=req.camera_id or "CAM-FRONT-01",
    )

    cname = req.detection.get("class_name", "").lower()
    raw_event_type = req.event_type.upper()

    if raw_event_type in ("ROAD_POTHOLE", "ROAD_CRACK") or cname in ("pothole", "alligator", "longitudinal", "transverse", "crack"):
        from ai.road_damage.models import RoadDefectDetection
        defect = RoadDefectDetection(
            class_name=cname or "pothole",
            confidence=req.confidence,
            bbox=req.detection.get("bbox", [0.0, 0.0, 0.0, 0.0]),
            frame_index=req.frame_index,
            timestamp_sec=req.timestamp_sec,
            source_id=req.bus_id,
        )
        urban_event = builder.build_from_road_defect(
            defect=defect,
            frame_index=req.frame_index or 0,
            timestamp_sec=req.timestamp_sec or 0.0,
            image_path=req.image_path,
            video_path=req.video_path,
        )
    elif raw_event_type == "TRAFFIC_CONGESTION":
        density_lvl = req.detection.get("density_level", "MEDIUM")
        v_count = req.detection.get("vehicle_count", 1)
        active_t = req.detection.get("active_tracks", 1)
        urban_event = builder.build_from_traffic_density(
            density_level=density_lvl,
            vehicle_count=v_count,
            active_tracks=active_t,
            frame_index=req.frame_index or 0,
            timestamp_sec=req.timestamp_sec or 0.0,
            video_path=req.video_path,
        )
    elif raw_event_type == "ANPR_DETECTION":
        urban_event = builder.build_from_anpr_record(
            track_id=req.detection.get("track_id", 0),
            vehicle_class=req.detection.get("vehicle_class", "car"),
            plate_text=req.detection.get("plate_text", "N/A"),
            confidence=req.confidence,
            plate_status=req.detection.get("plate_status", "verified"),
            frame_index=req.frame_index or 0,
            timestamp_sec=req.timestamp_sec or 0.0,
            image_path=req.image_path,
        )
    else:
        urban_event = builder.build_from_generic_detection(
            detection_data=req.detection,
            event_type=raw_event_type,
            confidence=req.confidence,
            frame_index=req.frame_index or 0,
            timestamp_sec=req.timestamp_sec or 0.0,
            severity=req.severity,
            image_path=req.image_path,
        )

    event_dict = urban_event.to_dict()
    LIVE_URBAN_EVENTS.append(event_dict)
    return event_dict


@router.get("/{event_id}")
def get_event(event_id: str):
    """Preserved Phase 1 endpoint: returns an event by ID (checking live events then legacy mock events)."""
    # Check live generated events first
    for evt in LIVE_URBAN_EVENTS:
        if evt.get("event_id", "").lower() == event_id.lower():
            return evt

    # Check legacy EVENTS
    for event in EVENTS:
        if event["id"].lower() == event_id.lower():
            return event

    raise HTTPException(status_code=404, detail=f"Event with ID '{event_id}' not found")

