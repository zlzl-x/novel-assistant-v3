<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMessage } from 'naive-ui'
import {
  NButton,
  NEmpty,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NText
} from 'naive-ui'
import type { RecognitionDebugEntry } from '@novel-assistant/core'

const props = defineProps<{
  show: boolean
  logs: RecognitionDebugEntry[]
}>()

const emit = defineEmits<{
  close: []
}>()

const message = useMessage()
const selectedId = ref<string | null>(null)

const options = computed(() =>
  props.logs.map((entry, index) => ({
    label: `${index + 1}. ${entry.label}${entry.characterName ? `（${entry.characterName}）` : ''}`,
    value: entry.id
  }))
)

const selectedEntry = computed(() =>
  props.logs.find((entry) => entry.id === selectedId.value) ?? null
)

const formattedPayload = computed(() => {
  if (!selectedEntry.value) return ''
  const payload = selectedEntry.value.payload
  if (typeof payload === 'string') return payload
  try {
    return JSON.stringify(payload, null, 2)
  } catch {
    return String(payload)
  }
})

watch(
  () => [props.show, props.logs] as const,
  ([visible, logs]) => {
    if (!visible) return
    selectedId.value = logs.at(-1)?.id ?? null
  },
  { immediate: true }
)

async function copyPayload(): Promise<void> {
  if (!formattedPayload.value) return
  try {
    await navigator.clipboard.writeText(formattedPayload.value)
    message.success('已复制到剪贴板')
  } catch {
    message.error('复制失败')
  }
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="识别日志"
    class="w-[min(960px,92vw)]"
    @update:show="(value) => !value && emit('close')"
  >
    <p class="mb-3 text-sm text-slate-600">
      查看 Step 1/2 的关键输出，便于排查误识别或字段丢失。
    </p>

    <n-empty v-if="logs.length === 0" description="暂无识别日志，请先执行智能识别" />

    <template v-else>
        <n-select
        v-model:value="selectedId"
        :options="options"
        placeholder="选择日志条目（step2-error 为失败原因）"
        class="mb-3"
      />

      <div v-if="selectedEntry" class="mb-2 flex items-center justify-between gap-2">
        <n-text depth="3" class="text-xs">
          {{ selectedEntry.timestamp }} · {{ selectedEntry.stage }}
        </n-text>
        <n-button size="tiny" @click="copyPayload">复制内容</n-button>
      </div>

      <n-input
        type="textarea"
        :value="formattedPayload"
        readonly
        :autosize="{ minRows: 16, maxRows: 28 }"
        class="font-mono text-xs"
      />
    </template>

    <template #footer>
      <n-space justify="end">
        <n-button @click="emit('close')">关闭</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
