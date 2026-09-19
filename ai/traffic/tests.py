"""
Phase 2C Traffic Tracking Test Suite (SIH 2026 PS 26124).
Tests: persistent IDs, duplicate-count prevention, line crossing,
directional classification, trajectory history, density thresholds,
response schema, invalid video handling.
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
import pytest

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from ai.traffic.config import TrafficConfig
from ai.traffic.counter import DirectionalCounter
from ai.traffic.density import DensityCalculator
from ai.traffic.models import (
    DirectionalCounts, DensityResult, PipelineResult, TrackedObject,
)
from ai.traffic.pipeline import TrafficPipeline


# ─── Helpers ──────────────────────────────────────────────────────────────────

def make_track(
    track_id: int,
    cx: float = 100.0,
    cy: float = 100.0,
    class_name: str = "car",
    history: list = None,
    counted: bool = False,
) -> TrackedObject:
    traj = deque(history or [(cx, cy)], maxlen=120)
    return TrackedObject(
        track_id=track_id,
        class_name=class_name,
        confidence=0.90,
        bbox=[cx - 20, cy - 20, cx + 20, cy + 20],
        center_x=cx,
        center_y=cy,
        first_seen_frame=0,
        last_seen_frame=5,
        frames_seen=5,
        trajectory=traj,
        counted=counted,
    )


# ─── 1. Directional Counter ────────────────────────────────────────────────────

class TestDirectionalCounter:

    def test_incoming_crossing_detected(self):
        """Top-to-bottom crossing increments incoming count."""
        counter = DirectionalCounter(line_y=200)
        track = make_track(1, cy=210, history=[(100, 190), (100, 210)])
        counter.update([track])
        assert counter.counts.incoming == 1
        assert counter.counts.outgoing == 0

    def test_outgoing_crossing_detected(self):
        """Bottom-to-top crossing increments outgoing count."""
        counter = DirectionalCounter(line_y=200)
        track = make_track(2, cy=190, history=[(100, 210), (100, 190)])
        counter.update([track])
        assert counter.counts.outgoing == 1
        assert counter.counts.incoming == 0

    def test_no_crossing_when_same_side(self):
        """No count when vehicle stays on same side of line."""
        counter = DirectionalCounter(line_y=200)
        track = make_track(3, cy=150, history=[(100, 120), (100, 150)])
        counter.update([track])
        assert counter.counts.incoming == 0
        assert counter.counts.outgoing == 0

    def test_duplicate_counting_prevented(self):
        """Same track is NOT counted on consecutive frames after first crossing."""
        counter = DirectionalCounter(line_y=200)
        track = make_track(4, cy=210, history=[(100, 190), (100, 210)])

        # First call — should count
        counter.update([track])
        assert counter.counts.incoming == 1

        # Simulate movement past the line in subsequent frames
        track.trajectory.append((100, 230))
        track.center_y = 230

        # Second call — track.counted is True, must NOT double-count
        counter.update([track])
        assert counter.counts.incoming == 1  # still 1, not 2

    def test_multiple_tracks_counted_independently(self):
        """Different vehicles crossing the line are each counted once."""
        counter = DirectionalCounter(line_y=200)
        t1 = make_track(10, cy=210, history=[(100, 190), (100, 210)])
        t2 = make_track(11, cy=210, history=[(200, 190), (200, 210)])
        counter.update([t1, t2])
        assert counter.counts.incoming == 2

    def test_track_id_recorded_after_count(self):
        """Counted track IDs are appended to counts.counted_track_ids."""
        counter = DirectionalCounter(line_y=200)
        track = make_track(99, cy=210, history=[(100, 190), (100, 210)])
        counter.update([track])
        assert 99 in counter.counts.counted_track_ids

    def test_insufficient_history_not_counted(self):
        """Track with only 1 history point cannot be classified — must not count."""
        counter = DirectionalCounter(line_y=200)
        track = make_track(5, cy=210, history=[(100, 210)])  # only 1 point
        counter.update([track])
        assert counter.counts.incoming == 0
        assert counter.counts.outgoing == 0


# ─── 2. Density Calculator ────────────────────────────────────────────────────

class TestDensityCalculator:

    def setup_method(self):
        # Config: LOW ≤ 4, MEDIUM ≤ 12, HIGH > 12
        self.calc = DensityCalculator(TrafficConfig())

    def test_zero_vehicles_is_low(self):
        result = self.calc.calculate(0)
        assert result.level == "LOW"
        assert result.value == 0

    def test_boundary_low(self):
        assert self.calc.calculate(4).level == "LOW"

    def test_boundary_medium_low(self):
        assert self.calc.calculate(5).level == "MEDIUM"

    def test_boundary_medium_high(self):
        assert self.calc.calculate(12).level == "MEDIUM"

    def test_boundary_high(self):
        assert self.calc.calculate(13).level == "HIGH"

    def test_large_count_is_high(self):
        assert self.calc.calculate(50).level == "HIGH"

    def test_custom_thresholds(self):
        cfg = TrafficConfig(density_low_max=2, density_medium_max=5)
        calc = DensityCalculator(cfg)
        assert calc.calculate(2).level == "LOW"
        assert calc.calculate(3).level == "MEDIUM"
        assert calc.calculate(6).level == "HIGH"


# ─── 3. TrackedObject data model ──────────────────────────────────────────────

class TestTrackedObject:

    def test_to_dict_schema(self):
        """to_dict() must contain all required keys."""
        t = make_track(1)
        d = t.to_dict()
        required = {
            "track_id", "class_name", "confidence", "bbox",
            "center_x", "center_y", "first_seen_frame", "last_seen_frame",
            "frames_seen", "trajectory", "speed_kmh", "speed_estimated",
        }
        assert required.issubset(d.keys())

    def test_speed_none_when_uncalibrated(self):
        t = make_track(1)
        assert t.speed_kmh is None
        d = t.to_dict()
        assert d["speed_kmh"] is None
        assert d["speed_estimated"] is False

    def test_speed_marked_estimated_when_set(self):
        t = make_track(1)
        t.speed_kmh = 35.5
        d = t.to_dict()
        assert d["speed_kmh"] == 35.5
        assert d["speed_estimated"] is True

    def test_trajectory_serialization(self):
        track = make_track(1, history=[(10.0, 20.0), (15.0, 25.0)])
        d = track.to_dict()
        assert d["trajectory"][0] == {"cx": 10.0, "cy": 20.0}
        assert d["trajectory"][1] == {"cx": 15.0, "cy": 25.0}


# ─── 4. PipelineResult schema ─────────────────────────────────────────────────

class TestPipelineResult:

    def test_to_dict_schema(self):
        result = PipelineResult(
            status="success",
            frames_processed=100,
            processing_fps=12.5,
            total_unique_vehicles=3,
            active_tracks=2,
            vehicles_by_class={"car": 2, "bus": 1},
            directional_counts=DirectionalCounts(incoming=2, outgoing=1),
            density=DensityResult(level="LOW", value=2),
            tracks=[make_track(1), make_track(2)],
        )
        d = result.to_dict()
        assert d["status"] == "success"
        assert d["total_unique_vehicles"] == 3
        assert "incoming" in d["directional_counts"]
        assert "outgoing" in d["directional_counts"]
        assert d["density"]["level"] in ("LOW", "MEDIUM", "HIGH")
        assert isinstance(d["tracks"], list)

    def test_error_result(self):
        result = PipelineResult(status="error", error_message="No video found")
        d = result.to_dict()
        assert d["status"] == "error"
        assert d["error_message"] == "No video found"


# ─── 5. Pipeline: invalid video handling ──────────────────────────────────────

class TestPipelineInvalidInput:

    def test_nonexistent_video_returns_error(self):
        pipeline = TrafficPipeline(TrafficConfig())
        result = pipeline.run_video("/no/such/file.mp4")
        assert result.status == "error"
        assert "not found" in (result.error_message or "").lower()

    def test_empty_frames_list_returns_error(self):
        pipeline = TrafficPipeline(TrafficConfig())
        result = pipeline.run_frames([])
        assert result.status == "error"


# ─── 6. Trajectory history bounded ────────────────────────────────────────────

class TestTrajectoryHistory:

    def test_trajectory_bounded_by_max(self):
        cfg = TrafficConfig(max_trajectory_length=5)
        traj = deque(maxlen=cfg.max_trajectory_length)
        for i in range(20):
            traj.append((float(i), float(i)))
        assert len(traj) == 5
        # Only the last 5 entries remain
        assert list(traj)[0] == (15.0, 15.0)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
