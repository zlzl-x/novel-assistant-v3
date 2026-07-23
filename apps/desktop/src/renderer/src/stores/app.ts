import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

const SIDEBAR_COLLAPSED_KEY = 'novel-assistant:sidebarCollapsed'
const PREVIEW_COLLAPSED_KEY = 'novel-assistant:previewCollapsed'

function readBoolean(key: string, fallback: boolean): boolean {
  const value = localStorage.getItem(key)
  if (value === null) return fallback
  return value === 'true'
}

export const useAppStore = defineStore('app', () => {
  const storagePath = ref('')
  const sidebarCollapsed = ref(readBoolean(SIDEBAR_COLLAPSED_KEY, false))
  const previewCollapsed = ref(readBoolean(PREVIEW_COLLAPSED_KEY, false))
  const windowWidth = ref(window.innerWidth)

  const isNarrowLayout = computed(() => windowWidth.value < 1280)
  const isCompactPreview = computed(() => windowWidth.value < 1440)

  watch(sidebarCollapsed, (value) => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value))
  })

  watch(previewCollapsed, (value) => {
    localStorage.setItem(PREVIEW_COLLAPSED_KEY, String(value))
  })

  function setWindowWidth(width: number): void {
    windowWidth.value = width
    if (width < 1280) {
      sidebarCollapsed.value = true
    }
  }

  async function loadStoragePath(): Promise<void> {
    const result = await window.novelApi.storage.getPath()
    if (result.success && result.data) {
      storagePath.value = result.data.path
    }
  }

  async function pickStorageDirectory(): Promise<boolean> {
    const result = await window.novelApi.storage.pickDirectory()
    if (!result.success) {
      throw new Error(result.error ?? '选择目录失败')
    }
    if (!result.data) {
      return false
    }
    storagePath.value = result.data.path
    return true
  }

  function toggleSidebar(): void {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  function togglePreview(): void {
    previewCollapsed.value = !previewCollapsed.value
  }

  return {
    storagePath,
    sidebarCollapsed,
    previewCollapsed,
    windowWidth,
    isNarrowLayout,
    isCompactPreview,
    setWindowWidth,
    loadStoragePath,
    pickStorageDirectory,
    toggleSidebar,
    togglePreview
  }
})
