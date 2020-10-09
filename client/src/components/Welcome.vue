<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

<template>
  <div class="text-center">
    <lottie :options="lottieOptions" :height="300" :width="300" />
    <h4 class="display-4 mt-4"><strong>Liveness</strong> Detection</h4>
    <div v-if="loading" class="spinner-border mt-5" role="status" />
    <button v-else type="button" :disabled="!ready" class="btn btn-primary btn-lg mt-5" @click="start()">
      Verify now!
    </button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Lottie from "vue-lottie";
import { ChallengeDetails } from "@/js/RemoteStarter.ts";
import { RemoteStarter } from "@/js/RemoteStarter.ts";
import * as welcomeData from "@/assets/lottie/welcome.json";

export default Vue.extend({
  name: "Welcome",
  components: {
    Lottie
  },
  props: {
    ready: Boolean
  },
  data() {
    return {
      lottieOptions: {
        // @ts-ignore
        animationData: welcomeData.default,
        loop: false
      },
      loading: false
    };
  },
  methods: {
    start(): void {
      this.loading = true;
      const self: any = this;
      RemoteStarter.startChallenge(
        function(challengeDetails: ChallengeDetails) {
          // Make sure all models are loaded
          Promise.all((window as any).modelPromises).then(function() {
            self.$emit("challenge-details", challengeDetails);
          });
        },
        function(error: Error) {
          self.$emit("error", error);
        }
      );
    }
  }
});
</script>

<style scoped></style>
