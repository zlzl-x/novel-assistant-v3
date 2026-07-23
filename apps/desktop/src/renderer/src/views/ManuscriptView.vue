<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import ChapterSidebar from '@/components/manuscript/ChapterSidebar.vue'
import ManuscriptEditor from '@/components/manuscript/ManuscriptEditor.vue'
import PreviewPanel from '@/components/manuscript/PreviewPanel.vue'
import { useChapterStore } from '@/stores/chapter'
import { usePreviewStore } from '@/stores/preview'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const chapterStore = useChapterStore()
const previewStore = usePreviewStore()

const projectId = () => String(route.params.id ?? '')

async function bootstrap(): Promise<void> {
  const id = projectId()
  if (!id) return

  try {
    await chapterStore.loadChapters(id)
    await syncRouteChapter()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载章节失败')
  }
}

async function syncRouteChapter(): Promise<void> {
  const id = projectId()
  const chapterIdParam = route.params.chapterId

  if (typeof chapterIdParam === 'string') {
    const exists = chapterStore.sortedChapters.some((chapter) => chapter.id === chapterIdParam)
    if (exists) {
      await selectChapter(chapterIdParam, false)
      return
    }
  }

  const latest = chapterStore.latestChapter
  if (latest) {
    await router.replace({
      name: 'manuscript-chapter',
      params: { id, chapterId: latest.id }
    })
    await selectChapter(latest.id, false)
  } else {
    chapterStore.setCurrentChapterId(null)
    previewStore.clearAll()
    if (route.name !== 'manuscript') {
      await router.replace({ name: 'manuscript', params: { id } })
    }
  }
}

async function handleChapterDeleted(nextChapterId: string | null): Promise<void> {
  if (nextChapterId) {
    await selectChapter(nextChapterId)
    return
  }
  previewStore.clearAll()
  await router.replace({ name: 'manuscript', params: { id: projectId() } })
}

async function selectChapter(chapterId: string, updateRoute = true): Promise<void> {
  try {
    await chapterStore.loadChapter(chapterId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '加载章节正文失败')
    return
  }

  chapterStore.setCurrentChapterId(chapterId)

  if (updateRoute) {
    await router.push({
      name: 'manuscript-chapter',
      params: { id: projectId(), chapterId }
    })
  }
}

onMounted(bootstrap)
watch(() => route.params.id, bootstrap)
watch(() => route.params.chapterId, (chapterId) => {
  if (typeof chapterId === 'string') {
    void selectChapter(chapterId, false)
  }
})
</script>

<template>
  <div class="relative flex h-full min-h-0">
    <ChapterSidebar
      :current-chapter-id="chapterStore.currentChapterId"
      @select="selectChapter"
      @deleted="handleChapterDeleted"
    />
    <ManuscriptEditor :chapter-id="chapterStore.currentChapterId" />
    <PreviewPanel :chapter-id="chapterStore.currentChapterId" />
  </div>
</template>
