# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import random
import uuid

from jwt_token import Token


class Challenge:

    AREA_BOX_WIDTH_RATIO = 0.75
    AREA_BOX_HEIGHT_RATIO = 0.75
    AREA_BOX_ASPECT_RATIO = 0.75
    MIN_FACE_AREA_PERCENT = 50
    MIN_FACE_AREA_PERCENT_TOLERANCE = 20
    NOSE_BOX_SIZE = 20
    NOSE_BOX_CENTER_MIN_H_DIST = 45
    NOSE_BOX_CENTER_MAX_H_DIST = 75
    NOSE_BOX_CENTER_MAX_V_DIST = 40


    def __init__(self, user_id, image_width, image_height, token_secret):
        area_x, area_y, area_w, area_h = Challenge.get_area_box(image_width, image_height)
        nose_x, nose_y, nose_w, nose_h = Challenge.get_nose_box(image_width, image_height)
        self.id = str(uuid.uuid1())
        self.userId = user_id
        self.imageWidth = image_width
        self.imageHeight = image_height
        self.areaLeft = int(area_x)
        self.areaTop = int(area_y)
        self.areaWidth = int(area_w)
        self.areaHeight = int(area_h)
        self.minFaceAreaPercent = Challenge.MIN_FACE_AREA_PERCENT
        self.noseLeft = int(nose_x)
        self.noseTop = int(nose_y)
        self.noseWidth = int(nose_w)
        self.noseHeight = int(nose_h)
        self.token = Token(self.id, token_secret).get_jwt()

    @staticmethod
    def get_area_box(image_width, image_height):
        area_height = image_height * Challenge.AREA_BOX_HEIGHT_RATIO
        area_width = min(
            image_width * Challenge.AREA_BOX_WIDTH_RATIO,
            area_height * Challenge.AREA_BOX_ASPECT_RATIO
        )
        area_left = image_width/2 - area_width/2
        area_top = image_height/2 - area_height/2
        return (area_left,
                area_top,
                area_width,
                area_height)

    @staticmethod
    def get_nose_box(image_width, image_height):
        width = Challenge.NOSE_BOX_SIZE
        height = Challenge.NOSE_BOX_SIZE
        multiplier = random.choice([1, -1])
        left = image_width/2 + (
            multiplier *
            random.randint(Challenge.NOSE_BOX_CENTER_MIN_H_DIST,
                           Challenge.NOSE_BOX_CENTER_MAX_H_DIST)
        )
        if multiplier == -1:
            left = left - width
        multiplier = random.choice([1, -1])
        top = image_height/2 + (
            multiplier *
            random.randint(0, Challenge.NOSE_BOX_CENTER_MAX_V_DIST)
        )
        if multiplier == -1:
            top = top - height
        return [left, top, width, height]
