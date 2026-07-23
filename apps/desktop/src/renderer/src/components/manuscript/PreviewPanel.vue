<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NCollapse,
  NInput,
  NSpace,
  NTag,
  NText,
  NTooltip,
  useMessage
} from 'naive-ui'
import {
  getAmbiguityBySurfaceForm,
  isPendingCharacterKey,
  isPreviewReady,
  pendingCharacterNameFromKey,
  type AmbiguousName,
  type PreviewRoleTier
} from '@novel-assistant/core'
import AmbiguityResolverModal from '@/components/manuscript/AmbiguityResolverModal.vue'
import CharacterPreviewCard from '@/components/manuscript/CharacterPreviewCard.vue'
import RecognitionDebugModal from '@/components/manuscript/RecognitionDebugModal.vue'
import { useRecognition } from '@/composables/useRecognition'
import { useAppStore } from '@/stores/app'
import { useChapterStore } from '@/stores/chapter'
import { useCharacterStore } from '@/stores/character'
import { usePreviewStore } from '@/stores/preview'
import { useRecognitionDebugStore } from '@/stores/recognitionDebug'

const props = withDefaults(
  defineProps<{
    chapterId?: string | null
    minWidth?: number
    maxWidth?: number
    defaultWidth?: number
  }>(),
  {
    chapterId: null,
    minWidth: 400,
    maxWidth: 720,
    defaultWidth: 560
  }
)

const route = useRoute()
const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const chapterStore = useChapterStore()
const characterStore = useCharacterStore()
const previewStore = usePreviewStore()
const recognitionDebugStore = useRecognitionDebugStore()
const {
  recognizeChapter,
  runStep2ForPreview,
  resolveAmbiguityForPreview,
  commitPreview,
  dismissPreview
} = useRecognition()

const width = ref(props.defaultWidth)
const resizing = ref(false)
const committing = ref(false)
const activeAmbiguous = ref<AmbiguousName | null>(null)
const showDebugLog = ref(false)

const projectId = computed(() => String(route.params.id ?? ''))
const preview = computed(() =>
  props.chapterId ? previewStore.getPreview(props.chapterId) : undefined
)
const recognizing = computed(() =>
  props.chapterId ? previewStore.isRecognizing(props.chapterId) : false
)
const isLatestChapter = computed(() =>
  props.chapterId ? chapterStore.isLatestChapter(props.chapterId) : false
)
const previewReady = computed(() => (preview.value ? isPreviewReady(preview.value) : false))

const characterPreviewKeys = computed(() =>
  Object.keys(preview.value?.characterPreviewMeta ?? {})
)

const expandedNames = computed(() => {
  if (!props.chapterId) return []
  const editableRows = previewStore.getEditableRows(props.chapterId)
  return characterPreviewKeys.value
    .filter((characterKey) => {
      const meta = preview.value?.characterPreviewMeta?.[characterKey]
      const rows = editableRows[characterKey] ?? []
      return Boolean(meta?.isPending) || rows.some((row) => row.changed)
    })
    .slice(0, 3)
})

const recognizeLabel = computed(() =>
  recognizing.value ? previewStore.progressLabel || 'Step 1/2 正在分析正文…' : '智能识别'
)

const checkedCount = computed(() => {
  if (!props.chapterId) return 0
  return Object.values(previewStore.getEditableRows(props.chapterId))
    .flat()
    .filter((row) => row.checked).length
})

const protagonistKey = computed(() => preview.value?.protagonistPreviewKey ?? null)

const step2Failures = computed(() => preview.value?.step2Failures ?? [])

const recognitionLogs = computed(() =>
  props.chapterId ? recognitionDebugStore.getLogs(props.chapterId) : []
)

function characterByKey(key: string) {
  if (isPendingCharacterKey(key)) return null
  return characterStore.characters.find((item) => item.id === key) ?? null
}

function displayNameForKey(key: string): string {
  const meta = preview.value?.characterPreviewMeta?.[key]
  if (meta?.name) return meta.name
  if (isPendingCharacterKey(key)) return pendingCharacterNameFromKey(key)
  return characterByKey(key)?.name ?? key
}

function mentionCountForKey(key: string): number {
  return preview.value?.characterPreviewMeta?.[key]?.mentionCount ?? 0
}

function setProtagonist(characterKey: string): void {
  if (!props.chapterId) return
  previewStore.setProtagonistPreviewKey(props.chapterId, characterKey)
}

function setRoleTier(characterKey: string, roleTier: PreviewRoleTier): void {
  if (!props.chapterId) return
  previewStore.setCharacterRoleTier(props.chapterId, characterKey, roleTier)
}

