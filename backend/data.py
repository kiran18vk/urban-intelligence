"""
Mock dataset representing Pune Smart City Public Transport Fleet (PMPML testbed)
for SIH 2026 PS 26124: AI-Powered Mobile Urban Intelligence Platform.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

# Pune City Center coordinates
PUNE_CENTER = {"lat": 18.5204, "lng": 73.8567}

def _iso_time(minutes_ago: int) -> str:
    now = datetime.now(timezone.utc)
    return (now - timedelta(minutes=minutes_ago)).isoformat()

ROUTES = [
    "Route 12 - Shivajinagar to Kothrud",
    "Route 7 - PMC to Hadapsar",
    "Route 23 - Deccan to Wagholi",
    "Route 15 - Hinjewadi to Swargate",
    "Route 4 - Kothrud to Pune Station",
    "Route 18 - Baner to Pimpri",
    "Route 9 - Nigdi to PMC",
    "Route 6 - Aundh to Kondhwa",
]

DRIVERS = [
    "R. Patil", "S. More", "A. Jadhav", "M. Deshmukh",
    "K. Shinde", "V. Pawar", "D. Kulkarni", "N. Joshi"
]

AREAS = [
    "Shivajinagar", "Kothrud", "Hadapsar", "Aundh", "Baner",
    "Wagholi", "Pimpri", "Hinjewadi", "Swargate", "Deccan"
]

ROADS = [
    "Karve Road", "JM Road", "FC Road", "Ganeshkhind Road",
    "Pashan Road", "Baner Road", "Aundh Road", "Old Mumbai-Pune Highway"
]

ADDRESSES = [
    "Karve Road, nr. Ghole Rd junction",
    "FC Road, nr. PMC building",
    "JM Road, opp. Shivajinagar bus stand",
    "Ganeshkhind Rd, nr. Pune University gate",
    "Baner Rd, nr. Baner gaon",
    "Pashan Rd, nr. NCL",
    "Aundh Rd, nr. Dange Chowk",
    "Old Mumbai-Pune Hwy, nr. Bhumkar Chowk",
    "Solapur Rd, nr. Hadapsar bypass",
    "Satara Rd, nr. Market Yard",
]

BUSES: List[Dict[str, Any]] = [
    {
        "id": f"PMP-BUS-{str(i + 1).zfill(3)}",
        "route": ROUTES[i % len(ROUTES)],
        "driver": DRIVERS[i % len(DRIVERS)],
        "location": {
            "lat": round(PUNE_CENTER["lat"] + ((i * 7 % 13) - 6) * 0.012, 5),
            "lng": round(PUNE_CENTER["lng"] + ((i * 11 % 15) - 7) * 0.011, 5),
        },
        "speed": 0 if i >= 13 else (15 + (i * 4) % 35),
        "status": "active" if i < 11 else ("idle" if i < 14 else "offline"),
        "lastUpdate": _iso_time(2 + i * 3),
        "cameras": 4,
        "eventsToday": 5 + (i * 3) % 22,
    }
    for i in range(16)
]

EVENT_DESCRIPTIONS = {
    "pothole": [
        "Large pothole detected on left lane, approximately 40cm diameter",
        "Pothole near road shoulder, water-filled",
        "Cluster of potholes forming across both lanes",
    ],
    "waterlogging": [
        "Water accumulation covering right lane, depth ~8cm",
        "Severe waterlogging at underpass, depth ~25cm",
        "Standing water across intersection",
    ],
    "congestion": [
        "Heavy traffic build-up detected, vehicles moving below 10 km/h",
        "Stop-and-go traffic extending 200m from junction",
        "Gridlock at major intersection",
    ],
    "accident": [
        "Two-vehicle collision detected, right lane blocked",
        "Rear-end collision at traffic signal",
        "Two-wheeler skid detected",
    ],
    "signal_violation": [
        "Vehicle crossed intersection on red signal",
        "Signal jump detected at camera intersection",
        "Vehicle ran red light at pedestrian crossing",
    ],
    "wrong_side": [
        "Vehicle travelling against traffic flow on one-way section",
        "Wrong-side driving detected on flyover ramp",
        "Motorcycle riding against traffic direction",
    ],
    "overspeeding": [
        "Vehicle exceeding speed limit by 25 km/h",
        "Overspeeding detected in school zone",
        "Multiple vehicles exceeding 80 km/h in 40 zone",
    ],
    "streetlight_out": [
        "Streetlight non-functional at road junction",
        "Multiple streetlights out on highway stretch",
        "Streetlight flickering, partial failure detected",
    ],
}

EVENT_TYPES = list(EVENT_DESCRIPTIONS.keys())
SEVERITIES = ["low", "medium", "high", "critical"]
RELIABILITIES = ["verified", "probable", "unverified"]
EVENT_STATUSES = ["new", "reviewing", "confirmed", "dismissed"]
CAMERAS = ["front-cam", "rear-cam", "left-side-cam", "right-side-cam"]

EVENTS: List[Dict[str, Any]] = [
    {
        "id": f"EVT-{str(i + 1).zfill(5)}",
        "type": EVENT_TYPES[i % len(EVENT_TYPES)],
        "busId": BUSES[i % len(BUSES)]["id"],
        "camera": CAMERAS[i % len(CAMERAS)],
        "timestamp": _iso_time(5 + i * 8),
        "location": {
            "lat": round(PUNE_CENTER["lat"] + ((i * 5 % 17) - 8) * 0.009, 5),
            "lng": round(PUNE_CENTER["lng"] + ((i * 9 % 19) - 9) * 0.008, 5),
        },
        "address": ADDRESSES[i % len(ADDRESSES)],
        "confidence": round(0.78 + (i % 22) * 0.009, 2),
        "reliability": RELIABILITIES[i % len(RELIABILITIES)],
        "reliabilityScore": round(0.65 + (i % 30) * 0.01, 2),
        "severity": SEVERITIES[i % len(SEVERITIES)],
        "status": EVENT_STATUSES[i % len(EVENT_STATUSES)],
        "description": EVENT_DESCRIPTIONS[EVENT_TYPES[i % len(EVENT_TYPES)]][i % 3],
    }
    for i in range(40)
]

DEFECT_TYPES = ["pothole", "crack", "waterlogging", "sinkhole", "surface_raveling"]
DEFECT_STATUSES = ["detected", "verified", "scheduled", "repaired"]
SIZES = ["30cm", "45cm", "60cm", "80cm", "1.2m"]

DEFECTS: List[Dict[str, Any]] = [
    {
        "id": f"DEF-{str(i + 1).zfill(4)}",
        "type": DEFECT_TYPES[i % len(DEFECT_TYPES)],
        "location": {
            "lat": round(PUNE_CENTER["lat"] + ((i * 3 % 15) - 7) * 0.01, 5),
            "lng": round(PUNE_CENTER["lng"] + ((i * 7 % 13) - 6) * 0.011, 5),
        },
        "address": ADDRESSES[i % len(ADDRESSES)],
        "detectedAt": _iso_time(30 + i * 120),
        "severity": SEVERITIES[(i * 2) % len(SEVERITIES)],
        "confidence": round(0.82 + (i % 15) * 0.011, 2),
        "busId": BUSES[i % len(BUSES)]["id"],
        "status": DEFECT_STATUSES[i % len(DEFECT_STATUSES)],
        "sizeEstimate": SIZES[i % len(SIZES)],
        "repairCost": 5000 + (i * 2500) % 40000,
        "reports": 1 + (i % 6),
    }
    for i in range(24)
]

CONGESTION_ZONES: List[Dict[str, Any]] = [
    {
        "id": f"TCF-{str(i + 1).zfill(4)}",
        "location": {
            "lat": round(PUNE_CENTER["lat"] + ((i * 4 % 11) - 5) * 0.008, 5),
            "lng": round(PUNE_CENTER["lng"] + ((i * 6 % 13) - 6) * 0.007, 5),
        },
        "roadName": ROADS[i % len(ROADS)],
        "area": AREAS[i % len(AREAS)],
        "severity": SEVERITIES[(i + 1) % len(SEVERITIES)],
        "avgSpeed": 8 + (i * 3) % 20,
        "freeFlowSpeed": 45 + (i * 2) % 15,
        "density": 65 + (i * 5) % 30,
        "queueLength": 100 + (i * 55) % 700,
        "duration": 10 + (i * 7) % 75,
        "status": ["building", "stable", "clearing"][i % 3],
        "trend": ["increasing", "stable", "decreasing"][(i + 1) % 3],
        "detectedAt": _iso_time(10 + i * 15),
    }
    for i in range(14)
]

PLATES = [
    "MH12 AB 4521", "MH14 CD 8832", "MH12 EF 1290", "MH14 GH 7765",
    "MH12 JK 3344", "MH14 LM 9912", "MH12 NO 5566", "MH14 PQ 2204",
    "MH12 RS 6677", "MH14 TU 1108", "MH12 VW 9012", "MH14 XY 3456"
]

VEHICLE_TYPES = ["Sedan", "SUV", "Hatchback", "Auto-rickshaw", "Motorcycle", "Truck"]
VEHICLE_COLORS = ["White", "Black", "Silver", "Red", "Blue", "Grey"]
INCIDENT_STATUSES = ["open", "investigating", "resolved", "escalated"]
OFFICERS = ["Insp. A. Rao", "Insp. P. Nair", "ACP M. Singh", "SI K. Patil"]

INCIDENTS: List[Dict[str, Any]] = [
    {
        "id": f"INC-{str(i + 1).zfill(4)}",
        "type": ["accident", "signal_violation", "wrong_side", "overspeeding"][i % 4],
        "busId": BUSES[i % len(BUSES)]["id"],
        "camera": CAMERAS[i % len(CAMERAS)],
        "timestamp": _iso_time(15 + i * 35),
        "location": {
            "lat": round(PUNE_CENTER["lat"] + ((i * 5 % 13) - 6) * 0.009, 5),
            "lng": round(PUNE_CENTER["lng"] + ((i * 8 % 11) - 5) * 0.009, 5),
        },
        "address": ADDRESSES[i % len(ADDRESSES)],
        "confidence": round(0.85 + (i % 12) * 0.01, 2),
        "severity": SEVERITIES[(i + 2) % len(SEVERITIES)],
        "status": INCIDENT_STATUSES[i % len(INCIDENT_STATUSES)],
        "thumbnail": f"https://picsum.photos/seed/incident{i}/400/240",
        "vehiclePlate": PLATES[i % len(PLATES)],
        "plateOcrConfidence": round(0.82 + (i % 16) * 0.01, 2),
        "vehicleType": VEHICLE_TYPES[i % len(VEHICLE_TYPES)],
        "vehicleColor": VEHICLE_COLORS[i % len(VEHICLE_COLORS)],
        "description": EVENT_DESCRIPTIONS[["accident", "signal_violation", "wrong_side", "overspeeding"][i % 4]][i % 3],
        "assignedTo": OFFICERS[i % len(OFFICERS)] if i % 2 == 0 else None,
        "reportedBy": "AI Detection System",
    }
    for i in range(12)
]

HOURLY_TREND = [
    {
        "hour": f"{str(h).zfill(2)}:00",
        "potholes": 2 + (h * 3) % 10,
        "congestion": 3 + (h * 5) % 18,
        "incidents": (h * 2) % 5,
        "violations": 1 + (h * 4) % 14,
    }
    for h in range(24)
]

WEEKLY_DEFECTS = [
    {"day": "Mon", "detected": 22, "repaired": 14},
    {"day": "Tue", "detected": 18, "repaired": 12},
    {"day": "Wed", "detected": 28, "repaired": 16},
    {"day": "Thu", "detected": 24, "repaired": 19},
    {"day": "Fri", "detected": 31, "repaired": 15},
    {"day": "Sat", "detected": 14, "repaired": 8},
    {"day": "Sun", "detected": 9, "repaired": 5},
]

AREA_DISTRIBUTION = [
    {"area": "Shivajinagar", "defects": 19, "incidents": 8, "congestion": 14},
    {"area": "Kothrud", "defects": 14, "incidents": 5, "congestion": 11},
    {"area": "Hadapsar", "defects": 22, "incidents": 7, "congestion": 15},
    {"area": "Aundh", "defects": 11, "incidents": 4, "congestion": 8},
    {"area": "Baner", "defects": 16, "incidents": 6, "congestion": 12},
    {"area": "Wagholi", "defects": 24, "incidents": 9, "congestion": 16},
    {"area": "Pimpri", "defects": 18, "incidents": 7, "congestion": 13},
    {"area": "Hinjewadi", "defects": 21, "incidents": 10, "congestion": 17},
]

EVENT_TYPE_BREAKDOWN = [
    {"type": "pothole", "count": 68},
    {"type": "congestion", "count": 84},
    {"type": "waterlogging", "count": 29},
    {"type": "signal_violation", "count": 52},
    {"type": "wrong_side", "count": 37},
    {"type": "overspeeding", "count": 44},
    {"type": "accident", "count": 16},
    {"type": "streetlight_out", "count": 21},
]

def get_overview_stats() -> Dict[str, Any]:
    active_buses = sum(1 for b in BUSES if b["status"] == "active")
    active_incidents = sum(1 for inc in INCIDENTS if inc["status"] != "resolved")
    return {
        "activeBuses": active_buses,
        "totalBuses": len(BUSES),
        "eventsDetected": len(EVENTS),
        "roadDefects": len(DEFECTS),
        "trafficCongestion": len(CONGESTION_ZONES),
        "activeIncidents": active_incidents,
        "totalIncidents": len(INCIDENTS),
        "cameraFeeds": active_buses * 4,
    }
