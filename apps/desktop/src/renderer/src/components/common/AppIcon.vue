<script setup lang="ts">
import { computed } from 'vue'
import { iconPaths, type IconName } from '@/constants/icons'

const props = withDefaults(
  defineProps<{
    name: IconName
    size?: number
    strokeWidth?: number
  }>(),
  {
    size: 18,
    strokeWidth: 1.75
  }
)

const paths = computed(() => iconPaths[props.name])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="inline-block shrink-0"
    aria-hidden="true"
  >
    <path v-for="(path, index) in paths" :key="index" :d="path" />
  </svg>
</template>
