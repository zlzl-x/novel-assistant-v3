<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  NButton,
  NForm,
  NFormItem,
  NInput,
  NModal,
  NSelect,
  useMessage
} from 'naive-ui'
import type { CharacterRole } from '@novel-assistant/core'
import { useCharacterStore } from '@/stores/character'

const props = defineProps<{
  show: boolean
  projectId: string
}>()

const emit = defineEmits<{
  close: []
  created: [characterId: string]
}>()

const characterStore = useCharacterStore()
const message = useMessage()
const saving = ref(false)

const form = ref({
  name: '',
  disambiguation: '',
  role: 'mentioned' as CharacterRole
})

const roleOptions = [
  { label: '主角', value: 'protagonist' },
  { label: '重要配角', value: 'major' },
  { label: '次要角色', value: 'minor' },
  { label: '仅提及', value: 'mentioned' }
]

const hasNameConflict = computed(() => {
  const name = form.value.name.trim()
  if (!name) return false
  return characterStore.characters.some((character) => character.name === name)
})

async function handleCreate(): Promise<void> {
  if (!form.value.name.trim()) {
    message.warning('角色名不能为空')
    return
  }
  if (hasNameConflict.value && !form.value.disambiguation.trim()) {
    message.warning('已存在同名角色，请填写区分标识')
    return
  }

  saving.value = true
  try {
    const created = await characterStore.createCharacter({
      projectId: props.projectId,
      name: form.value.name.trim(),
      disambiguation: form.value.disambiguation.trim() || undefined,
      role: form.value.role
    })
    message.success(`已创建角色「${created.name}」`)
    emit('created', created.id)
    emit('close')
    form.value = { name: '', disambiguation: '', role: 'mentioned' }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    title="新建角色"
    class="max-w-md"
    @update:show="(value) => !value && emit('close')"
  >
    <n-form label-placement="top" size="small">
      <n-form-item label="角色名" required>
        <n-input v-model:value="form.name" placeholder="必填" />
      </n-form-item>
      <n-form-item label="区分标识" :required="hasNameConflict">
        <n-input
          v-model:value="form.disambiguation"
          :placeholder="hasNameConflict ? '同名必填' : '可选'"
        />
      </n-form-item>
      <n-form-item label="角色类型">
        <n-select v-model:value="form.role" :options="roleOptions" />
      </n-form-item>
    </n-form>
    <template #footer>
      <n-button quaternary @click="emit('close')">取消</n-button>
      <n-button type="primary" :loading="saving" @click="handleCreate">创建</n-button>
    </template>
  </n-modal>
</template>
