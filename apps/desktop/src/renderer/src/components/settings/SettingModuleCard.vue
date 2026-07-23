<script setup lang="ts">
import { computed } from 'vue'
import { NButton, NInput, NPopconfirm } from 'naive-ui'
import type {
  ChecklistPayload,
  RichTextPayload,
  SettingModule,
  SettingModulePayload,
  TablePayload
} from '@novel-assistant/core'
import ChecklistBlock from './ChecklistBlock.vue'
import RichTextBlock from './RichTextBlock.vue'
import TableBlock from './TableBlock.vue'
import AppIcon from '@/components/common/AppIcon.vue'
import { settingModuleIconMap } from '@/constants/icons'
import type { IconName } from '@/constants/icons'

const props = defineProps<{
  module: SettingModule
  dragging?: boolean
  dragOver?: boolean
}>()

const emit = defineEmits<{
  'update:title': [title: string]
  'update:collapsed': [collapsed: boolean]
  'update:payload': [payload: SettingModulePayload]
  delete: []
  dragStart: [moduleId: string]
  dragOver: [moduleId: string]
  drop: [moduleId: string]
  dragEnd: []
}>()

const typeIcon = computed<IconName>(() => {
  const icon = settingModuleIconMap[props.module.type as keyof typeof settingModuleIconMap]
  return icon ?? settingModuleIconMap.default
})

function onPayloadUpdate(payload: SettingModulePayload): void {
  emit('update:payload', payload)
}

function onDragStart(event: DragEvent): void {
  event.dataTransfer?.setData('text/plain', props.module.id)
  event.dataTransfer!.effectAllowed = 'move'
  emit('dragStart', props.module.id)
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  emit('dragOver', props.module.id)
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  emit('drop', props.module.id)
}
</script>

<template>
  <article
    class="rounded-xl border bg-white shadow-sm transition"
    :class="[
      dragOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200',
      dragging ? 'opacity-60' : ''
    ]"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <header class="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
      <button
        type="button"
        class="cursor-grab px-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing"
        draggable="true"
        aria-label="拖拽排序"
        @dragstart="onDragStart"
        @dragend="emit('dragEnd')"
      >
        ≡
      </button>
      <span class="module-type-icon">
        <AppIcon :name="typeIcon" :size="18" />
      </span>
      <n-input
        :value="module.title"
        size="small"
        class="flex-1"
        @update:value="(value) => emit('update:title', value)"
      />
      <n-button quaternary size="small" @click="emit('update:collapsed', !module.collapsed)">
        {{ module.collapsed ? '展开' : '折叠' }}
      </n-button>
      <n-popconfirm @positive-click="emit('delete')">
        <template #trigger>
          <n-button quaternary size="small" type="error">删除</n-button>
        </template>
        确定删除该设定模块？此操作不可撤销。
      </n-popconfirm>
    </header>

    <div v-if="!module.collapsed" class="p-4">
      <rich-text-block
        v-if="module.type === 'richtext'"
        :model-value="module.payload as RichTextPayload"
        @update:model-value="onPayloadUpdate"
      />
      <checklist-block
        v-else-if="module.type === 'checklist'"
        :model-value="module.payload as ChecklistPayload"
        @update:model-value="onPayloadUpdate"
      />
      <table-block
        v-else-if="module.type === 'table'"
        :model-value="module.payload as TablePayload"
        @update:model-value="onPayloadUpdate"
      />
    </div>
  </article>
</template>
