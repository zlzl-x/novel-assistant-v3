<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NInput, NSelect, NSpace } from 'naive-ui'
import type { TableColumn, TablePayload } from '@novel-assistant/core'
import { debounce } from '@/utils/debounce'

const props = defineProps<{
  modelValue: TablePayload
}>()

const emit = defineEmits<{
  'update:modelValue': [value: TablePayload]
}>()

const localColumns = ref<TableColumn[]>([...props.modelValue.columns])
const localRows = ref<Record<string, string | number>[]>(
  props.modelValue.rows.map((row) => ({ ...row }))
)

watch(
  () => props.modelValue,
  (value) => {
    localColumns.value = [...value.columns]
    localRows.value = value.rows.map((row) => ({ ...row }))
  },
  { deep: true }
)

const columnTypeOptions = [
  { label: '文本', value: 'text' },
  { label: '数字', value: 'number' },
  { label: '单选', value: 'select' }
]

const emitUpdate = debounce(() => {
  emit('update:modelValue', {
    columns: localColumns.value.map((column) => ({ ...column })),
    rows: localRows.value.map((row) => ({ ...row }))
  })
}, 300)

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function addColumn(): void {
  const column: TableColumn = {
    id: createId('col'),
    name: `列 ${localColumns.value.length + 1}`,
    type: 'text'
  }
  localColumns.value = [...localColumns.value, column]
  localRows.value = localRows.value.map((row) => ({ ...row, [column.id]: '' }))
  emitUpdate()
}

function removeColumn(columnId: string): void {
  if (localColumns.value.length <= 1) return
  localColumns.value = localColumns.value.filter((column) => column.id !== columnId)
  localRows.value = localRows.value.map((row) => {
    const next = { ...row }
    delete next[columnId]
    return next
  })
  emitUpdate()
}

function updateColumnName(columnId: string, name: string): void {
  localColumns.value = localColumns.value.map((column) =>
    column.id === columnId ? { ...column, name } : column
  )
  emitUpdate()
}

function updateColumnType(columnId: string, type: TableColumn['type']): void {
  localColumns.value = localColumns.value.map((column) =>
    column.id === columnId ? { ...column, type } : column
  )
  emitUpdate()
}

function addRow(): void {
  const row: Record<string, string | number> = {}
  for (const column of localColumns.value) {
    row[column.id] = column.type === 'number' ? 0 : ''
  }
  localRows.value = [...localRows.value, row]
  emitUpdate()
}

function removeRow(rowIndex: number): void {
  localRows.value = localRows.value.filter((_, index) => index !== rowIndex)
  emitUpdate()
}

function updateCell(rowIndex: number, columnId: string, value: string): void {
  const column = localColumns.value.find((entry) => entry.id === columnId)
  const parsed =
    column?.type === 'number' ? (value === '' ? 0 : Number(value)) : value
  localRows.value = localRows.value.map((row, index) =>
    index === rowIndex ? { ...row, [columnId]: parsed } : row
  )
  emitUpdate()
}
</script>

<template>
  <div class="space-y-3 overflow-x-auto" @mousedown.stop>
    <div class="min-w-[640px]">
      <div class="grid gap-2" :style="{ gridTemplateColumns: `repeat(${localColumns.length}, minmax(120px, 1fr)) auto` }">
        <div
          v-for="column in localColumns"
          :key="column.id"
          class="space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-2"
        >
          <n-input
            :value="column.name"
            size="small"
            placeholder="列名"
            @update:value="(value) => updateColumnName(column.id, value)"
          />
          <n-select
            :value="column.type"
            size="small"
            :options="columnTypeOptions"
            @update:value="(value) => updateColumnType(column.id, value)"
          />
          <n-button
            quaternary
            size="tiny"
            :disabled="localColumns.length <= 1"
            @click="removeColumn(column.id)"
          >
            删除列
          </n-button>
        </div>
        <div class="flex items-start">
          <n-button size="small" @click="addColumn">添加列</n-button>
        </div>
      </div>

      <div
        v-for="(row, rowIndex) in localRows"
        :key="rowIndex"
        class="mt-2 grid gap-2"
        :style="{ gridTemplateColumns: `repeat(${localColumns.length}, minmax(120px, 1fr)) auto` }"
      >
        <n-input
          v-for="column in localColumns"
          :key="`${rowIndex}-${column.id}`"
          :value="String(row[column.id] ?? '')"
          size="small"
          :placeholder="column.name"
          @update:value="(value) => updateCell(rowIndex, column.id, value)"
        />
        <n-button quaternary size="small" @click="removeRow(rowIndex)">删除行</n-button>
      </div>
    </div>

    <n-space>
      <n-button size="small" @click="addRow">添加行</n-button>
    </n-space>
  </div>
</template>
