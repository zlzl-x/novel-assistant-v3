import { useDialog, useMessage } from 'naive-ui'
import type { Chapter } from '@novel-assistant/core'
import { useChapterStore } from '@/stores/chapter'
import { usePreviewStore } from '@/stores/preview'

export function useChapterDelete(onAfterDelete?: (nextChapterId: string | null) => void) {
  const chapterStore = useChapterStore()
  const previewStore = usePreviewStore()
  const dialog = useDialog()
  const message = useMessage()

  function chapterLabel(chapter: Chapter): string {
    return chapter.title || `第${chapter.number}章`
  }

  function confirmDeleteChapter(chapter: Chapter): void {
    dialog.warning({
      title: '删除章节',
      content: `确定删除「${chapterLabel(chapter)}」？正文与识别预览将一并清除，此操作不可恢复。`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          const wasCurrent = chapterStore.currentChapterId === chapter.id
          await chapterStore.deleteChapter(chapter.id)
          previewStore.clearPreview(chapter.id)

          if (wasCurrent) {
            const fallback = chapterStore.sortedChapters[0]?.id ?? null
            chapterStore.setCurrentChapterId(fallback)
            onAfterDelete?.(fallback)
          }

          message.success('章节已删除')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败')
        }
      }
    })
  }

  function confirmDeleteChapterAndAfter(chapter: Chapter): void {
    const affectedIds = chapterStore.sortedChapters
      .filter((item) => item.number >= chapter.number)
      .map((item) => item.id)

    dialog.warning({
      title: '删除本章及之后所有章',
      content: `将删除「${chapterLabel(chapter)}」及之后共 ${affectedIds.length} 章。角色库不会自动回滚，请从该章重新识别提交。确定继续？`,
      positiveText: '删除',
      negativeText: '取消',
      onPositiveClick: async () => {
        try {
          const currentId = chapterStore.currentChapterId
          const currentNumber =
            chapterStore.sortedChapters.find((item) => item.id === currentId)?.number ?? 0
          const shouldNavigate = currentNumber >= chapter.number

          await chapterStore.deleteChapterAndAfter(chapter.id)
          for (const chapterId of affectedIds) {
            previewStore.clearPreview(chapterId)
          }

          if (shouldNavigate) {
            onAfterDelete?.(chapterStore.currentChapterId)
          }
          message.success('章节已删除')
        } catch (error) {
          message.error(error instanceof Error ? error.message : '删除失败')
        }
      }
    })
  }

  return {
    confirmDeleteChapter,
    confirmDeleteChapterAndAfter
  }
}
