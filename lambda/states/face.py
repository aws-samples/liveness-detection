# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from states.area import AreaState


class FaceState:

    MAXIMUM_DURATION_IN_SECONDS = None

    def __init__(self, challenge):
        self.challenge = challenge

    def process(self, frame):
        success = False
        if len(frame['rekMetadata']) == 1:
            success = True
        return True if success else None

    def get_next_state_failure(self):
        return None

    def get_next_state_success(self):
        return AreaState(self.challenge)
