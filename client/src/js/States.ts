// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as faceapi from "face-api.js";
import Logger from "js-logger";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";
import { Drawer, DrawOptions } from "@/js/Drawer.ts";
import { Utils } from "@/js/Utils.ts";

export interface StateOutput {
  readonly nextState?: State;
  readonly drawOptions?: DrawOptions;
  readonly helpMessage?: string;
  readonly helpAnimationNumber?: number;
}

export abstract class State {
  constructor(readonly challengeDetails: ChallengeDetails) {}

  process(
    // eslint-disable-next-line
    _faces: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]
  ): StateOutput {
    return {};
  }

  getMaximumDurationInSeconds(): number {
    return -1;
  }

  protected isFaceBoxInsideFaceArea(faceBox: faceapi.Box, addTolerance = true) {
    const tolerance: number = addTolerance ? parseInt(Utils.getConfig().FACE_AREA_TOLERANCE_PERCENT) / 100 : 0;
    return (
      faceBox.x >= this.challengeDetails.areaLeft * (1 - tolerance) &&
      faceBox.y >= this.challengeDetails.areaTop * (1 - tolerance) &&
      faceBox.x + faceBox.width <= this.challengeDetails.areaLeft + this.challengeDetails.areaWidth * (1 + tolerance) &&
      faceBox.y + faceBox.height <= this.challengeDetails.areaTop + this.challengeDetails.areaHeight * (1 + tolerance)
    );
  }

  protected isNoseInsideNoseArea(nose: faceapi.IPoint) {
    return (
      nose.x >= this.challengeDetails.noseLeft &&
      nose.y >= this.challengeDetails.noseTop &&
      nose.x <= this.challengeDetails.noseLeft + this.challengeDetails.noseWidth &&
      nose.y <= this.challengeDetails.noseTop + this.challengeDetails.noseHeight
    );
  }

  abstract getName(): string;
}

export class FailState extends State {
  static NAME = "FailState";

  getName(): string {
    return FailState.NAME;
  }
}

export class SuccessState extends State {
  static NAME = "SuccessState";

  getName(): string {
    return SuccessState.NAME;
  }
}

export class NoseState extends State {
  static NAME = "NoseState";

  private framesWithoutFace = 0;
  private landmarkIndex = parseInt(Utils.getConfig().LANDMARK_INDEX);

  process(
    faces: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]
  ): StateOutput {
    let nextState: State = this;
    if (faces.length === 1) {
      if (this.isFaceBoxInsideFaceArea(faces[0].detection.box)) {
        if (this.isNoseInsideNoseArea(faces[0].landmarks.positions[this.landmarkIndex])) {
          nextState = new SuccessState(this.challengeDetails);
        }
      } else {
        Logger.info(`NoseState fail: isFaceBoxInsideFaceArea=${this.isFaceBoxInsideFaceArea(faces[0].detection.box)}`);
        nextState = new FailState(this.challengeDetails);
      }
    } else {
      if (
        faces.length !== 0 ||
        ++this.framesWithoutFace > parseInt(Utils.getConfig().STATE_NOSE_MAX_FRAMES_WITHOUT_FACE)
      ) {
        Logger.info(`NoseState fail: #faces=${faces.length} framesWithoutFace=${this.framesWithoutFace}`);
        nextState = new FailState(this.challengeDetails);
      } else {
        Logger.debug(`no face detected. Skipping frame...`);
      }
    }
    const drawOptions: DrawOptions = {
      faceDrawBoxOptions: {
        boxColor: Drawer.COLOR_GREEN
      },
      noseDrawBoxOptions: {
        boxColor: Drawer.COLOR_YELLOW
      }
    };
    return {
      nextState: nextState,
      drawOptions: drawOptions,
      helpMessage: "Move the tip of your nose inside the yellow area",
      helpAnimationNumber: 2
    };
  }

  getMaximumDurationInSeconds(): number {
    return parseInt(Utils.getConfig().STATE_NOSE_DURATION_IN_SECONDS);
  }

  getName(): string {
    return NoseState.NAME;
  }
}

export class AreaState extends State {
  static NAME = "AreaState";

  private framesWithoutFace = 0;

  process(
    faces: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]
  ): StateOutput {
    let nextState: State = this;
    let boxColor = Drawer.COLOR_RED;
    if (faces.length === 1) {
      if (this.isFaceBoxInsideFaceArea(faces[0].detection.box, false)) {
        boxColor = Drawer.COLOR_GREEN;
        nextState = new NoseState(this.challengeDetails);
      }
    } else {
      if (
        faces.length !== 0 ||
        ++this.framesWithoutFace > parseInt(Utils.getConfig().STATE_AREA_MAX_FRAMES_WITHOUT_FACE)
      ) {
        Logger.info(`AreaState fail: #faces=${faces.length} framesWithoutFace=${this.framesWithoutFace}`);
        nextState = new FailState(this.challengeDetails);
      } else {
        Logger.debug(`no face detected. Skipping frame...`);
      }
    }
    const drawOptions: DrawOptions = {
      faceDrawBoxOptions: {
        boxColor: boxColor
      }
    };
    return {
      nextState: nextState,
      drawOptions: drawOptions,
      helpMessage: "Center your face inside the area",
      helpAnimationNumber: 1
    };
  }

  getMaximumDurationInSeconds(): number {
    return parseInt(Utils.getConfig().STATE_AREA_DURATION_IN_SECONDS);
  }

  getName(): string {
    return AreaState.NAME;
  }
}

export class FaceState extends State {
  static NAME = "FaceState";

  process(
    faces: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]
  ): StateOutput {
    let nextState: State = this;
    let helpMessage = undefined;
    switch (faces.length) {
      case 0:
        helpMessage = "No face detected. Look at the camera.";
        break;
      case 1:
        nextState = new AreaState(this.challengeDetails);
        break;
      default:
        helpMessage = "More than one face detected. Should be one.";
    }
    const drawOptions: DrawOptions = {
      faceDrawBoxOptions: {
        boxColor: Drawer.COLOR_RED
      }
    };
    return {
      nextState: nextState,
      drawOptions: drawOptions,
      helpMessage: helpMessage
    };
  }

  getName(): string {
    return FaceState.NAME;
  }
}
