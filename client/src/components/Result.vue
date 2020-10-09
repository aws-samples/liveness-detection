<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

<template>
  <div class="text-center">
    <lottie :options="lottieOptions" :height="200" :width="200" />
    <h2 class="mt-4">{{ title }}</h2>
    <h3 class="mt-2">
      <small class="text-muted">{{ message }}</small>
    </h3>
    <button type="button" class="btn btn-primary btn-lg mt-5" @click="$emit('restart')">{{ buttonText }}</button>
  </div>
</template>

<script lang="ts">
import Vue from "vue";
import Lottie from "vue-lottie";
import * as successData from "@/assets/lottie/success.json";
import * as failData from "@/assets/lottie/fail.json";

const SUCCESS_TITLE = "Verified!";
const SUCCESS_MESSAGE = "Successfully verified as a live person.";
const SUCCESS_BUTTON = "Start over";
const FAIL_TITLE = "Uh-oh.";
const FAIL_MESSAGE = "We could not detect a live person.";
const FAIL_BUTTON = "Try again";

export default Vue.extend({
  name: "Result",
  components: {
    Lottie
  },
  props: {
    success: Boolean
  },
  computed: {
    title(): string {
      return this.success ? SUCCESS_TITLE : FAIL_TITLE;
    },
    message(): string {
      return this.success ? SUCCESS_MESSAGE : FAIL_MESSAGE;
    },
    buttonText(): string {
      return this.success ? SUCCESS_BUTTON : FAIL_BUTTON;
    },
    lottieOptions(): any {
      return {
        // @ts-ignore
        animationData: this.success ? successData.default : failData.default,
        loop: false
      };
    }
  }
});
</script>

<style></style>
