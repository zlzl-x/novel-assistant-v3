<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { isMapPlaceClickMessage } from '@novel-assistant/core'

const props = defineProps<{
  html: string
  highlightNodeId?: string | null
}>()

const emit = defineEmits<{
  placeClick: [placeId: string]
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)

function postHighlight(placeId: string | null | undefined): void {
  const frame = iframeRef.value?.contentWindow
  if (!frame || !placeId) return
  // Sandboxed srcdoc iframes have an opaque origin, so targetOrigin must stay '*'.
  frame.postMessage({ type: 'highlight', placeId }, '*')
}

function handleMessage(event: MessageEvent): void {
  if (event.source !== iframeRef.value?.contentWindow) return
  if (!isMapPlaceClickMessage(event.data)) return
  emit('placeClick', event.data.placeId)
}

onMounted(() => {
  window.addEventListener('message', handleMessage)
})

onBeforeUnmount(() => {
  window.removeEventListener('message', handleMessage)
})

watch(
  () => props.highlightNodeId,
  (placeId) => {
    postHighlight(placeId)
  }
)

watch(
  () => props.html,
  () => {
    window.setTimeout(() => postHighlight(props.highlightNodeId), 50)
  }
)
</script>

<template>
  <iframe
    ref="iframeRef"
    class="h-full w-full rounded-lg border border-slate-200 bg-white"
    sandbox="allow-scripts"
    :srcdoc="html"
    title="地图预览"
  />
</template>
