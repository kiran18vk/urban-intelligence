"""
Edge Connectivity & Network Simulation Manager.
Evaluates reachability to the central backend and provides a controlled simulation interface.
"""
from typing import Optional
from ai.offline_queue.models import ConnectivityState


class EdgeConnectivityManager:
    """Tracks network connectivity and manages prototype simulation state."""

    def __init__(self, initial_state: ConnectivityState = ConnectivityState.ONLINE):
        self._current_state = initial_state
        self._simulated_override: Optional[ConnectivityState] = None
        self._is_syncing: bool = False

    def get_connectivity(self) -> ConnectivityState:
        """Returns the active connectivity state (simulated override or reachability)."""
        if self._is_syncing:
            return ConnectivityState.SYNCING
        if self._simulated_override is not None:
            return self._simulated_override
        return self._current_state

    def set_simulation_state(self, state: Optional[ConnectivityState]):
        """
        Sets a controlled simulated connectivity state for prototype demonstration.
        Set to None to resume automatic detection.
        """
        self._simulated_override = state

    def set_syncing(self, is_syncing: bool):
        """Marks active sync in progress."""
        self._is_syncing = is_syncing

    def set_actual_state(self, state: ConnectivityState):
        """Updates internal reachability state."""
        self._current_state = state

    def is_online(self) -> bool:
        return self.get_connectivity() in (ConnectivityState.ONLINE, ConnectivityState.SYNCING)

    def is_simulation_active(self) -> bool:
        return self._simulated_override is not None
