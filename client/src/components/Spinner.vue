<!--
Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: MIT-0
-->

<template>
  <div class="text-center mt-5">
    <div class="spinner-border big-spinner" role="status" />
    <h2 class="mt-5">Processing...</h2>
  </div>
</template>

<script lang="ts">
import Vue from "vue";

export default Vue.extend({
  name: "Spinner"
});
</script>

<style scoped>
.big-spinner {
  width: 80px;
  height: 80px;
}
</style>
