// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as faceapi from "face-api.js";
import Logger from "js-logger";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";
import { DrawOptions } from "@/js/Drawer.ts";
import { FaceState } from "@/js/States.ts";
import { FailState } from "@/js/States.ts";
import { NoseState } from "@/js/States.ts";
import { State } from "@/js/States.ts";
import { StateOutput } from "@/js/States.ts";
import { SuccessState } from "@/js/States.ts";

export interface StateManagerOutput {
  readonly end: boolean;
  readonly success?: boolean;
  readonly shouldSaveFrame: boolean;
  readonly drawOptions?: DrawOptions;
  readonly helpMessage?: string;
  readonly helpAnimationNumber?: number;
}

export class StateManager {
  private readonly challengeDetails: ChallengeDetails;

  private currentState!: State;
  private endTime!: number;

  constructor(challengeDetails: ChallengeDetails) {
    this.challengeDetails = challengeDetails;
    this.changeCurrentState(new FaceState(this.challengeDetails));
  }

  process(
    result: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>[]
  ): StateManagerOutput {
    Logger.debug(`current state: ${this.currentState.getName()}`);

    if (this.endTime > 0 && Date.now() / 1000 > this.endTime) {
      Logger.info(`fail: state timed out`);
      this.changeCurrentState(new FailState(this.challengeDetails));
    }
    const stateOutput: StateOutput = this.currentState.process(result);
    if (stateOutput.nextState) {
      this.changeCurrentState(stateOutput.nextState);
    }

    let end = false;
    let shouldSaveFrame = false;
    let success;
    if (this.currentState.getName() === SuccessState.NAME) {
      end = true;
      success = true;
      shouldSaveFrame = true;
    } else if (this.currentState.getName() === FailState.NAME) {
      end = true;
      success = false;
    } else if (this.currentState.getName() === NoseState.NAME) {
      shouldSaveFrame = true;
    }
    return {
      end: end,
      success: success,
      shouldSaveFrame: shouldSaveFrame,
      drawOptions: stateOutput.drawOptions,
      helpMessage: stateOutput.helpMessage,
      helpAnimationNumber: stateOutput.helpAnimationNumber
    };
  }

  private changeCurrentState(state: State) {
    if (this.currentState !== state) {
      this.currentState = state;
      this.endTime =
        state.getMaximumDurationInSeconds() != -1 ? Date.now() / 1000 + state.getMaximumDurationInSeconds() : -1;
    }
  }
}