async function handleRecognizeClick(): Promise<void> {
  if (!props.chapterId) return
  const chapter = chapterStore.currentChapter
  if (!projectId.value || !chapter) return

  await recognizeChapter({
    chapterId: props.chapterId,
    projectId: projectId.value,
    rawText: chapterStore.getDraft(props.chapterId) ?? chapter.rawText,
    onNeedSettings: () => router.push('/app-settings')
  })
}

async function handleCommit(): Promise<void> {
  if (!props.chapterId || !projectId.value) return
  committing.value = true
  try {
    await commitPreview({ chapterId: props.chapterId, projectId: projectId.value })
  } catch (error) {
    window.console.error(error)
    message.error(error instanceof Error ? error.message : '提交失败')
  } finally {
    committing.value = false
  }
}

function openAmbiguity(surfaceForm: string): void {
  if (!preview.value) return
  activeAmbiguous.value = getAmbiguityBySurfaceForm(preview.value.step1, surfaceForm) ?? null
}

async function handleResolveExisting(characterId: string, characterName: string): Promise<void> {
  if (!props.chapterId || !activeAmbiguous.value) return
  await resolveAmbiguityForPreview({
    chapterId: props.chapterId,
    surfaceForm: activeAmbiguous.value.surfaceForm,
    resolution: { type: 'existing', characterId, characterName }
  })
  activeAmbiguous.value = null
}

async function handleResolveSkip(): Promise<void> {
  if (!props.chapterId || !activeAmbiguous.value) return
  await resolveAmbiguityForPreview({
    chapterId: props.chapterId,
    surfaceForm: activeAmbiguous.value.surfaceForm,
    resolution: { type: 'skip' }
  })
  activeAmbiguous.value = null
}

async function handleResolveCreate(disambiguation: string): Promise<void> {
  if (!props.chapterId || !activeAmbiguous.value || !projectId.value) return
  const surfaceForm = activeAmbiguous.value.surfaceForm
  const created = await characterStore.createCharacter({
    projectId: projectId.value,
    name: surfaceForm,
    disambiguation
  })
  await resolveAmbiguityForPreview({
    chapterId: props.chapterId,
    surfaceForm,
    resolution: { type: 'existing', characterId: created.id, characterName: created.name }
  })
  activeAmbiguous.value = null
}

function onMouseMove(event: MouseEvent): void {
  if (!resizing.value) return
  const next = window.innerWidth - event.clientX
  width.value = Math.min(props.maxWidth, Math.max(props.minWidth, next))
}

function stopResize(): void {
  resizing.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', stopResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup', stopResize)
})
</script>

