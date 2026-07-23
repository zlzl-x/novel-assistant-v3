<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { NInput } from 'naive-ui'
import AppIcon from '@/components/common/AppIcon.vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    value?: string
    placeholder?: string
    size?: 'tiny' | 'small' | 'medium' | 'large'
    clearable?: boolean
  }>(),
  {
    value: '',
    placeholder: '搜索',
    size: 'small',
    clearable: true
  }
)

const emit = defineEmits<{
  'update:value': [value: string]
}>()

const attrs = useAttrs()

const innerValue = computed({
  get: () => props.value,
  set: (value: string) => emit('update:value', value)
})
</script>

<template>
  <n-input
    v-bind="attrs"
    v-model:value="innerValue"
    :placeholder="placeholder"
    :size="size"
    :clearable="clearable"
  >
    <template #prefix>
      <AppIcon name="search" :size="15" class="text-slate-400" />
    </template>
  </n-input>
</template>
