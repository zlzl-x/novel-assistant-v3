<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { NButton, NModal, NRadio, NRadioGroup, NSelect, NSpace, NText, useMessage } from 'naive-ui'
import type { Character } from '@novel-assistant/core'
import { useCharacterStore } from '@/stores/character'
import { useGraphStore } from '@/stores/graph'
import { useProjectStore } from '@/stores/project'

const props = defineProps<{
  show: boolean
  character: Character | null
}>()

const emit = defineEmits<{
  'update:show': [value: boolean]
  merged: [characterId: string]
}>()

const characterStore = useCharacterStore()
const graphStore = useGraphStore()
const projectStore = useProjectStore()
const message = useMessage()

const targetCharacterId = ref<string | null>(null)
const keepName = ref<'current' | 'target'>('current')
const merging = ref(false)

const candidateOptions = computed(() =>
  characterStore.sortedCharacters
    .filter((item) => item.id !== props.character?.id)
    .map((item) => ({
      label: item.disambiguation ? `${item.name}（${item.disambiguation}）` : item.name,
      value: item.id
    }))
)

const targetCharacter = computed(
  () => characterStore.characters.find((item) => item.id === targetCharacterId.value) ?? null
)

const survivorName = computed(() => {
  if (!props.character || !targetCharacter.value) return ''
  return keepName.value === 'current' ? props.character.name : targetCharacter.value.name
})

const mergedAliasPreview = computed(() => {
  if (!props.character || !targetCharacter.value) return ''
  return keepName.value === 'current' ? targetCharacter.value.name : props.character.name
})

watch(
  () => props.show,
  (visible) => {
    if (!visible) return
    targetCharacterId.value = null
    keepName.value = 'current'
  }
)

function close(): void {
  emit('update:show', false)
}

async function confirmMerge(): Promise<void> {
  if (!props.character || !targetCharacterId.value || !targetCharacter.value) {
    message.warning('请选择要合并的角色')
    return false
  }

  const primaryId =
    keepName.value === 'current' ? props.character.id : targetCharacterId.value
  const secondaryId =
    keepName.value === 'current' ? targetCharacterId.value : props.character.id

  merging.value = true
  try {
    const merged = await characterStore.mergeCharacters(primaryId, secondaryId)
    if (
      projectStore.currentProject &&
      projectStore.currentProject.protagonistId === secondaryId
    ) {
      await projectStore.updateProject({
        id: projectStore.currentProject.id,
        protagonistId: merged.id
      })
    }
    graphStore.refresh()
    emit('merged', merged.id)
    message.success(`已合并为「${merged.name}」，「${mergedAliasPreview.value}」已加入别名`)
    close()
    return true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '合并失败')
    return false
  } finally {
    merging.value = false
  }
}
</script>

<template>
  <n-modal
    :show="show"
    preset="dialog"
    title="合并角色"
    positive-text="确认合并"
    negative-text="取消"
    :loading="merging"
    @update:show="emit('update:show', $event)"
    @positive-click="confirmMerge"
  >
    <n-space vertical :size="14">
      <n-text depth="3">
        将两个重复角色合并为一个。被合并方的名字会写入别名，后续识别会优先匹配到保留的角色。
      </n-text>

      <div>
        <div class="mb-2 text-sm font-medium text-slate-700">合并对象</div>
        <n-select
          v-model:value="targetCharacterId"
          :options="candidateOptions"
          placeholder="选择另一个重复角色，如「吴监事」"
          filterable
          clearable
        />
      </div>

      <div v-if="character && targetCharacter">
        <div class="mb-2 text-sm font-medium text-slate-700">保留名称</div>
        <n-radio-group v-model:value="keepName">
          <n-space vertical>
            <n-radio value="current">{{ character.name }}</n-radio>
            <n-radio value="target">{{ targetCharacter.name }}</n-radio>
          </n-space>
        </n-radio-group>
      </div>

      <div
        v-if="character && targetCharacter"
        class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-6 text-amber-900"
      >
        合并后保留「{{ survivorName }}」，并将「{{ mergedAliasPreview }}」写入别名；出场记录、关系与资料会合并到保留角色。
      </div>
    </n-space>
  </n-modal>
</template>