<template>
  <aside
    v-if="!appStore.previewCollapsed || !appStore.isNarrowLayout"
    class="relative flex shrink-0 flex-col border-l border-slate-200 bg-slate-50"
    :style="{ width: `${width}px` }"
  >
    <div
      class="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-blue-200"
      @mousedown="resizing = true"
    />

    <div class="flex items-center justify-between border-b border-slate-200 px-3 py-2">
      <n-text strong class="text-sm">识别预览</n-text>
      <n-space :size="4">
        <n-button
          v-if="preview || recognitionLogs.length"
          quaternary
          size="tiny"
          @click="showDebugLog = true"
        >
          识别日志
        </n-button>
        <n-button
          v-if="appStore.isCompactPreview"
          quaternary
          size="tiny"
          @click="appStore.togglePreview()"
        >
          折叠
        </n-button>
      </n-space>
    </div>

    <div
      v-if="!preview && !recognizing"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-4 text-center text-sm text-slate-400"
    >
      <p>粘贴正文后点击智能识别</p>
      <n-button size="small" :disabled="!chapterId" @click="handleRecognizeClick">智能识别</n-button>
      <p class="text-xs">识别后可勾选主角、调整配角/路人，并确认字段入库</p>
    </div>

    <div
      v-else-if="recognizing"
      class="flex flex-1 items-center justify-center p-4 text-sm text-slate-500"
    >
      {{ recognizeLabel }}
    </div>

    <div v-else-if="preview" class="flex min-h-0 flex-1 flex-col">
      <div class="min-h-0 flex-1 overflow-y-auto p-3 text-sm">
        <div class="mb-3 flex flex-wrap gap-2">
          <n-tag size="small" type="success">Step 1 ✓</n-tag>
          <n-tag v-if="preview.step2" size="small" type="success">Step 2 ✓</n-tag>
          <n-tag v-else-if="!preview.blocked" size="small">Step 2 可选</n-tag>
        </div>

        <n-alert
          v-if="preview.blocked"
          type="warning"
          class="mb-3"
          title="存在同名歧义"
          :bordered="false"
        >
          请先裁决歧义角色，再继续合并。
        </n-alert>

        <n-alert
          v-if="step2Failures.length"
          type="warning"
          class="mb-3"
          title="Step 2 部分角色合并失败"
          :bordered="false"
        >
          <ul class="list-disc pl-4 text-xs">
            <li v-for="failure in step2Failures" :key="failure.characterId">
              {{ failure.characterName }}：{{ failure.error }}
            </li>
          </ul>
          <n-button class="mt-2" size="tiny" @click="showDebugLog = true">查看识别日志</n-button>
        </n-alert>

        <n-alert
          v-if="!isLatestChapter"
          type="info"
          class="mb-3"
          title="非最新章"
          :bordered="false"
        >
          仅最新章可更新角色库。请删除后续章节后重新识别。
        </n-alert>

        <section v-if="preview.step1.ambiguousNames.length" class="mb-4">
          <n-text strong>歧义裁决</n-text>
          <div
            v-for="item in preview.step1.ambiguousNames"
            :key="item.surfaceForm"
            class="mt-2 flex items-center justify-between rounded border border-amber-200 bg-amber-50 p-2 text-xs"
          >
            <span>{{ item.surfaceForm }}（{{ item.candidateCharacterIds.length }} 个候选）</span>
            <n-button size="tiny" @click="openAmbiguity(item.surfaceForm)">裁决</n-button>
          </div>
        </section>

        <section v-if="characterPreviewKeys.length" class="mb-4">
          <div class="mb-2 flex items-center justify-between">
            <n-text strong>角色信息</n-text>
            <n-text depth="3" class="text-xs">左侧圆点选主角</n-text>
          </div>
          <n-collapse class="mt-2" :default-expanded-names="expandedNames">
            <character-preview-card
              v-for="characterKey in characterPreviewKeys"
              :key="characterKey"
              :chapter-id="chapterId!"
              :character-key="characterKey"
              :character="characterByKey(characterKey)"
              :display-name="displayNameForKey(characterKey)"
              :mention-count="mentionCountForKey(characterKey)"
              :meta="preview.characterPreviewMeta?.[characterKey]"
              :is-protagonist="protagonistKey === characterKey"
              @set-protagonist="setProtagonist"
              @set-role-tier="setRoleTier"
            />
          </n-collapse>
        </section>

        <p v-else class="mb-4 text-xs text-slate-400">
          未从正文中识别到角色信息，请检查正文或重新识别
        </p>

        <n-space vertical class="w-full">
          <n-button
            v-if="preview && !preview.step2 && !preview.blocked && chapterId"
            block
            size="small"
            :loading="recognizing"
            @click="runStep2ForPreview(chapterId!)"
          >
            与角色库合并（Step 2，可选）
          </n-button>
          <n-button block size="small" :loading="recognizing" @click="handleRecognizeClick">
            重新识别
          </n-button>
        </n-space>
      </div>

      <div
        v-if="previewReady"
        class="border-t border-slate-200 bg-white p-3"
      >
        <n-space vertical class="w-full">
          <n-tooltip :disabled="isLatestChapter && (checkedCount > 0 || characterPreviewKeys.length > 0)">
            <template #trigger>
              <n-button
                block
                type="primary"
                :loading="committing"
                :disabled="
                  !isLatestChapter ||
                  (checkedCount === 0 && characterPreviewKeys.length === 0) ||
                  preview.step1.ambiguousNames.length > 0
                "
                @click="handleCommit"
              >
                确认更新角色库
              </n-button>
            </template>
            <span v-if="!isLatestChapter">仅最新章可提交</span>
            <span v-else-if="checkedCount === 0 && characterPreviewKeys.length === 0">无可提交内容</span>
            <span v-else-if="preview.step1.ambiguousNames.length > 0">请先裁决歧义</span>
          </n-tooltip>
          <n-button block quaternary @click="chapterId && dismissPreview(chapterId)">
            全部忽略
          </n-button>
        </n-space>
      </div>
    </div>

    <ambiguity-resolver-modal
      :show="Boolean(activeAmbiguous)"
      :ambiguous="activeAmbiguous"
      :characters="characterStore.characters"
      @close="activeAmbiguous = null"
      @resolve-existing="handleResolveExisting"
      @resolve-skip="handleResolveSkip"
      @resolve-create="handleResolveCreate"
    />

    <recognition-debug-modal
      :show="showDebugLog"
      :logs="recognitionLogs"
      @close="showDebugLog = false"
    />
  </aside>

  <n-button
    v-else
    class="absolute bottom-4 right-4 z-10 shadow"
    type="primary"
    secondary
    @click="appStore.togglePreview()"
  >
    展开预览
  </n-button>
</template>
