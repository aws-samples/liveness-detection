// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import axios from "axios";
import Logger from "js-logger";
import { Utils } from "@/js/Utils.ts";

interface StartRequestData {
  readonly userId: string;
  readonly imageWidth: number;
  readonly imageHeight: number;
}

export interface ChallengeDetails {
  readonly id: string;
  readonly userId: string;
  readonly token: string;
  readonly areaHeight: number;
  readonly areaLeft: number;
  readonly areaTop: number;
  readonly areaWidth: number;
  readonly imageHeight: number;
  readonly imageWidth: number;
  readonly noseHeight: number;
  readonly noseLeft: number;
  readonly noseTop: number;
  readonly noseWidth: number;
}

export class RemoteStarter {
  static startChallenge(
    successCallback: (challengeDetails: ChallengeDetails) => void,
    errorCallback: (error: Error) => void
  ): void {
    const url: string = Utils.getConfig().API_URL + Utils.getConfig().API_START_ENDPOINT;
    const startRequestData: StartRequestData = {
      userId: Utils.getUserId(),
      imageWidth: Utils.getMediaStreamInfo().actualWidth,
      imageHeight: Utils.getMediaStreamInfo().actualHeight
    };
    Logger.info(`calling ${url}`);
    Logger.info(startRequestData);
    axios
      .post(url, startRequestData)
      .then(function(response: any) {
        Logger.info(response);
        const challengeDetails: ChallengeDetails = response.data;
        Logger.info(challengeDetails);
        successCallback(challengeDetails);
      })
      .catch(function(error: any) {
        Logger.error(error);
        errorCallback(error);
      });
  }
}
