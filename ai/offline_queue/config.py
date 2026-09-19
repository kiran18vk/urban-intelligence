"""
Configuration for Offline Store-and-Forward Edge Queue.
"""
from dataclasses import dataclass, field
from typing import List


@dataclass
class EdgeQueueConfig:
    """Configurable settings for edge SQLite persistence and retry policies."""
    db_path: str = "edge_queue.db"
    max_queue_size: int = 1000
    max_retries: int = 5
    # Retry intervals in seconds: Attempt 1 (immediate), Attempt 2 (5s), Attempt 3 (15s), Attempt 4 (30s), Attempt 5 (60s)
    retry_intervals_sec: List[float] = field(default_factory=lambda: [0.0, 5.0, 15.0, 30.0, 60.0])
    event_expiration_hours: float = 72.0  # 3 days TTL
    auto_sync_batch_size: int = 50
    health_check_timeout_sec: float = 2.0


DEFAULT_EDGE_CONFIG = EdgeQueueConfig()
