<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

<template>
  <div class="videoContainer mx-auto" :style="cssVars">
    <video
      id="webcamVideo"
      :class="{ rotate: shouldRotate }"
      :width="videoWidth"
      :height="videoHeight"
      autoplay
      muted
      playsinline
    ></video>
    <canvas id="overlayCanvas" :class="{ rotate: shouldRotate }" :width="videoWidth" :height="videoHeight" />
    <div class="helpContainer clearfix">
      <div class="float-left messageContainer">
        <div class="message">
          <h5>{{ message }}</h5>
        </div>
      </div>
      <div class="float-right">
        <lottie v-show="animation === 1" :options="lottieOptions1" :height="100" :width="100" />
        <lottie v-show="animation === 2" :options="lottieOptions2" :height="100" :width="100" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Lottie from "vue-lottie";
import * as help1 from "@/assets/lottie/help1.json";
import * as help2 from "@/assets/lottie/help2.json";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";
import { ChallengeProcessor } from "@/js/ChallengeProcessor.ts";
import { RemoteVerifier } from "@/js/RemoteVerifier.ts";
import { Utils } from "@/js/Utils.ts";

export default Vue.extend({
  name: "Challenge",
  components: {
    Lottie
  },
  props: {
    details: Object
  },
  data() {
    return {
      message: "Loading...",
      animation: -1,
      // @ts-ignore
      lottieOptions1: { animationData: help1.default },
      // @ts-ignore
      lottieOptions2: { animationData: help2.default },

      videoWidth: Utils.getMediaStreamInfo().actualWidth,
      videoHeight: Utils.getMediaStreamInfo().actualHeight,
      shouldRotate: Utils.getConfigBooleanValue("FLIP_VIDEO"),
      // Ugly hack to pass variables to CSS
      cssVars: {
        "--video-width": Utils.getMediaStreamInfo().actualWidth + "px",
        "--video-height": Utils.getMediaStreamInfo().actualHeight + "px",
        "--help-container-padding-top": Utils.getMediaStreamInfo().actualHeight + 5 + "px"
      }
    };
  },
  methods: {
    onLocalEnd(success: boolean, remoteVerifier: RemoteVerifier | undefined): void {
      if (success) {
        this.$emit("local-success", remoteVerifier as RemoteVerifier);
      } else {
        this.$emit("local-fail");
      }
    },
    onHelpMessage(message: string | undefined): void {
      this.message = message || "";
    },
    onHelpAnimation(animationNumber: number | undefined): void {
      this.animation = animationNumber || -1;
    }
  },
  mounted: function() {
    const self: any = this;
    this.$nextTick(function() {
      new ChallengeProcessor(
        self.details as ChallengeDetails,
        "webcamVideo",
        "overlayCanvas",
        self.onLocalEnd,
        self.onHelpMessage,
        self.onHelpAnimation
      );
    });
  }
});
</script>

<style scoped>
#webcamVideo {
  width: var(--video-width);
  height: var(--video-height);
}
#webcamVideo,
#overlayCanvas {
  position: absolute;
}
.rotate {
  transform: rotateY(180deg);
}
.videoContainer {
  position: relative;
  width: var(--video-width);
}
.helpContainer {
  padding-top: var(--help-container-padding-top);
}
.messageContainer {
  height: 100px;
  display: table;
}
.message {
  display: table-cell;
  vertical-align: middle;
}
</style>
