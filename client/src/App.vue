<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

<template>
  <div id="app">
    <Welcome
      v-if="step === 1"
      :ready="mediaStreamReady"
      @challenge-details="onChallengeDetails($event)"
      @error="onError($event)"
    />
    <Challenge
      v-else-if="step === 2"
      :details="challengeDetails"
      @local-success="onLocalSuccess($event)"
      @local-fail="onLocalFail()"
      @error="onError($event)"
    />
    <Spinner v-else-if="step === 3" />
    <Result v-else-if="step === 4" :success="success" @restart="onRestart()" />
    <Error v-else-if="step === -1" :message="errorMessage" @restart="onRestart()" />
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Challenge from "./components/Challenge.vue";
import Spinner from "./components/Spinner.vue";
import Welcome from "./components/Welcome.vue";
import Result from "./components/Result.vue";
import Error from "./components/Error.vue";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";
import { ChallengeProcessor } from "@/js/ChallengeProcessor.ts";
import { RemoteVerifier } from "@/js/RemoteVerifier.ts";
import { Utils } from "@/js/Utils.ts";

Utils.loadConfig();
Utils.configureLogger();

export default Vue.extend({
  name: "App",
  components: {
    Welcome,
    Challenge,
    Spinner,
    Result,
    Error
  },
  data() {
    return {
      challengeDetails: {},
      success: false,
      step: 1,
      mediaStreamReady: false,
      errorMessage: ""
    };
  },
  methods: {
    onChallengeDetails(challengeDetails: ChallengeDetails): void {
      this.challengeDetails = challengeDetails;
      this.step = 2;
    },
    onLocalSuccess(remoteVerifier: RemoteVerifier): void {
      this.step = 3;

      const self = this;
      remoteVerifier.verify(
        function(success: boolean) {
          self.success = success;
          self.step = 4;
        },
        function(error: Error) {
          self.onError(error);
        }
      );
    },
    onLocalFail(): void {
      this.success = false;
      this.step = 4;
    },
    onRestart(): void {
      this.step = 1;
    },
    onError(error: Error): void {
      this.errorMessage = error.name + ": " + error.message;
      this.step = -1;
    }
  },
  mounted: function() {
    ChallengeProcessor.loadModels();

    const self = this;
    Utils.loadMediaStream(
      function() {
        self.mediaStreamReady = true;
      },
      function(message) {
        self.errorMessage = message;
        self.step = -1;
      }
    );
  }
});
</script>

<style>
#app {
  margin: 15px;
}
</style>
