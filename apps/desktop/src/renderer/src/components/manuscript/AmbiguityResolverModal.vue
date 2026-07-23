<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NButton,
  NCard,
  NInput,
  NModal,
  NSpace,
  NText
} from 'naive-ui'
import type { AmbiguousName, Character } from '@novel-assistant/core'

const props = defineProps<{
  show: boolean
  ambiguous: AmbiguousName | null
  characters: Character[]
}>()

const emit = defineEmits<{
  close: []
  resolveExisting: [characterId: string, characterName: string]
  resolveSkip: []
  resolveCreate: [disambiguation: string]
}>()

const disambiguation = ref('')

watch(
  () => props.show,
  (visible) => {
    if (visible) disambiguation.value = ''
  }
)

const candidates = computed(() =>
  (props.ambiguous?.candidateCharacterIds ?? [])
    .map((id) => props.characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character))
)

function formatLastAppearance(character: Character): string {
  if (!character.lastAppearance) return '无出场记录'
  return `第${character.lastAppearance.chapterNumber}章`
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="同名裁决"
    class="max-w-lg"
    @update:show="(value) => !value && emit('close')"
  >
    <template v-if="ambiguous">
      <p class="mb-3 text-sm text-slate-600">
        「{{ ambiguous.surfaceForm }}」匹配到多个角色，请选择对应角色或新建。
      </p>
      <p class="mb-4 rounded bg-slate-50 p-2 text-xs text-slate-500">「{{ ambiguous.excerpt }}」</p>

      <n-space vertical class="w-full">
        <n-card
          v-for="character in candidates"
          :key="character.id"
          size="small"
          hoverable
          class="cursor-pointer"
          @click="emit('resolveExisting', character.id, character.name)"
        >
          <div class="font-medium">{{ character.name }}</div>
          <div class="mt-1 text-xs text-slate-500">
            {{ character.disambiguation || '无区分标识' }} · {{ character.realm.current || '境界未知' }} ·
            {{ formatLastAppearance(character) }}
          </div>
        </n-card>

        <div class="rounded border border-dashed border-slate-200 p-3">
          <n-text class="mb-2 block text-sm">新建角色</n-text>
          <n-input
            v-model:value="disambiguation"
            size="small"
            placeholder="区分标识（同名必填）"
          />
          <n-button
            class="mt-2"
            size="small"
            type="primary"
            :disabled="!disambiguation.trim()"
            @click="emit('resolveCreate', disambiguation.trim())"
          >
            创建并关联
          </n-button>
        </div>

        <n-button quaternary @click="emit('resolveSkip')">跳过此指称</n-button>
      </n-space>
    </template>
  </n-modal>
</template>
