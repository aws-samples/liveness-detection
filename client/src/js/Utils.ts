// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import Logger from "js-logger";
import { v4 as uuidv4 } from "uuid";

export interface Config {
  DRAW_DETECTIONS: string;
  PROFILING: string;
  API_URL: string;
  API_START_ENDPOINT: string;
  API_VERIFY_ENDPOINT_PATTERN: string;
  API_FRAMES_ENDPOINT_PATTERN: string;
  IMAGE_WIDTH: string;
  IMAGE_HEIGHT: string;
  IMAGE_JPG_QUALITY: string;
  STATE_AREA_DURATION_IN_SECONDS: string;
  STATE_NOSE_DURATION_IN_SECONDS: string;
  STATE_AREA_MAX_FRAMES_WITHOUT_FACE: string;
  STATE_NOSE_MAX_FRAMES_WITHOUT_FACE: string;
  MAX_FPS: string;
  FACE_AREA_TOLERANCE_PERCENT: string;
  FLIP_VIDEO: string;
  LANDMARK_INDEX: string;
}

export interface MediaStreamInfo {
  mediaStream: MediaStream;
  actualHeight: number;
  actualWidth: number;
}

export class Utils {
  private static KEY_PREFIX = "VUE_APP_";

  static loadConfig() {
    const envKeys = Object.keys(process.env);
    const map = new Map();
    envKeys.forEach(function(envKey) {
      const key = envKey.replace(Utils.KEY_PREFIX, "");
      const value = process.env[envKey] as string;
      map.set(key, value);
    });
    (window as any).config = Object.fromEntries(map);
  }

  static getConfig(): Config {
    return (window as any).config as Config;
  }

  static getConfigBooleanValue(configKey: string): boolean {
    return (
      // @ts-ignore
      Utils.getConfig()
        [configKey].trim()
        .toLowerCase() === "true"
    );
  }

  static isProfiling(): boolean {
    return Utils.getConfigBooleanValue("PROFILING");
  }

  static configureLogger() {
    Logger.useDefaults();
    if (process.env.NODE_ENV == "production") {
      Logger.setLevel(Logger.OFF);
    }
    (window as any).Logger = Logger;
  }

  static loadMediaStream(successCallback: () => void, errorCallback: (message: string) => void) {
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        width: parseInt(Utils.getConfig().IMAGE_WIDTH),
        height: parseInt(Utils.getConfig().IMAGE_HEIGHT),
        facingMode: "user"
      }
    };
    navigator.mediaDevices
      .getUserMedia(constraints)
      .then(function(mediaStream: MediaStream) {
        try {
          const mediaStreamInfo = {
            mediaStream: mediaStream,
            actualHeight: mediaStream.getVideoTracks()[0].getSettings().height,
            actualWidth: mediaStream.getVideoTracks()[0].getSettings().width
          };
          Logger.info(
            `media info: actualHeight=${mediaStreamInfo.actualHeight} actualWidth=${mediaStreamInfo.actualWidth}`
          );
          (window as any).mediaStreamInfo = mediaStreamInfo;
        } catch (error) {
          Logger.error(error);
          errorCallback("Error getting video actual sizes");
        }
        successCallback();
      })
      .catch(function(error) {
        Logger.error(error);
        errorCallback("Error getting access to the camera");
      });
  }

  static getMediaStreamInfo(): MediaStreamInfo {
    return (window as any).mediaStreamInfo as MediaStreamInfo;
  }

  static getUserId(): string {
    let userId = window.localStorage.getItem("userId");
    if (userId === null) {
      userId = uuidv4();
      window.localStorage.setItem("userId", userId);
    }
    Logger.info(`userId=${userId}`);
    return userId;
  }
}
