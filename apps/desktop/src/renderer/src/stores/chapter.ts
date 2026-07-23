import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Chapter, ChapterMetadata } from '@novel-assistant/core'

export const useChapterStore = defineStore('chapter', () => {
  const chapters = ref<Chapter[]>([])
  const currentChapterId = ref<string | null>(null)
  const drafts = ref<Record<string, string>>({})
  const loading = ref(false)
  const saving = ref(false)
  const projectId = ref<string | null>(null)
  const loadedChapterIds = ref<Set<string>>(new Set())

  const sortedChapters = computed(() =>
    [...chapters.value].sort((a, b) => a.number - b.number)
  )

  const currentChapter = computed(
    () => chapters.value.find((chapter) => chapter.id === currentChapterId.value) ?? null
  )

  const latestChapter = computed(
    () => sortedChapters.value[sortedChapters.value.length - 1] ?? null
  )

  const maxNumber = computed(() =>
    chapters.value.reduce((max, chapter) => Math.max(max, chapter.number), 0)
  )

  function isLatestChapter(chapterId: string): boolean {
    const chapter = chapters.value.find((item) => item.id === chapterId)
    if (!chapter) return false
    return chapter.number === maxNumber.value
  }

  function metadataToChapter(metadata: ChapterMetadata): Chapter {
    const existing = chapters.value.find((chapter) => chapter.id === metadata.id)
    return {
      ...metadata,
      rawText: loadedChapterIds.value.has(metadata.id) ? (existing?.rawText ?? '') : ''
    }
  }

  function markChapterLoaded(chapterId: string): void {
    loadedChapterIds.value = new Set([...loadedChapterIds.value, chapterId])
  }

  async function loadChapters(nextProjectId: string): Promise<void> {
    projectId.value = nextProjectId
    loading.value = true
    try {
      const result = await window.novelApi.chapters.listMetadata(nextProjectId)
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '加载章节失败')
      }
      const chapterIds = new Set(result.data.map((chapter) => chapter.id))
      loadedChapterIds.value = new Set(
        [...loadedChapterIds.value].filter((chapterId) => chapterIds.has(chapterId))
      )
      chapters.value = result.data.map(metadataToChapter)
    } finally {
      loading.value = false
    }
  }

  async function loadChapter(chapterId: string, force = false): Promise<Chapter> {
    const existing = chapters.value.find((chapter) => chapter.id === chapterId)
    if (existing && loadedChapterIds.value.has(chapterId) && !force) {
      return existing
    }

    const result = await window.novelApi.chapters.get(chapterId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '加载章节正文失败')
    }

    const loaded = result.data
    chapters.value = chapters.value.some((chapter) => chapter.id === loaded.id)
      ? chapters.value.map((chapter) => (chapter.id === loaded.id ? loaded : chapter))
      : [...chapters.value, loaded].sort((a, b) => a.number - b.number)
    markChapterLoaded(loaded.id)
    return loaded
  }

  async function createChapter(title = ''): Promise<Chapter> {
    if (!projectId.value) throw new Error('未选择作品')
    const number = maxNumber.value + 1
    const result = await window.novelApi.chapters.save({
      projectId: projectId.value,
      number,
      title: title || `第${number}章`
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '创建章节失败')
    }
    markChapterLoaded(result.data.id)
    chapters.value = [...chapters.value, result.data].sort((a, b) => a.number - b.number)
    return result.data
  }

  async function insertAfterChapter(afterChapterId: string): Promise<Chapter> {
    if (!projectId.value) throw new Error('未选择作品')
    const result = await window.novelApi.chapters.insertAfter(projectId.value, afterChapterId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '插入章节失败')
    }
    await loadChapters(projectId.value)
    return result.data
  }

  async function saveChapter(input: {
    id: string
    title?: string
    rawText?: string
  }): Promise<Chapter> {
    const existing = chapters.value.find((chapter) => chapter.id === input.id)
    if (!existing || !projectId.value) {
      throw new Error('章节不存在')
    }

    saving.value = true
    try {
      const result = await window.novelApi.chapters.save({
        id: input.id,
        projectId: projectId.value,
        number: existing.number,
        title: input.title ?? existing.title,
        ...(input.rawText !== undefined ? { rawText: input.rawText } : {})
      })
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '保存章节失败')
      }
      const saved = result.data
      markChapterLoaded(saved.id)
      chapters.value = chapters.value.map((chapter) =>
        chapter.id === saved.id ? saved : chapter
      )
      clearDraft(input.id)
      return result.data
    } finally {
      saving.value = false
    }
  }

  async function renameChapter(chapterId: string, title: string): Promise<void> {
    await saveChapter({ id: chapterId, title })
  }

  async function deleteChapter(chapterId: string): Promise<void> {
    const result = await window.novelApi.chapters.delete(chapterId)
    if (!result.success) {
      throw new Error(result.error ?? '删除章节失败')
    }
    chapters.value = chapters.value.filter((chapter) => chapter.id !== chapterId)
    loadedChapterIds.value = new Set(
      [...loadedChapterIds.value].filter((loadedChapterId) => loadedChapterId !== chapterId)
    )
    clearDraft(chapterId)
    if (currentChapterId.value === chapterId) {
      currentChapterId.value = sortedChapters.value[0]?.id ?? null
    }
  }

  async function deleteChapterAndAfter(chapterId: string): Promise<void> {
    const chapter = chapters.value.find((item) => item.id === chapterId)
    if (!chapter || !projectId.value) throw new Error('章节不存在')

    const result = await window.novelApi.chapters.deleteAfter(
      projectId.value,
      chapter.number - 1
    )
    if (!result.success) {
      throw new Error(result.error ?? '删除后续章节失败')
    }

    await loadChapters(projectId.value)
    currentChapterId.value = sortedChapters.value[sortedChapters.value.length - 1]?.id ?? null
  }

  async function reorderChapters(orderedChapterIds: string[]): Promise<void> {
    if (!projectId.value) throw new Error('未选择作品')
    const result = await window.novelApi.chapters.reorder({
      projectId: projectId.value,
      orderedChapterIds
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '排序失败')
    }
    chapters.value = result.data
    loadedChapterIds.value = new Set(result.data.map((chapter) => chapter.id))
  }

  async function importChapters(input: {
    chapters: Array<{ title: string; rawText: string }>
    mode: 'create' | 'merge'
    mergeChapterId?: string
  }): Promise<Chapter[]> {
    if (!projectId.value) throw new Error('未选择作品')
    const result = await window.novelApi.import.importChapters({
      projectId: projectId.value,
      chapters: input.chapters,
      mode: input.mode,
      mergeChapterId: input.mergeChapterId
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '导入章节失败')
    }
    if (input.mode === 'create') {
      loadedChapterIds.value = new Set([
        ...loadedChapterIds.value,
        ...result.data.map((chapter) => chapter.id)
      ])
      chapters.value = [...chapters.value, ...result.data].sort((a, b) => a.number - b.number)
    } else {
      const updated = result.data[0]
      if (updated) {
        chapters.value = chapters.value.map((chapter) =>
          chapter.id === updated.id ? updated : chapter
        )
        markChapterLoaded(updated.id)
        clearDraft(updated.id)
      }
    }
    return result.data
  }

  function setCurrentChapterId(chapterId: string | null): void {
    currentChapterId.value = chapterId
  }

  function setDraft(chapterId: string, content: string): void {
    drafts.value = { ...drafts.value, [chapterId]: content }
  }

  function getDraft(chapterId: string): string | undefined {
    return drafts.value[chapterId]
  }

  function clearDraft(chapterId: string): void {
    drafts.value = Object.fromEntries(
      Object.entries(drafts.value).filter(([draftChapterId]) => draftChapterId !== chapterId)
    )
  }

  function reset(): void {
    chapters.value = []
    currentChapterId.value = null
    drafts.value = {}
    projectId.value = null
    loadedChapterIds.value = new Set()
  }

  return {
    chapters,
    sortedChapters,
    currentChapterId,
    currentChapter,
    latestChapter,
    maxNumber,
    drafts,
    loading,
    saving,
    projectId,
    isLatestChapter,
    loadChapters,
    loadChapter,
    createChapter,
    insertAfterChapter,
    saveChapter,
    renameChapter,
    deleteChapter,
    deleteChapterAndAfter,
    reorderChapters,
    importChapters,
    setCurrentChapterId,
    setDraft,
    getDraft,
    clearDraft,
    reset
  }
})
