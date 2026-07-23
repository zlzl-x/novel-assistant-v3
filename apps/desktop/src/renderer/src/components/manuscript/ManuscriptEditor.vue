<script setup lang="ts">
import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAlert, NButton, NInput, NTag, useMessage } from 'naive-ui'
import { countWords } from '@novel-assistant/core'
import AppIcon from '@/components/common/AppIcon.vue'
import ImportDialog from '@/components/manuscript/ImportDialog.vue'
import { useChapterDelete } from '@/composables/useChapterDelete'
import { useRecognition } from '@/composables/useRecognition'
import { useChapterStore } from '@/stores/chapter'
import { usePreviewStore } from '@/stores/preview'
import { debounce } from '@/utils/debounce'

const props = defineProps<{
  chapterId: string | null
}>()

const route = useRoute()
const router = useRouter()
const chapterStore = useChapterStore()
const previewStore = usePreviewStore()
const message = useMessage()
const { llmReady, refreshLlmStatus, recognizeChapter } = useRecognition()
const { confirmDeleteChapter } = useChapterDelete((nextChapterId) => {
  if (nextChapterId) {
    void router.push({
      name: 'manuscript-chapter',
      params: { id: projectId.value, chapterId: nextChapterId }
    })
    return
  }
  previewStore.clearAll()
  void router.replace({ name: 'manuscript', params: { id: projectId.value } })
})

const title = ref('')
const rawText = ref('')
const lastSavedAt = ref<string | null>(null)
const showImportDialog = ref(false)
const creatingChapter = ref(false)

const projectId = computed(() => String(route.params.id ?? ''))

const chapter = computed(() =>
  chapterStore.sortedChapters.find((item) => item.id === props.chapterId) ?? null
)

const wordCount = computed(() => countWords(rawText.value))

const isLatest = computed(() =>
  props.chapterId ? chapterStore.isLatestChapter(props.chapterId) : false
)

const recognizing = computed(() =>
  props.chapterId ? previewStore.isRecognizing(props.chapterId) : false
)

const recognizeLabel = computed(() =>
  recognizing.value ? previewStore.progressLabel || '识别中…' : '智能识别'
)

const debouncedSave = debounce(async () => {
  if (!props.chapterId) return
  try {
    await chapterStore.saveChapter({
      id: props.chapterId,
      title: title.value,
      rawText: rawText.value
    })
    lastSavedAt.value = new Date().toISOString()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '自动保存失败')
  }
}, 500)

function loadEditorContent(): void {
  if (!props.chapterId || !chapter.value) {
    title.value = ''
    rawText.value = ''
    lastSavedAt.value = null
    return
  }
  title.value = chapter.value.title
  rawText.value = chapterStore.getDraft(props.chapterId) ?? chapter.value.rawText
  lastSavedAt.value = chapter.value.updatedAt
}

