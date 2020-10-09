# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import math

import numpy as np

import states.area
import states.face
import states.fail
import states.success

from challenge import Challenge


class NoseState:

    MAXIMUM_DURATION_IN_SECONDS = 10

    AREA_BOX_TOLERANCE = 0.05
    NOSE_BOX_TOLERANCE = 0.55
    TRAJECTORY_ERROR_THRESHOLD = 0.01
    HISTOGRAM_BINS = 3
    MIN_DIST = 0.10
    ROTATION_THRESHOLD = 5.0
    MIN_DIST_FACTOR_ROTATED = 0.75
    MIN_DIST_FACTOR_NOT_ROTATED = 1.5

    def __init__(self, challenge, original_frame):
        self.challenge = challenge
        self.image_width = challenge['imageWidth']
        self.image_height = challenge['imageHeight']
        # Applying tolerance
        area_width_tolerance = challenge['areaWidth'] * NoseState.AREA_BOX_TOLERANCE
        area_height_tolerance = challenge['areaHeight'] * NoseState.AREA_BOX_TOLERANCE
        self.area_box = (challenge['areaLeft'] - area_width_tolerance,
                         challenge['areaTop'] - area_height_tolerance,
                         challenge['areaWidth'] + 2*area_width_tolerance,
                         challenge['areaHeight'] + 2*area_height_tolerance)
        nose_width_tolerance = challenge['noseWidth'] * NoseState.NOSE_BOX_TOLERANCE
        nose_height_tolerance = challenge['noseHeight'] * NoseState.NOSE_BOX_TOLERANCE
        self.nose_box = (challenge['noseLeft'] - nose_width_tolerance,
                         challenge['noseTop'] - nose_height_tolerance,
                         challenge['noseWidth'] + 2*nose_width_tolerance,
                         challenge['noseHeight'] + 2*nose_height_tolerance)
        self.challenge_in_the_right = challenge['noseLeft'] + Challenge.NOSE_BOX_SIZE/2 > self.image_width/2
        self.original_frame = original_frame
        self.original_landmarks = original_frame['rekMetadata'][0]['Landmarks']
        self.nose_trajectory = []

    def process(self, frame):
        rek_metadata = frame['rekMetadata'][0]
        rek_face_bbox = [
            self.image_width * rek_metadata['BoundingBox']['Left'],
            self.image_height * rek_metadata['BoundingBox']['Top'],
            self.image_width * rek_metadata['BoundingBox']['Width'],
            self.image_height * rek_metadata['BoundingBox']['Height']
        ]
        if not states.area.AreaState.is_inside_area_box(self.area_box, rek_face_bbox):
            return False

        rek_landmarks = rek_metadata['Landmarks']
        rek_pose = rek_metadata['Pose']

        if self.is_inside_nose_box(rek_landmarks):
            verified = self.verify_challenge(rek_landmarks, rek_pose, self.challenge_in_the_right)
            return verified

        return None

    def is_inside_nose_box(self, landmarks):
        for landmark in landmarks:
            if landmark['Type'] == 'nose':
                nose_left = self.image_width * landmark['X']
                nose_top = self.image_height * landmark['Y']
                self.nose_trajectory.append((landmark['X'], landmark['Y']))
                return (self.nose_box[0] <= nose_left <= self.nose_box[0] + self.nose_box[2] and
                        self.nose_box[1] <= nose_top <= self.nose_box[1] + self.nose_box[3])
        return False

    def get_next_state_failure(self):
        return states.fail.FailState()

    def get_next_state_success(self):
        return states.success.SuccessState()

    def verify_challenge(self, current_landmarks, pose, challenge_in_the_right):
        # Validating continuous and linear nose trajectory
        nose_trajectory_x = [nose[0] for nose in self.nose_trajectory]
        nose_trajectory_y = [nose[1] for nose in self.nose_trajectory]
        _, residuals, _, _, _ = np.polyfit(nose_trajectory_x, nose_trajectory_y, 2, full=True)
        trajectory_error = math.sqrt(residuals/len(self.nose_trajectory))
        if trajectory_error > NoseState.TRAJECTORY_ERROR_THRESHOLD:
            return False

        # Plotting landmarks from the first frame in a histogram
        original_landmarks_x = [self.image_width * landmark['X'] for landmark in self.original_landmarks]
        original_landmarks_y = [self.image_height * landmark['Y'] for landmark in self.original_landmarks]
        original_histogram, _, _ = np.histogram2d(original_landmarks_x,
                                                  original_landmarks_y,
                                                  bins=NoseState.HISTOGRAM_BINS)
        original_histogram = np.reshape(original_histogram, NoseState.HISTOGRAM_BINS**2) / len(original_landmarks_x)
        # Plotting landmarks from the last frame in a histogram
        current_landmarks_x = [self.image_width * landmark['X'] for landmark in current_landmarks]
        current_landmarks_y = [self.image_height * landmark['Y'] for landmark in current_landmarks]
        current_histogram, _, _ = np.histogram2d(current_landmarks_x,
                                                 current_landmarks_y,
                                                 bins=NoseState.HISTOGRAM_BINS)
        current_histogram = np.reshape(current_histogram, NoseState.HISTOGRAM_BINS**2) / len(current_landmarks_x)
        # Calculating the Euclidean distance between histograms
        dist = np.linalg.norm(original_histogram - current_histogram)
        # Estimating left and right rotation
        yaw = pose['Yaw']
        rotated_right = yaw > NoseState.ROTATION_THRESHOLD
        rotated_left = yaw < - NoseState.ROTATION_THRESHOLD
        rotated_face = rotated_left or rotated_right
        # Validating distance according to rotation
        if (rotated_right and challenge_in_the_right) or (rotated_left and not challenge_in_the_right):
            min_dist = NoseState.MIN_DIST * NoseState.MIN_DIST_FACTOR_ROTATED
        elif not rotated_face:
            min_dist = NoseState.MIN_DIST * NoseState.MIN_DIST_FACTOR_NOT_ROTATED
        else:
            return False

        if dist > min_dist:
            return True
        return False
