# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import states.fail


class StateManager:

    def __init__(self, first_state):
        self.end_time = None
        self.change_current_state(first_state)

    def process(self, frame):
        frame_timestamp = frame['timestamp']
        if self.end_time and frame_timestamp > self.end_time:
            self.change_current_state(states.fail.FailState())
            return

        success = self.current_state.process(frame)
        if success is not None:
            if success:
                next_state = self.current_state = self.current_state.get_next_state_success()
            else:
                next_state = self.current_state = self.current_state.get_next_state_failure()
            self.change_current_state(next_state, frame_timestamp)
        return

    def change_current_state(self, state, frame_timestamp=None):
        self.current_state = state
        if frame_timestamp:
            if state.MAXIMUM_DURATION_IN_SECONDS:
                self.end_time = frame_timestamp + state.MAXIMUM_DURATION_IN_SECONDS * 1000
            else:
                self.end_time = None

    def get_current_state_name(self):
        return type(self.current_state).__name__
