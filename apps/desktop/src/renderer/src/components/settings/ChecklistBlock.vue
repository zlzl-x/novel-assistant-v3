<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NCheckbox, NInput, NSpace } from 'naive-ui'
import type { ChecklistPayload } from '@novel-assistant/core'
import { debounce } from '@/utils/debounce'

const props = defineProps<{
  modelValue: ChecklistPayload
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ChecklistPayload]
}>()

const localItems = ref([...props.modelValue.items])

watch(
  () => props.modelValue.items,
  (items) => {
    localItems.value = [...items]
  },
  { deep: true }
)

const emitUpdate = debounce(() => {
  emit('update:modelValue', { items: localItems.value.map((item) => ({ ...item })) })
}, 300)

function createItemId(): string {
  return crypto.randomUUID()
}

function addItem(): void {
  localItems.value = [
    ...localItems.value,
    { id: createItemId(), text: '', checked: false }
  ]
  emitUpdate()
}

function removeItem(itemId: string): void {
  localItems.value = localItems.value.filter((item) => item.id !== itemId)
  emitUpdate()
}

function updateItemText(itemId: string, text: string): void {
  localItems.value = localItems.value.map((item) =>
    item.id === itemId ? { ...item, text } : item
  )
  emitUpdate()
}

function toggleItem(itemId: string, checked: boolean): void {
  localItems.value = localItems.value.map((item) =>
    item.id === itemId ? { ...item, checked } : item
  )
  emitUpdate()
}
</script>

<template>
  <div class="space-y-2" @mousedown.stop>
    <div
      v-for="item in localItems"
      :key="item.id"
      class="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1"
    >
      <n-checkbox
        :checked="item.checked"
        @update:checked="(checked) => toggleItem(item.id, checked)"
      />
      <n-input
        :value="item.text"
        placeholder="清单项"
        class="flex-1"
        @update:value="(value) => updateItemText(item.id, value)"
      />
      <n-button quaternary size="small" @click="removeItem(item.id)">删除</n-button>
    </div>
    <n-space>
      <n-button size="small" @click="addItem">添加项</n-button>
    </n-space>
  </div>
</template>