async function saveNow(): Promise<void> {
  if (!props.chapterId) return
  try {
    const saved = await chapterStore.saveChapter({
      id: props.chapterId,
      title: title.value,
      rawText: rawText.value
    })
    lastSavedAt.value = saved.updatedAt
    message.success('已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  }
}

function onInput(): void {
  if (!props.chapterId) return
  chapterStore.setDraft(props.chapterId, rawText.value)
  debouncedSave()
}

function onTitleInput(): void {
  debouncedSave()
}

function onKeydown(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void saveNow()
  }
}

async function handleRecognizeClick(): Promise<void> {
  if (!props.chapterId) return
  const projectId = String(route.params.id ?? '')
  if (!projectId) return

  await recognizeChapter({
    chapterId: props.chapterId,
    projectId,
    rawText: rawText.value,
    onNeedSettings: () => router.push('/app-settings')
  })
}

async function createChapter(): Promise<void> {
  if (creatingChapter.value) return
  creatingChapter.value = true
  try {
    const chapter = await chapterStore.createChapter()
    chapterStore.setCurrentChapterId(chapter.id)
    await router.push({
      name: 'manuscript-chapter',
      params: { id: projectId.value, chapterId: chapter.id }
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建章节失败')
  } finally {
    creatingChapter.value = false
  }
}

async function handleImported(chapterIds: string[]): Promise<void> {
  const targetId = chapterIds[chapterIds.length - 1]
  if (!targetId) return
  await router.push({
    name: 'manuscript-chapter',
    params: { id: projectId.value, chapterId: targetId }
  })
  loadEditorContent()
}

watch(() => props.chapterId, loadEditorContent, { immediate: true })
watch(chapter, loadEditorContent)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  void refreshLlmStatus()
})
onActivated(() => {
  void refreshLlmStatus()
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="flex min-w-0 flex-1 flex-col bg-white">
    <div v-if="chapterId && !isLatest" class="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <n-alert type="warning" :bordered="false" title="此为历史章节，确认更新已禁用">
        仅最新章可提交识别结果到角色库。如需从此章重走流程，请删除后续章节后重新粘贴识别。
      </n-alert>
    </div>

    <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-1.5">
      <n-input
        v-model:value="title"
        :disabled="!chapterId"
        placeholder="章节标题"
        size="small"
        class="min-w-[8rem] max-w-xs flex-1"
        @update:value="onTitleInput"
      />
      <div class="ml-auto flex shrink-0 items-center gap-1.5">
        <n-tag size="small" :bordered="false" class="!text-[11px]">{{ wordCount }}字</n-tag>
        <n-tag
          v-if="lastSavedAt"
          size="small"
          :bordered="false"
          type="success"
          class="!text-[11px]"
        >
          {{ new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}
        </n-tag>
        <n-button size="tiny" quaternary :loading="creatingChapter" @click="createChapter">
          新建
        </n-button>
        <n-button size="tiny" quaternary @click="showImportDialog = true">导入</n-button>
        <n-button
          size="tiny"
          quaternary
          type="error"
          :disabled="!chapter || recognizing"
          title="删除本章"
          @click="chapter && confirmDeleteChapter(chapter)"
        >
          <span class="inline-flex items-center gap-1">
            <AppIcon name="trash" :size="13" />
            <span>删除</span>
          </span>
        </n-button>
        <n-button size="tiny" :disabled="!chapterId" :loading="chapterStore.saving" @click="saveNow">
          保存
        </n-button>
        <n-button
          size="small"
          type="primary"
          :disabled="!chapterId || recognizing"
          :loading="recognizing"
          @click="handleRecognizeClick"
        >
          {{ recognizeLabel }}
        </n-button>
      </div>
    </div>

    <div v-if="!chapterId" class="editor-empty">
      <div class="editor-empty-card">
        <h3 class="editor-empty-title">开始写作</h3>
        <p class="editor-empty-text">新建第一章，或直接导入 txt / docx 文稿。</p>
        <div class="editor-empty-actions">
          <n-button type="primary" size="large" :loading="creatingChapter" @click="createChapter">
            新建第一章
          </n-button>
          <n-button size="large" @click="showImportDialog = true">导入文稿</n-button>
        </div>
      </div>
    </div>

    <textarea
      v-else
      v-model="rawText"
      class="min-h-0 flex-1 resize-none border-0 bg-white p-4 font-serif text-base leading-7 text-slate-800 outline-none"
      placeholder="在此粘贴或输入正文…"
      @input="onInput"
    />

    <import-dialog
      v-model:show="showImportDialog"
      :project-id="projectId"
      :current-chapter-id="chapterId"
      @imported="handleImported"
    />
  </section>
</template>

<style scoped>
.editor-empty {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  background: #fcfcfd;
  padding: 2rem;
}

.editor-empty-card {
  max-width: 28rem;
  border: 1px dashed #cbd5e1;
  border-radius: 1.25rem;
  background: #ffffff;
  padding: 2.5rem 2rem;
  text-align: center;
}

.editor-empty-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
}

.editor-empty-text {
  margin: 0.75rem 0 0;
  font-size: 0.92rem;
  line-height: 1.7;
  color: #64748b;
}

.editor-empty-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
}
</style>
