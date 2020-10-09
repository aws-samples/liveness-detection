// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import * as faceapi from "face-api.js";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";

export interface DrawBoxOptions {
  readonly boxColor?: string;
  readonly lineWidth?: number;
}

export interface DrawOptions {
  readonly faceDrawBoxOptions?: DrawBoxOptions;
  readonly noseDrawBoxOptions?: DrawBoxOptions;
}

export class Drawer {
  public static COLOR_RED = "rgba(255, 0, 0, 1)";
  public static COLOR_GREEN = "rgba(0, 255, 0, 1)";
  public static COLOR_YELLOW = "rgba(255, 255, 0, 1)";

  private readonly challengeDetails: ChallengeDetails;
  private readonly canvasElement: HTMLCanvasElement;

  constructor(challengeDetails: ChallengeDetails, canvasElement: HTMLCanvasElement) {
    this.challengeDetails = challengeDetails;
    this.canvasElement = canvasElement;
  }

  draw(drawOptions: DrawOptions) {
    if (drawOptions.faceDrawBoxOptions) {
      const faceAreaBox = {
        x: this.challengeDetails.areaLeft,
        y: this.challengeDetails.areaTop,
        width: this.challengeDetails.areaWidth,
        height: this.challengeDetails.areaHeight
      };
      this.drawArea(faceAreaBox, drawOptions.faceDrawBoxOptions);
    }
    if (drawOptions.noseDrawBoxOptions) {
      const noseAreaBox = {
        x: this.challengeDetails.noseLeft,
        y: this.challengeDetails.noseTop,
        width: this.challengeDetails.noseWidth,
        height: this.challengeDetails.noseHeight
      };
      this.drawArea(noseAreaBox, drawOptions.noseDrawBoxOptions);
    }
  }

  private drawArea(box: faceapi.IRect, drawBoxOptions: DrawBoxOptions) {
    const drawBox = new faceapi.draw.DrawBox(box, drawBoxOptions);
    drawBox.draw(this.canvasElement);
  }
}
