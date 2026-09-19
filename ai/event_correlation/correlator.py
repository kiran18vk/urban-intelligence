"""
EventCorrelator Service orchestrates event clustering, filtering,
summary computation, and testbed correlation data.
"""
from typing import Any, Dict, List, Optional
import datetime
import time

from ai.event_correlation.config import EventCorrelationConfig, DEFAULT_CORRELATION_CONFIG
from ai.event_correlation.cluster_engine import EventClusterEngine, parse_timestamp_to_seconds
from ai.event_correlation.models import CorrelatedEvent, CorrelationSummary, CorrelationLevel, CorrelationStatus
from ai.events.models import UrbanEvent, GPSCoordinates, EventEvidence


class EventCorrelator:
    """
    Core orchestrator for Multi-Bus Event Correlation.
    """

    def __init__(self, config: Optional[EventCorrelationConfig] = None):
        self.config = config or DEFAULT_CORRELATION_CONFIG
        self.cluster_engine = EventClusterEngine(self.config)

    def correlate(
        self,
        events: List[Any],
        reference_time: Optional[float] = None
    ) -> List[CorrelatedEvent]:
        """Runs the clustering algorithm and produces CorrelatedEvents."""
        return self.cluster_engine.cluster_events(events, reference_time=reference_time)

    def compute_summary(
        self,
        correlated_events: List[CorrelatedEvent]
    ) -> CorrelationSummary:
        """Calculates macro metrics from the correlated events list."""
        total = len(correlated_events)
        single_bus = 0
        corroborated = 0
        consensus = 0
        active_count = 0
        aging_count = 0
        stale_count = 0
        total_buses = 0
        type_breakdown: Dict[str, int] = {}

        for ev in correlated_events:
            # Independent bus categories
            lvl = ev.correlation_level
            lvl_val = lvl.value if isinstance(lvl, CorrelationLevel) else str(lvl)
            if lvl_val == CorrelationLevel.MULTI_BUS_CONSENSUS.value or ev.independent_bus_count >= 3:
                consensus += 1
            elif lvl_val == CorrelationLevel.MULTI_BUS_CORROBORATION.value or ev.independent_bus_count == 2:
                corroborated += 1
            else:
                single_bus += 1

            total_buses += ev.independent_bus_count

            # Lifecycle status
            st = str(ev.status).upper()
            if st == CorrelationStatus.ACTIVE.value:
                active_count += 1
            elif st == CorrelationStatus.AGING.value:
                aging_count += 1
            elif st == CorrelationStatus.STALE.value:
                stale_count += 1

            # Type breakdown
            type_breakdown[ev.event_type] = type_breakdown.get(ev.event_type, 0) + 1

        avg_buses = (total_buses / total) if total > 0 else 0.0

        return CorrelationSummary(
            total_correlated_events=total,
            single_bus_events=single_bus,
            multi_bus_corroborated=corroborated,
            multi_bus_consensus=consensus,
            average_independent_buses=avg_buses,
            active_correlations=active_count,
            aging_correlations=aging_count,
            stale_correlations=stale_count,
            event_type_breakdown=type_breakdown,
        )

    def filter_correlated_events(
        self,
        events: List[CorrelatedEvent],
        event_type: Optional[str] = None,
        correlation_level: Optional[str] = None,
        status: Optional[str] = None,
        bus_id: Optional[str] = None,
        severity: Optional[str] = None,
    ) -> List[CorrelatedEvent]:
        """Applies multi-attribute filtering to the correlated events."""
        filtered = events

        if event_type and event_type.upper() != "ALL":
            filtered = [e for e in filtered if e.event_type.upper() == event_type.upper()]

        if correlation_level and correlation_level.upper() != "ALL":
            filtered = [
                e for e in filtered
                if (e.correlation_level.value if isinstance(e.correlation_level, CorrelationLevel) else str(e.correlation_level)).upper() == correlation_level.upper()
            ]

        if status and status.upper() != "ALL":
            filtered = [e for e in filtered if str(e.status).upper() == status.upper()]

        if bus_id and bus_id.strip():
            target_bus = bus_id.strip().upper()
            filtered = [e for e in filtered if any(b.upper() == target_bus for b in e.bus_ids)]

        if severity and severity.upper() != "ALL":
            filtered = [e for e in filtered if str(e.severity).upper() == severity.upper()]

        return filtered


