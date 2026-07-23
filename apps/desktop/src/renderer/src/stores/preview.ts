import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  CharacterPreviewMeta,
  PreviewRoleTier,
  PreviewRow,
  RecognitionPreview
} from '@novel-assistant/core'

function cloneRows(rows: PreviewRow[]): PreviewRow[] {
  return rows.map((row) => ({
    ...row,
    checked: row.changed ? true : row.checked
  }))
}

/** 预览仅内存暂存，不入库 */
export const usePreviewStore = defineStore('preview', () => {
  const previews = ref<Record<string, RecognitionPreview>>({})
  const editableRowsByChapter = ref<Record<string, Record<string, PreviewRow[]>>>({})
  const recognizingChapterId = ref<string | null>(null)
  const progressLabel = ref('')

  function getPreview(chapterId: string): RecognitionPreview | undefined {
    return previews.value[chapterId]
  }

  function initEditableRows(chapterId: string, preview: RecognitionPreview): void {
    const next: Record<string, PreviewRow[]> = {}
    for (const [characterId, rows] of Object.entries(preview.previewRowsByCharacter ?? {})) {
      next[characterId] = cloneRows(rows)
    }
    editableRowsByChapter.value = {
      ...editableRowsByChapter.value,
      [chapterId]: next
    }
  }

  function getEditableRows(chapterId: string): Record<string, PreviewRow[]> {
    return editableRowsByChapter.value[chapterId] ?? {}
  }

  function getCharacterRows(chapterId: string, characterId: string): PreviewRow[] {
    return editableRowsByChapter.value[chapterId]?.[characterId] ?? []
  }

  function setCharacterRows(chapterId: string, characterId: string, rows: PreviewRow[]): void {
    const chapterRows = { ...(editableRowsByChapter.value[chapterId] ?? {}) }
    chapterRows[characterId] = rows
    editableRowsByChapter.value = {
      ...editableRowsByChapter.value,
      [chapterId]: chapterRows
    }
  }

  function clearEditableRows(chapterId: string): void {
    const next = { ...editableRowsByChapter.value }
    delete next[chapterId]
    editableRowsByChapter.value = next
  }

  function setPreview(chapterId: string, preview: RecognitionPreview): void {
    previews.value = { ...previews.value, [chapterId]: preview }
    if (preview.previewRowsByCharacter) {
      const existing = editableRowsByChapter.value[chapterId] ?? {}
      const next: Record<string, PreviewRow[]> = { ...existing }
      for (const [characterId, rows] of Object.entries(preview.previewRowsByCharacter)) {
        next[characterId] = cloneRows(rows)
      }
      editableRowsByChapter.value = {
        ...editableRowsByChapter.value,
        [chapterId]: next
      }
    }
  }

  function updatePreview(chapterId: string, updater: (preview: RecognitionPreview) => RecognitionPreview): void {
    const current = previews.value[chapterId]
    if (!current) return
    const next = updater(current)
    previews.value = { ...previews.value, [chapterId]: next }
  }

  function clearPreview(chapterId: string): void {
    const next = { ...previews.value }
    delete next[chapterId]
    previews.value = next
    clearEditableRows(chapterId)
  }

  function reset(): void {
    previews.value = {}
    editableRowsByChapter.value = {}
    recognizingChapterId.value = null
    progressLabel.value = ''
  }

  function clearAll(): void {
    reset()
  }

  function setRecognizing(chapterId: string | null, label = ''): void {
    recognizingChapterId.value = chapterId
    progressLabel.value = label
  }

  function isRecognizing(chapterId: string): boolean {
    return recognizingChapterId.value === chapterId
  }

  function setCharacterRoleTier(chapterId: string, characterKey: string, roleTier: PreviewRoleTier): void {
    if (roleTier === 'protagonist') {
      setProtagonistPreviewKey(chapterId, characterKey)
      return
    }

    updatePreview(chapterId, (current) => {
      const meta = current.characterPreviewMeta?.[characterKey]
      if (!meta) return current

      const nextMeta = { ...current.characterPreviewMeta }
      nextMeta[characterKey] = { ...meta, roleTier }

      const clearProtagonist = current.protagonistPreviewKey === characterKey

      return {
        ...current,
        protagonistPreviewKey: clearProtagonist ? null : current.protagonistPreviewKey,
        characterPreviewMeta: nextMeta
      }
    })
  }

  function setProtagonistPreviewKey(chapterId: string, characterKey: string | null): void {
    updatePreview(chapterId, (current) => {
      const nextMeta = { ...current.characterPreviewMeta }
      if (nextMeta) {
        for (const [key, meta] of Object.entries(nextMeta)) {
          if (key === characterKey) {
            nextMeta[key] = { ...meta, roleTier: 'protagonist' }
          } else if (meta.roleTier === 'protagonist') {
            nextMeta[key] = { ...meta, roleTier: 'supporting' }
          }
        }
      }
      return {
        ...current,
        protagonistPreviewKey: characterKey,
        characterPreviewMeta: nextMeta
      }
    })
  }

  function getCharacterPreviewMeta(chapterId: string): Record<string, CharacterPreviewMeta> {
    return previews.value[chapterId]?.characterPreviewMeta ?? {}
  }

  return {
    previews,
    editableRowsByChapter,
    recognizingChapterId,
    progressLabel,
    getPreview,
    getEditableRows,
    getCharacterRows,
    setCharacterRows,
    initEditableRows,
    clearEditableRows,
    setPreview,
    updatePreview,
    clearPreview,
    clearAll,
    setRecognizing,
    isRecognizing,
    reset,
    setCharacterRoleTier,
    setProtagonistPreviewKey,
    getCharacterPreviewMeta
  }
})
