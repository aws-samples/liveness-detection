# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import states.face
import states.nose

from challenge import Challenge


class AreaState:

    MAXIMUM_DURATION_IN_SECONDS = None

    def __init__(self, challenge):
        self.challenge = challenge
        self.image_width = challenge['imageWidth']
        self.image_height = challenge['imageHeight']
        self.area_box = (challenge['areaLeft'], challenge['areaTop'],
                         challenge['areaWidth'], challenge['areaHeight'])
        self.min_face_area_percent = challenge['minFaceAreaPercent']
        self.frame = None

    def process(self, frame):
        self.frame = frame
        face_bounding_box = [
            self.image_width * frame['rekMetadata'][0]['BoundingBox']['Left'],
            self.image_height * frame['rekMetadata'][0]['BoundingBox']['Top'],
            self.image_width * frame['rekMetadata'][0]['BoundingBox']['Width'],
            self.image_height * frame['rekMetadata'][0]['BoundingBox']['Height']
        ]
        inside_area_box = AreaState.is_inside_area_box(self.area_box, face_bounding_box)
        min_face_area = AreaState.is_min_face_area_percent(self.area_box, face_bounding_box, self.min_face_area_percent)
        success = (inside_area_box and min_face_area)
        return True if success else None

    def get_next_state_failure(self):
        return states.face.FaceState(self.challenge)

    def get_next_state_success(self):
        return states.nose.NoseState(self.challenge, self.frame)

    @staticmethod
    def is_inside_area_box(face_area_box, face_box):
        return (face_area_box[0] <= face_box[0] and
                face_area_box[1] <= face_box[1] and
                face_area_box[0] + face_area_box[2] >= face_box[0] + face_box[2] and
                face_area_box[1] + face_area_box[3] >= face_box[1] + face_box[3])

    @staticmethod
    def is_min_face_area_percent(face_area_box, face_box, min_face_area_percent):
        face_area_box_area = face_area_box[2] * face_area_box[3]
        face_box_area = face_box[2] * face_box[3]
        face_area_percent = face_box_area * 100 / face_area_box_area
        return face_area_percent + Challenge.MIN_FACE_AREA_PERCENT_TOLERANCE >= min_face_area_percent
