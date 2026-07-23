<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NAlert,
  NButton,
  NInput,
  NModal,
  NRadio,
  NRadioGroup,
  NSpace,
  NText,
  useMessage
} from 'naive-ui'
import type { ImportParseResult, ParsedImportChapter } from '@novel-assistant/core'
import { useChapterStore } from '@/stores/chapter'

const props = defineProps<{
  show: boolean
  projectId: string
  currentChapterId: string | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  imported: [chapterIds: string[]]
}>()

const message = useMessage()
const chapterStore = useChapterStore()

const parsing = ref(false)
const importing = ref(false)
const parseResult = ref<ImportParseResult | null>(null)
const previewChapters = ref<ParsedImportChapter[]>([])
const importMode = ref<'create' | 'merge'>('create')

const canMerge = computed(() => Boolean(props.currentChapterId))

async function pickFile(): Promise<void> {
  parsing.value = true
  try {
    const result = await window.novelApi.import.pickAndParse()
    if (!result.success) {
      throw new Error(result.error ?? '解析文件失败')
    }
    if (!result.data) {
      return
    }
    parseResult.value = result.data
    previewChapters.value = result.data.chapters.map((chapter) => ({ ...chapter }))
    importMode.value = 'create'
  } catch (error) {
    message.error(error instanceof Error ? error.message : '解析文件失败')
  } finally {
    parsing.value = false
  }
}

function closeDialog(): void {
  emit('update:show', false)
  parseResult.value = null
  previewChapters.value = []
}

async function confirmImport(): Promise<void> {
  if (!previewChapters.value.length) {
    message.warning('没有可导入的章节')
    return
  }
  if (importMode.value === 'merge' && !props.currentChapterId) {
    message.warning('请先选择要合并到的章节')
    return
  }

  importing.value = true
  try {
    const chapters = await chapterStore.importChapters({
      chapters: previewChapters.value,
      mode: importMode.value,
      mergeChapterId: props.currentChapterId ?? undefined
    })
    message.success(
      importMode.value === 'merge'
        ? '已合并到当前章节'
        : `已导入 ${chapters.length} 个章节`
    )
    emit(
      'imported',
      chapters.map((chapter) => chapter.id)
    )
    closeDialog()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导入失败')
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="导入文稿"
    class="max-w-3xl"
    @update:show="emit('update:show', $event)"
  >
    <n-space vertical :size="16">
      <n-text depth="3">支持 .txt / .docx / 番茄导出（html/txt），单文件最大 10MB。</n-text>

      <n-button :loading="parsing" @click="pickFile">选择文件并解析</n-button>

      <n-alert v-if="parseResult?.warnings.length" type="warning" title="解析提示">
        {{ parseResult?.warnings.join('；') }}
      </n-alert>

      <template v-if="previewChapters.length > 0">
        <n-radio-group v-model:value="importMode">
          <n-space>
            <n-radio value="create">批量创建新章节</n-radio>
            <n-radio value="merge" :disabled="!canMerge">合并到当前章节</n-radio>
          </n-space>
        </n-radio-group>

        <div class="max-h-80 space-y-3 overflow-y-auto rounded-lg border border-slate-200 p-3">
          <div
            v-for="(chapter, index) in previewChapters"
            :key="index"
            class="rounded-lg border border-slate-100 bg-slate-50 p-3"
          >
            <n-input
              v-model:value="chapter.title"
              size="small"
              placeholder="章节标题"
              class="mb-2"
            />
            <n-text depth="3" class="line-clamp-3 text-xs whitespace-pre-wrap">
              {{ chapter.rawText || '（空正文）' }}
            </n-text>
          </div>
        </div>
      </template>
    </n-space>

    <template #footer>
      <n-space justify="end">
        <n-button @click="closeDialog">取消</n-button>
        <n-button
          type="primary"
          :disabled="previewChapters.length === 0"
          :loading="importing"
          @click="confirmImport"
        >
          确认导入
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
