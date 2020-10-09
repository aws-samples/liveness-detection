// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as faceapi from "face-api.js";
import Logger from "js-logger";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";
import { Drawer } from "@/js/Drawer.ts";
import { RemoteVerifier } from "@/js/RemoteVerifier.ts";
import { StateManager } from "@/js/StateManager.ts";
import { StateManagerOutput } from "@/js/StateManager.ts";
import { Utils } from "@/js/Utils.ts";

export class ChallengeProcessor {
  private readonly endCallback: (success: boolean, remoteVerifier: RemoteVerifier | undefined) => void;
  private readonly helpMessageCallback: (helpMessage: string | undefined) => void;
  private readonly helpAnimatonCallback: (helpAnimationNumber: number | undefined) => void;
  private readonly drawer: Drawer;
  private readonly stateManager: StateManager;
  private readonly videoElement: HTMLVideoElement;
  private readonly canvasElement: HTMLCanvasElement;
  private readonly remoteVerifier: RemoteVerifier;

  private lastHelpMessage: string | undefined;
  private lastHelpAnimationNumber: number | undefined;

  constructor(
    challengeDetails: ChallengeDetails,
    videoElementId: string,
    canvasElementId: string,
    endCallback: (result: boolean) => void,
    helpMessageCallback: (helpMessage: string | undefined) => void,
    helpAnimatonCallback: (helpAnimationNumber: number | undefined) => void
  ) {
    this.endCallback = endCallback;
    this.helpMessageCallback = helpMessageCallback;
    this.helpAnimatonCallback = helpAnimatonCallback;
    this.stateManager = new StateManager(challengeDetails);
    this.videoElement = document.getElementById(videoElementId) as HTMLVideoElement;
    if (!this.videoElement) {
      throw "Video element not found";
    }
    this.remoteVerifier = new RemoteVerifier(challengeDetails.id, challengeDetails.token, this.videoElement);

    this.canvasElement = document.getElementById(canvasElementId) as HTMLCanvasElement;
    if (!this.canvasElement) {
      throw "Canvas element not found";
    }
    this.drawer = new Drawer(challengeDetails, this.canvasElement);

    this.videoElement.srcObject = Utils.getMediaStreamInfo().mediaStream;

    const self = this;
    self.videoElement.addEventListener("loadedmetadata", function() {
      ChallengeProcessor.process(self);
    });
  }

  static loadModels() {
    if (Utils.isProfiling()) {
      Logger.time("faceDetectionModelLoad");
      Logger.time("faceLandmarkModelLoad");
    }
    const promises: Promise<void>[] = [];
    const url = "/weights/";
    promises.push(this.loadFaceDetectionModel(url));
    promises.push(this.loadLandmarkModel(url));
    (window as any).modelPromises = promises;
  }

  private static loadFaceDetectionModel(url: string): Promise<void> {
    const promise = faceapi.nets.tinyFaceDetector.load(url);
    promise.then(function() {
      if (Utils.isProfiling()) {
        Logger.timeEnd("faceDetectionModelLoad");
      }
      Logger.info("tinyFaceDetector model loaded");
    });
    return promise;
  }

  private static loadLandmarkModel(url: string): Promise<void> {
    const promise = faceapi.nets.faceLandmark68Net.load(url);
    promise.then(function() {
      if (Utils.isProfiling()) {
        Logger.timeEnd("faceLandmarkModelLoad");
      }
      Logger.info("faceLandmark68Net model loaded");
    });
    return promise;
  }

  static process(challengeProcessor: ChallengeProcessor): any {
    Logger.debug("video event handler");
    if (challengeProcessor.videoElement.paused || challengeProcessor.videoElement.ended) {
      Logger.debug("video paused or ended");
      return setTimeout(() => ChallengeProcessor.process(challengeProcessor), 10);
    }

    if (Utils.isProfiling()) {
      Logger.time("faceDetectionWithFaceLandmarks");
    }
    const options = new faceapi.TinyFaceDetectorOptions();
    faceapi
      .detectAllFaces(challengeProcessor.videoElement, options)
      .withFaceLandmarks(false)
      .then(
        // @ts-ignore
        function(result: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]) {
          if (Utils.isProfiling()) {
            Logger.timeEnd("faceDetectionWithFaceLandmarks");
          }

          if (result) {
            ChallengeProcessor.processDetectionResults(challengeProcessor, result);
          } else {
            setTimeout(() => ChallengeProcessor.process(challengeProcessor));
          }
        }
      );
  }

  static processDetectionResults(
    challengeProcessor: ChallengeProcessor,
    results: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]
  ) {
    const dims = faceapi.matchDimensions(challengeProcessor.canvasElement, challengeProcessor.videoElement);
    const resizedResults = faceapi.resizeResults(results, dims);
    const stateManagerOutput: StateManagerOutput = challengeProcessor.stateManager.process(results);

    if (Utils.getConfigBooleanValue("DRAW_DETECTIONS")) {
      faceapi.draw.drawDetections(challengeProcessor.canvasElement, resizedResults);
      faceapi.draw.drawFaceLandmarks(challengeProcessor.canvasElement, resizedResults);
    }

    if (stateManagerOutput.drawOptions) {
      challengeProcessor.drawer.draw(stateManagerOutput.drawOptions);
    }

    if (stateManagerOutput.helpMessage !== challengeProcessor.lastHelpMessage) {
      Logger.debug(
        `help message change: from='${challengeProcessor.lastHelpMessage}' to='${stateManagerOutput.helpMessage}'`
      );
      challengeProcessor.helpMessageCallback(stateManagerOutput.helpMessage);
    }
    challengeProcessor.lastHelpMessage = stateManagerOutput.helpMessage;

    if (stateManagerOutput.helpAnimationNumber !== challengeProcessor.lastHelpAnimationNumber) {
      Logger.debug(
        `help animation change: from=${challengeProcessor.lastHelpAnimationNumber} to=${stateManagerOutput.helpAnimationNumber}`
      );
      challengeProcessor.helpAnimatonCallback(stateManagerOutput.helpAnimationNumber);
    }
    challengeProcessor.lastHelpAnimationNumber = stateManagerOutput.helpAnimationNumber;

    if (stateManagerOutput.shouldSaveFrame) {
      Logger.debug("should save frame");
      challengeProcessor.remoteVerifier.uploadFrame();
    }

    if (stateManagerOutput.end) {
      const localSuccess = stateManagerOutput.success as boolean;
      if (localSuccess) {
        Logger.info("challenge successfully completed locally");
      } else {
        Logger.info("challenge failed locally");
      }

      // if successfully completed locally, pass along remoteVerifier to callback for remote verification
      challengeProcessor.endCallback(localSuccess, localSuccess ? challengeProcessor.remoteVerifier : undefined);
    } else {
      const delay = 1000 / parseInt(Utils.getConfig().MAX_FPS);
      setTimeout(() => ChallengeProcessor.process(challengeProcessor), delay);
    }
  }
}
