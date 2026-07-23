import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RecognitionDebugEntry } from '@novel-assistant/core'

const STORAGE_KEY = 'novel-assistant:recognition-debug'

function loadPersistedLogs(): Record<string, RecognitionDebugEntry[]> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, RecognitionDebugEntry[]>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persistLogs(logsByChapter: Record<string, RecognitionDebugEntry[]>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(logsByChapter))
  } catch {
    // sessionStorage 满或不可用时忽略
  }
}

export const useRecognitionDebugStore = defineStore('recognitionDebug', () => {
  const logsByChapter = ref<Record<string, RecognitionDebugEntry[]>>(loadPersistedLogs())

  function createSession(chapterId: string): void {
    logsByChapter.value = {
      ...logsByChapter.value,
      [chapterId]: []
    }
    persistLogs(logsByChapter.value)
  }

  function append(
    chapterId: string,
    entry: Omit<RecognitionDebugEntry, 'id' | 'timestamp'>
  ): void {
    const existing = logsByChapter.value[chapterId] ?? []
    const next = [
      ...existing,
      {
        ...entry,
        id: `${Date.now()}-${existing.length}`,
        timestamp: new Date().toISOString()
      }
    ]
    logsByChapter.value = {
      ...logsByChapter.value,
      [chapterId]: next
    }
    persistLogs(logsByChapter.value)
  }

  function getLogs(chapterId: string): RecognitionDebugEntry[] {
    return logsByChapter.value[chapterId] ?? []
  }

  function clear(chapterId: string): void {
    const next = { ...logsByChapter.value }
    delete next[chapterId]
    logsByChapter.value = next
    persistLogs(logsByChapter.value)
  }

  return {
    logsByChapter,
    createSession,
    append,
    getLogs,
    clear
  }
})
