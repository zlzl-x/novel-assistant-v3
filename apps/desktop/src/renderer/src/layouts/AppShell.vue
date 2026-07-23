<script setup lang="ts">
import { RouterView } from 'vue-router'
import { onBeforeUnmount, onMounted } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

function handleResize(): void {
  appStore.setWindowWidth(window.innerWidth)
}

onMounted(async () => {
  handleResize()
  window.addEventListener('resize', handleResize)
  await appStore.loadStoragePath()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="flex h-screen min-w-[1024px] flex-col bg-[#f8fafc] text-slate-800">
    <TopBar />
    <main class="min-h-0 flex-1 overflow-hidden">
      <RouterView />
    </main>
  </div>
</template>
