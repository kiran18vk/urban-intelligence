"""
GPS Provider Abstraction and Deterministic Simulation (Phase 3B, SIH 2026 PS 26124).

NOTE:
Deterministic simulation only. Does NOT use random coordinates.
Clearly distinguishes simulated GPS from hardware GPS.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
import math
from typing import List, Optional, Tuple

from ai.events.models import GPSCoordinates


class GPSProvider(ABC):
    """Abstract interface for retrieving geo-coordinates for video frames."""

    @abstractmethod
    def get_location(
        self,
        timestamp_sec: float = 0.0,
        frame_index: Optional[int] = None,
    ) -> GPSCoordinates:
        """Returns geographic coordinates corresponding to the given frame timestamp."""
        pass


# Default fixed urban bus route waypoints (e.g. Pune / PCMC Corridor: Swargate -> FC Road -> Shivajinagar -> Pimpri)
DEFAULT_BUS_ROUTE_WAYPOINTS: List[Tuple[float, float]] = [
    (18.501800, 73.863600),  # Waypoint 0: Swargate
    (18.516700, 73.856200),  # Waypoint 1: Alka Talkies
    (18.528400, 73.842300),  # Waypoint 2: FC Road
    (18.531200, 73.844500),  # Waypoint 3: Shivajinagar
    (18.560100, 73.818200),  # Waypoint 4: Khadki
    (18.601200, 73.793400),  # Waypoint 5: Kasarwadi
    (18.629800, 73.799700),  # Waypoint 6: Pimpri
]


def haversine_distance_km(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """Calculates great-circle distance between two (lat, lon) pairs in kilometers."""
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2.0) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return 6371.0 * c


@dataclass
class SimulatedGPSProvider(GPSProvider):
    """
    Deterministic simulated GPS provider that advances smoothly along a fixed route
    at a constant virtual speed without random fluctuations or jitter.
    """
    bus_id: str = "PMP-BUS-001"
    camera_id: str = "CAM-FRONT-01"
    route_points: List[Tuple[float, float]] = field(
        default_factory=lambda: list(DEFAULT_BUS_ROUTE_WAYPOINTS)
    )
    average_speed_kmh: float = 30.0  # Constant simulated bus transit speed

    def __post_init__(self):
        if len(self.route_points) < 2:
            raise ValueError("route_points must contain at least 2 coordinate waypoints.")

        # Compute cumulative distance along route segments
        self._segment_distances = []
        self._total_route_km = 0.0
        for i in range(len(self.route_points) - 1):
            dist = haversine_distance_km(self.route_points[i], self.route_points[i + 1])
            self._segment_distances.append(dist)
            self._total_route_km += dist

    def get_location(
        self,
        timestamp_sec: float = 0.0,
        frame_index: Optional[int] = None,
    ) -> GPSCoordinates:
        """
        Calculates exact deterministic (latitude, longitude) given elapsed video time.
        """
        if self._total_route_km <= 0.0:
            lat, lon = self.route_points[0]
            return GPSCoordinates(lat, lon, is_simulated=True, provider_source="deterministic_simulation")

        # Distance traveled in km
        distance_km = (self.average_speed_kmh * (timestamp_sec / 3600.0)) % self._total_route_km

        # Find current segment
        accumulated = 0.0
        for i, seg_dist in enumerate(self._segment_distances):
            if accumulated + seg_dist >= distance_km:
                fraction = (distance_km - accumulated) / seg_dist if seg_dist > 0 else 0.0
                p1 = self.route_points[i]
                p2 = self.route_points[i + 1]
                lat = p1[0] + fraction * (p2[0] - p1[0])
                lon = p1[1] + fraction * (p2[1] - p1[1])
                return GPSCoordinates(
                    latitude=lat,
                    longitude=lon,
                    is_simulated=True,
                    provider_source="deterministic_simulation",
                )
            accumulated += seg_dist

        # Fallback to last waypoint
        lat, lon = self.route_points[-1]
        return GPSCoordinates(
            latitude=lat,
            longitude=lon,
            is_simulated=True,
            provider_source="deterministic_simulation",
        )
