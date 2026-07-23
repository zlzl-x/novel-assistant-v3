import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { MapDebugEntry } from '@novel-assistant/core'

const STORAGE_KEY = 'novel-assistant:map-debug'

function loadPersistedLogs(): Record<string, MapDebugEntry[]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, MapDebugEntry[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistLogs(logsByWorld: Record<string, MapDebugEntry[]>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logsByWorld))
  } catch {
    // sessionStorage 满或不可用时忽略
  }
}

export const useMapDebugStore = defineStore('mapDebug', () => {
  const logsByWorld = ref<Record<string, MapDebugEntry[]>>(loadPersistedLogs())

  function createSession(worldId: string): void {
    logsByWorld.value = {
      ...logsByWorld.value,
      [worldId]: []
    }
    persistLogs(logsByWorld.value)
  }

  function append(worldId: string, entry: Omit<MapDebugEntry, 'id' | 'timestamp'>): void {
    const existing = logsByWorld.value[worldId] ?? []
    const next = [
      ...existing,
      {
        ...entry,
        id: `${Date.now()}-${existing.length}`,
        timestamp: new Date().toISOString()
      }
    ]
    logsByWorld.value = {
      ...logsByWorld.value,
      [worldId]: next
    }
    persistLogs(logsByWorld.value)
  }

  function getLogs(worldId: string): MapDebugEntry[] {
    return logsByWorld.value[worldId] ?? []
  }

  function clear(worldId: string): void {
    const next = { ...logsByWorld.value }
    delete next[worldId]
    logsByWorld.value = next
    persistLogs(logsByWorld.value)
  }

  return {
    logsByWorld,
    createSession,
    append,
    getLogs,
    clear
  }
})
