# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import base64
import decimal
import json
import os
import re

from concurrent.futures import ThreadPoolExecutor, as_completed

import boto3

from botocore.exceptions import ClientError
from aws_lambda_powertools.utilities import parameters

from challenge import Challenge
from states.manager import StateManager
from states.face import FaceState
from jwt_token import Token


region_name = os.getenv('REGION_NAME')
bucket_name = os.getenv('BUCKET_NAME')
dynamo_table = os.getenv('DDB_TABLE')
token_secret_arn = os.getenv('TOKEN_SECRET_ARN')

token_secret = parameters.get_secret(token_secret_arn)
s3 = boto3.client('s3', region_name=region_name)
rek = boto3.client('rekognition', region_name=region_name)
ddb = boto3.resource('dynamodb', region_name=region_name)
table = ddb.Table(dynamo_table)

START_PATTERN = re.compile('/challenge/start')
PUT_FRAME_PATTERN = re.compile('\\/challenge\\/[A-Za-z0-9-]*\\/frames')
VERIFY_PATTERN = re.compile('\\/challenge\\/[A-Za-z0-9-]*\\/verify')


def lambda_handler(event, _):
    method = event['httpMethod']
    path = event['path']

    body = json.loads(event['body'])
    if method == 'POST' and START_PATTERN.match(path):
        status_code, response = start_challenge(body)
    elif method == 'PUT' and PUT_FRAME_PATTERN.match(path):
        challenge_id = get_challenge_id(event)
        status_code, response = execute_if_token_is_valid(body['token'], challenge_id, put_challenge_frame,
                                                          challenge_id, body)
    elif method == 'POST' and VERIFY_PATTERN.match(path):
        challenge_id = get_challenge_id(event)
        status_code, response = execute_if_token_is_valid(body['token'], challenge_id, verify_challenge, challenge_id)

    return {
        'statusCode': status_code,
        'headers': {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'OPTIONS,POST',
            'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
        },
        'body': json.dumps(response)
    }


# Executes the 'func' function, with the 'args' arguments, if the JWT is valid
def execute_if_token_is_valid(token, challenge_id, func, *args):
    if Token(challenge_id, token_secret).verify_jwt(token):
        return func(*args)
    return 403, {'message': 'Invalid token'}


def get_challenge_id(event):
    return event['pathParameters'].get('challengeId', None) if event['pathParameters'] else None


def start_challenge(request):
    user_id = request['userId']
    image_width = int(request['imageWidth'])
    image_height = int(request['imageHeight'])
    challenge = vars(Challenge(user_id, image_width, image_height, token_secret))
    table.put_item(Item=challenge)
    return 200, challenge


def put_challenge_frame(challenge_id, request):
    timestamp = int(request['timestamp'])
    frame = base64.b64decode(request['frameBase64'])
    frame_key = '{}/{}.jpg'.format(challenge_id, timestamp)
    # Updating challenge on DynamoDB table
    try:
        table.update_item(
            Key={'id': challenge_id},
            UpdateExpression='set #frames = list_append(if_not_exists(#frames, :empty_list), :frame)',
            ExpressionAttributeNames={'#frames': 'frames'},
            ExpressionAttributeValues={
                ':empty_list': [],
                ':frame': [{
                    'timestamp': timestamp,
                    'key': frame_key
                }]
            },
            ConditionExpression='attribute_exists(userId)',
            ReturnValues='NONE'
        )
    except ClientError as error:
        if error.response['Error']['Code'] == 'ConditionalCheckFailedException':
            return 404, {'message': 'Challenge not found'}
        raise error
    # Uploading frame to S3 bucket
    s3.put_object(
        Body=frame,
        Bucket=bucket_name,
        Key=frame_key
    )
    return 200, {'message': 'Frame saved successfully'}


def verify_challenge(challenge_id):
    if not challenge_id:
        return 422, {'message': 'Missing path parameter \'challengeId\''}
    # Looking up challenge on DynamoDB table
    item = table.get_item(Key={'id': challenge_id})
    if 'Item' not in item:
        return 404, {'message': 'Challenge not found'}
    challenge = read_item(item['Item'])
    # Getting frames from challenge
    frames = challenge['frames']
    # Invoking Rekognition with parallel threads
    with ThreadPoolExecutor(max_workers=10) as pool:
        futures = [
            pool.submit(
                detect_faces, frame
            ) for frame in frames
        ]
        frames = [r.result() for r in as_completed(futures)]
    frames.sort(key=lambda frame: frame['key'])
    # Setting up state manager
    first_state = FaceState(challenge)
    state_manager = StateManager(first_state)
    current_state_name = state_manager.get_current_state_name()
    # Processing Rekognition results with state manager
    for frame in frames:
        state_manager.process(frame)
        current_state_name = state_manager.get_current_state_name()
        if current_state_name in {"SuccessState", "FailState"}:  # Final state
            break
    # Returning result based on final state
    response = {'success': current_state_name == "SuccessState"}
    # Updating challenge on DynamoDB table
    table.update_item(
        Key={'id': challenge_id},
        UpdateExpression='set #frames = :frames, #success = :success',
        ExpressionAttributeNames={
            '#frames': 'frames',
            '#success': 'success'
        },
        ExpressionAttributeValues={
            ':frames': write_item(frames),
            ':success': response['success']
        },
        ReturnValues='NONE'
    )
    return 200, response


def detect_faces(frame):
    frame['rekMetadata'] = rek.detect_faces(
        Attributes=['ALL'],
        Image={
            'S3Object': {
                'Bucket': bucket_name,
                'Name': frame['key']
            }
        }
    )['FaceDetails']
    return frame


def read_item(item):
    return json.loads(json.dumps(item, cls=DecimalEncoder))


def write_item(item):
    return json.loads(json.dumps(item), parse_float=decimal.Decimal)


# Helper class to convert a DynamoDB item to JSON.
class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, decimal.Decimal):
            if o % 1 > 0:
                return float(o)
            return int(o)
        return super(DecimalEncoder, self).default(o)
