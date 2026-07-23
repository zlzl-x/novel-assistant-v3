<script setup lang="ts">
import { ref, watch } from 'vue'
import { NInput } from 'naive-ui'
import type { RichTextPayload } from '@novel-assistant/core'
import { debounce } from '@/utils/debounce'

const props = defineProps<{
  modelValue: RichTextPayload
}>()

const emit = defineEmits<{
  'update:modelValue': [value: RichTextPayload]
}>()

const localContent = ref(props.modelValue.content)

watch(
  () => props.modelValue.content,
  (value) => {
    if (value !== localContent.value) {
      localContent.value = value
    }
  }
)

const emitUpdate = debounce(() => {
  emit('update:modelValue', { content: localContent.value })
}, 400)

function onInput(value: string): void {
  localContent.value = value
  emitUpdate()
}
</script>

<template>
  <n-input
    :value="localContent"
    type="textarea"
    :autosize="{ minRows: 8, maxRows: 24 }"
    placeholder="支持 Markdown 格式"
    @update:value="onInput"
    @mousedown.stop
  />
</template>
