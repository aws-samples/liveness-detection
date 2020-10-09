// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import axios from "axios";
import Logger from "js-logger";
import { Utils } from "@/js/Utils.ts";

interface FramesRequestData {
  readonly timestamp: number;
  readonly frameBase64: string;
  readonly token: string;
}

interface FramesResponseData {
  readonly message: string;
}

interface VerifyRequestData {
  readonly token: string;
}

interface VerifyResponseData {
  readonly success: boolean;
}

export class RemoteVerifier {
  private readonly challengeId: string;
  private readonly token: string;
  private readonly videoElement: HTMLVideoElement;
  private readonly promises: Promise<any>[];
  private readonly invisibleCanvas: HTMLCanvasElement;

  constructor(challengeId: string, token: string, videoElement: HTMLVideoElement) {
    this.challengeId = challengeId;
    this.token = token;
    this.videoElement = videoElement;
    this.promises = [];

    // Create canvas to convert video frames to blob
    this.invisibleCanvas = document.createElement("canvas");
    this.invisibleCanvas.width = this.videoElement.width;
    this.invisibleCanvas.height = this.videoElement.height;
  }

  uploadFrame() {
    const context = this.invisibleCanvas.getContext("2d");
    if (context === null) {
      throw "Error getting canvas context";
    }
    context.drawImage(this.videoElement, 0, 0, this.videoElement.width, this.videoElement.height);

    if (Utils.getConfigBooleanValue("FLIP_VIDEO")) {
      context.scale(-1, 1);
    }

    const canvas = this.invisibleCanvas;
    const self = this;
    this.promises.push(
      new Promise(function(resolve: () => void, reject: (error: Error) => void) {
        canvas.toBlob(
          function(blob) {
            if (blob === null) {
              reject(new Error("Error creating blob from canvas"));
            } else {
              RemoteVerifier.callFramesApi(self.challengeId, self.token, blob, resolve, reject);
            }
          },
          "image/jpeg",
          parseFloat(Utils.getConfig().IMAGE_JPG_QUALITY)
        );
      })
    );
  }

  static callFramesApi(
    challengeId: string,
    token: string,
    blob: Blob,
    resolve: () => void,
    reject: (error: Error) => void
  ) {
    Logger.info("uploading frame");
    const reader: FileReader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function() {
      const framesEndpoint: string = Utils.getConfig().API_FRAMES_ENDPOINT_PATTERN.replace(
        "{challengeId}",
        challengeId
      );
      const url: string = Utils.getConfig().API_URL + framesEndpoint;

      Logger.info(`calling ${url}`);
      const dataUrl = reader.result as string;
      const requestData: FramesRequestData = {
        timestamp: Date.now(),
        frameBase64: dataUrl.substr(dataUrl.indexOf(",") + 1),
        token: token
      };
      Logger.info(requestData);
      const promise = axios.put(url, requestData);
      promise
        .then(function(response: any) {
          Logger.info(response);
          const verifyResponseData: FramesResponseData = response.data;
          Logger.info(verifyResponseData);
          Logger.info("frame successfully uploaded");
          resolve();
        })
        .catch(function(error: any) {
          Logger.error(error);
          reject(error);
        });
    };
  }

  verify(successCallback: (result: boolean) => void, errorCallback: (error: Error) => void): void {
    Logger.debug(this.promises);
    const self = this;
    Promise.all(this.promises).then(function() {
      Logger.info("all frames uploaded");
      const requestData: VerifyRequestData = {
        token: self.token
      };
      self.callVerificationApi(requestData, successCallback, errorCallback);
    });
  }

  private callVerificationApi(
    requestData: VerifyRequestData,
    successCallback: (result: boolean) => void,
    errorCallback: (error: Error) => void
  ): void {
    const verifyEndpoint: string = Utils.getConfig().API_VERIFY_ENDPOINT_PATTERN.replace(
      "{challengeId}",
      this.challengeId
    );
    const url: string = Utils.getConfig().API_URL + verifyEndpoint;

    Logger.info(`calling ${url}`);
    Logger.info(requestData);
    const promise = axios.post(url, requestData);
    promise
      .then(function(response: any) {
        Logger.info(response);
        const verifyResponseData: VerifyResponseData = response.data;
        Logger.info(verifyResponseData);
        successCallback(verifyResponseData.success);
      })
      .catch(function(error: any) {
        Logger.error(error);
        errorCallback(error);
      });
  }
}