def get_default_testbed_events() -> List[UrbanEvent]:
    """
    Generates deterministic Pune-corridor prototype testbed events for multi-bus correlation demonstration:
    - 3 distinct buses observing ROAD_POTHOLE on Karve Road (ROAD-03) -> MULTI_BUS_CONSENSUS
    - 2 distinct buses observing TRAFFIC_CONGESTION on Swargate Junction (ZONE-02) -> MULTI_BUS_CORROBORATION
    - 1 bus observing ROAD_CRACK on FC Road (ROAD-01) 3 times -> SINGLE_BUS_OBSERVATION (3 obs, 1 bus)
    - 1 pedestrian risk observation referencing pedestrian risk engine
    - 1 ANPR vehicle observation
    """
    now = time.time()
    events = [
        # Cluster 1: ROAD_POTHOLE on Karve Road (ROAD-03) - 3 distinct buses (Consensus)
        UrbanEvent(
            event_id="EVT-2026-CORR-001",
            event_type="ROAD_POTHOLE",
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 7200, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5089, longitude=73.8340, is_simulated=True),
            confidence=0.88,
            operational_confidence=0.82,
            severity="HIGH",
            reliability={"score": 0.91, "factors": {"lighting": 0.94, "blur": 0.88, "visibility": 0.90, "temporal": 0.86}},
            evidence=EventEvidence(image_path="assets/road-defects/pothole-real-01.jpg"),
            detection={"road_id": "ROAD-03", "defect_type": "POTHOLE"},
            notes="Observed on Karve Road inbound corridor",
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-002",
            event_type="ROAD_POTHOLE",
            bus_id="PMP-BUS-007",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 3600, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5091, longitude=73.8342, is_simulated=True),
            confidence=0.91,
            operational_confidence=0.85,
            severity="HIGH",
            reliability={"score": 0.90, "factors": {"lighting": 0.92, "blur": 0.90, "visibility": 0.88, "temporal": 0.87}},
            evidence=EventEvidence(image_path="assets/road-defects/pothole-real-01.jpg"),
            detection={"road_id": "ROAD-03", "defect_type": "POTHOLE"},
            notes="Corroborated by independent unit PMP-BUS-007",
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-003",
            event_type="ROAD_POTHOLE",
            bus_id="PMP-BUS-012",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 1200, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5088, longitude=73.8339, is_simulated=True),
            confidence=0.86,
            operational_confidence=0.80,
            severity="HIGH",
            reliability={"score": 0.88, "factors": {"lighting": 0.90, "blur": 0.86, "visibility": 0.89, "temporal": 0.85}},
            evidence=EventEvidence(image_path="assets/road-defects/pothole-real-01.jpg"),
            detection={"road_id": "ROAD-03", "defect_type": "POTHOLE"},
            notes="Third corroborating observation forming multi-bus consensus",
        ),

        # Cluster 2: TRAFFIC_CONGESTION at Swargate Junction (ZONE-02) - 2 distinct buses (Corroboration)
        UrbanEvent(
            event_id="EVT-2026-CORR-004",
            event_type="TRAFFIC_CONGESTION",
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 1800, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5018, longitude=73.8580, is_simulated=True),
            confidence=0.92,
            operational_confidence=0.86,
            severity="HIGH",
            reliability={"score": 0.89},
            detection={"zone_id": "ZONE-02", "density": "HIGH"},
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-005",
            event_type="TRAFFIC_CONGESTION",
            bus_id="PMP-BUS-004",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 900, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5020, longitude=73.8582, is_simulated=True),
            confidence=0.89,
            operational_confidence=0.83,
            severity="HIGH",
            reliability={"score": 0.87},
            detection={"zone_id": "ZONE-02", "density": "HIGH"},
        ),

        # Cluster 3: ROAD_CRACK on FC Road (ROAD-01) - 1 bus, 3 repeated passes (Single Bus Observation)
        UrbanEvent(
            event_id="EVT-2026-CORR-006",
            event_type="ROAD_CRACK",
            bus_id="PMP-BUS-003",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 14400, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5284, longitude=73.8423, is_simulated=True),
            confidence=0.74,
            operational_confidence=0.68,
            severity="MEDIUM",
            reliability={"score": 0.85},
            evidence=EventEvidence(image_path="assets/road-defects/road-crack-real-01.jpg"),
            detection={"road_id": "ROAD-01", "defect_type": "CRACK"},
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-007",
            event_type="ROAD_CRACK",
            bus_id="PMP-BUS-003",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 7200, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5285, longitude=73.8424, is_simulated=True),
            confidence=0.78,
            operational_confidence=0.71,
            severity="MEDIUM",
            reliability={"score": 0.86},
            evidence=EventEvidence(image_path="assets/road-defects/road-crack-real-01.jpg"),
            detection={"road_id": "ROAD-01", "defect_type": "CRACK"},
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-008",
            event_type="ROAD_CRACK",
            bus_id="PMP-BUS-003",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 1800, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5283, longitude=73.8422, is_simulated=True),
            confidence=0.80,
            operational_confidence=0.73,
            severity="MEDIUM",
            reliability={"score": 0.87},
            evidence=EventEvidence(image_path="assets/road-defects/road-crack-real-01.jpg"),
            detection={"road_id": "ROAD-01", "defect_type": "CRACK"},
        ),

        # Cluster 4: PEDESTRIAN_RISK near Shivajinagar Junction (Consensus via Pedestrian Consensus Engine)
        UrbanEvent(
            event_id="EVT-2026-CORR-009",
            event_type="PEDESTRIAN_RISK",
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 3000, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5312, longitude=73.8445, is_simulated=True),
            confidence=0.86,
            operational_confidence=0.80,
            severity="HIGH",
            reliability={"score": 0.88},
            detection={"hotspot_id": "PEDESTRIAN-HOTSPOT-001", "risk_score": 78},
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-010",
            event_type="PEDESTRIAN_RISK",
            bus_id="PMP-BUS-004",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 1500, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5314, longitude=73.8447, is_simulated=True),
            confidence=0.89,
            operational_confidence=0.82,
            severity="HIGH",
            reliability={"score": 0.90},
            detection={"hotspot_id": "PEDESTRIAN-HOTSPOT-001", "risk_score": 82},
        ),
        UrbanEvent(
            event_id="EVT-2026-CORR-011",
            event_type="PEDESTRIAN_RISK",
            bus_id="PMP-BUS-007",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 600, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5310, longitude=73.8443, is_simulated=True),
            confidence=0.87,
            operational_confidence=0.81,
            severity="HIGH",
            reliability={"score": 0.89},
            detection={"hotspot_id": "PEDESTRIAN-HOTSPOT-001", "risk_score": 75},
        ),

        # Cluster 5: ANPR_DETECTION plate observation
        UrbanEvent(
            event_id="EVT-2026-CORR-012",
            event_type="ANPR_DETECTION",
            bus_id="PMP-BUS-001",
            camera_id="CAM-FRONT-01",
            timestamp=datetime.datetime.fromtimestamp(now - 400, datetime.timezone.utc).isoformat(),
            gps=GPSCoordinates(latitude=18.5204, longitude=73.8567, is_simulated=True),
            confidence=0.91,
            operational_confidence=0.84,
            severity="LOW",
            reliability={"score": 0.88},
            detection={"plate_text": "MH 12 QX 4821", "track_id": 101},
        ),
    ]
    return events
