"""
Virtual-line directional vehicle counter (Phase 2C, SIH 2026 PS 26124).

Counting logic:
  - A horizontal counting line is drawn at a configurable Y-position.
  - When a tracked vehicle's CENTER crosses this line, its direction is inferred
    from trajectory history (top→bottom = incoming, bottom→top = outgoing).
  - Each track_id is counted AT MOST ONCE, preventing duplicate counting.
"""

from typing import List, Set
from ai.traffic.models import DirectionalCounts, TrackedObject


class DirectionalCounter:
    """
    Stateful line-crossing counter.

    Maintains a set of already-counted track IDs so the same vehicle
    is never counted more than once.
    """

    def __init__(self, line_y: float):
        """
        Args:
            line_y: Absolute Y-pixel position of the counting line.
        """
        self.line_y = line_y
        self.counts = DirectionalCounts()

    # ─── Public API ───────────────────────────────────────────────────────────

    def update(self, active_tracks: List[TrackedObject]) -> DirectionalCounts:
        """
        Check each active track for a line crossing and update counts.

        A crossing is detected when:
          1. The track has at least 2 historical center-points.
          2. The previous position was on the opposite side of the line from the current position.
          3. The track has not yet been counted.

        Returns the current DirectionalCounts (mutated in-place).
        """
        for track in active_tracks:
            if track.counted:
                continue  # Already counted — skip

            history = list(track.trajectory)
            if len(history) < 2:
                continue  # Not enough history to detect crossing

            prev_cy = history[-2][1]
            curr_cy = track.center_y

            crossed = (prev_cy < self.line_y <= curr_cy) or (
                prev_cy > self.line_y >= curr_cy
            )
            if not crossed:
                continue

            # Determine direction from trajectory
            if prev_cy < curr_cy:
                # Center moving downward (top → bottom) → incoming
                self.counts.incoming += 1
            else:
                # Center moving upward (bottom → top) → outgoing
                self.counts.outgoing += 1

            self.counts.counted_track_ids.append(track.track_id)
            track.counted = True  # Prevent future double-counting

        return self.counts

    def reset(self) -> None:
        self.counts = DirectionalCounts()
