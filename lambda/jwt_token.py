# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import jwt


class Token:

    JWT_ALGORITHM = 'HS256'

    def __init__(self, challenge_id, secret):
        self.challenge_id = challenge_id
        self.secret = secret

    def get_jwt(self):
        payload = {
            'challengeId': self.challenge_id
        }
        return jwt.encode(payload, self.secret, algorithm=Token.JWT_ALGORITHM)

    def verify_jwt(self, token):
        try:
            decoded = jwt.decode(token, self.secret, algorithms=Token.JWT_ALGORITHM)
            return decoded['challengeId'] == self.challenge_id
        except jwt.exceptions.InvalidTokenError:
            return False
