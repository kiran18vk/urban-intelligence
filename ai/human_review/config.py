"""
Configuration parameters for Human Review and Model Feedback Module.
"""
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class HumanReviewConfig:
    """Configurable options for the review store and prioritization."""
    # SQLite database file path
    db_path: str = "human_review.db"

    # Default reviewer identifier
    default_reviewer_id: str = "operator-01"

    # Priority weighting factors
    severity_weights: Dict[str, int] = field(
        default_factory=lambda: {
            "CRITICAL": 40,
            "HIGH": 30,
            "MEDIUM": 20,
            "LOW": 10,
        }
    )

    # Uncertainty prioritization bonus (lower confidence -> higher review priority)
    uncertainty_max_bonus: int = 30

    # Max records per review query page
    default_page_size: int = 50
    max_page_size: int = 200

    # Stale in-review lock threshold (minutes before an abandoned review is unlocked)
    in_review_timeout_minutes: int = 30


DEFAULT_HUMAN_REVIEW_CONFIG = HumanReviewConfig()
