<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NCollapseItem, NInput, NRadio, NRadioGroup, NSpace, NTag, NText } from 'naive-ui'
import {
  buildExistingDisplayRows,
  formatInfoLines,
  mergeInfoTextIntoPreviewRows,
  type Character,
  type CharacterPreviewMeta,
  type PreviewRoleTier,
  type PreviewRow
} from '@novel-assistant/core'
import { usePreviewStore } from '@/stores/preview'

const props = defineProps<{
  chapterId: string
  characterKey: string
  character?: Character | null
  displayName: string
  mentionCount: number
  meta?: CharacterPreviewMeta
  isProtagonist: boolean
}>()

const emit = defineEmits<{
  setProtagonist: [characterKey: string]
  setRoleTier: [characterKey: string, roleTier: PreviewRoleTier]
}>()

const previewStore = usePreviewStore()
const proposedText = ref('')

const existingLines = computed(() =>
  props.character ? buildExistingDisplayRows(props.character) : []
)

const existingText = computed(() => formatInfoLines(existingLines.value))

const rows = computed({
  get: () => previewStore.getCharacterRows(props.chapterId, props.characterKey),
  set: (value: PreviewRow[]) => {
    previewStore.setCharacterRows(props.chapterId, props.characterKey, value)
  }
})

const isPending = computed(() => props.meta?.isPending ?? false)

const roleTier = computed({
  get: () => props.meta?.roleTier ?? 'supporting',
  set: (value: PreviewRoleTier) => {
    emit('setRoleTier', props.characterKey, value)
  }
})

function syncRowsFromText(): void {
  rows.value = mergeInfoTextIntoPreviewRows(proposedText.value, rows.value)
}

watch(
  () => rows.value,
  () => {
    const next = formatInfoLines(rows.value.map((row) => ({ name: row.name, value: row.proposedValue })))
    if (next !== proposedText.value) {
      proposedText.value = next
    }
  },
  { immediate: true, deep: true }
)
</script>

<template>
  <n-collapse-item :name="characterKey">
    <template #header>
      <div class="flex w-full items-center justify-between gap-2 pr-2">
        <div class="flex min-w-0 items-center gap-2">
          <n-radio
            :checked="isProtagonist"
            @update:checked="() => emit('setProtagonist', characterKey)"
            @click.stop
          />
          <span class="truncate font-medium">{{ displayName }}</span>
          <n-tag v-if="isPending" size="small" type="info">未入库</n-tag>
          <n-tag v-if="isProtagonist" size="small" type="warning">主角</n-tag>
          <n-tag v-if="meta?.relationCount" size="small" :bordered="false" type="success">
            关系 {{ meta.relationCount }}
          </n-tag>
        </div>
        <n-tag size="small" :bordered="false">{{ mentionCount }} 次</n-tag>
      </div>
    </template>

    <section class="mb-3">
      <n-text depth="3" class="mb-1 block text-xs">定位</n-text>
      <n-radio-group v-model:value="roleTier" size="small">
        <n-space>
          <n-radio value="protagonist">主角</n-radio>
          <n-radio value="supporting">配角</n-radio>
          <n-radio value="extra">路人</n-radio>
        </n-space>
      </n-radio-group>
    </section>

    <div class="grid min-h-[120px] grid-cols-2 gap-2">
      <div class="flex min-w-0 flex-col rounded border border-slate-200 bg-slate-50/80">
        <div class="border-b border-slate-200 px-2 py-1 text-xs text-slate-500">已有</div>
        <pre class="min-h-[100px] flex-1 whitespace-pre-wrap break-words p-2 text-xs leading-relaxed text-slate-600">{{ existingText || '（空）' }}</pre>
      </div>
      <div class="flex min-w-0 flex-col rounded border border-blue-200 bg-blue-50/30">
        <div class="border-b border-blue-200 px-2 py-1 text-xs text-slate-500">识别</div>
        <n-input
          v-model:value="proposedText"
          type="textarea"
          class="flex-1"
          :autosize="{ minRows: 5, maxRows: 16 }"
          placeholder="本章识别到的字段会显示在这里"
          @update:value="syncRowsFromText"
        />
      </div>
    </div>
  </n-collapse-item>
</template>
