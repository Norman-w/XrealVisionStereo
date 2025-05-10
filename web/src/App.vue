<script setup lang="ts">
import StereoView from './components/StereoView.vue'
</script>

<template>
  <StereoView />
</template>

<style>
/* Global styles from the original HTML body tag */
html, body {
  margin: 0;
  overflow: hidden;
  background-color: #000; /* This might be redundant if StereoView sets it, but good for global default */
  height: 100%;
  width: 100%;
}

#app {
  height: 100%;
  width: 100%;
}
</style>
