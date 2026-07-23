<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  NButton,
  NCheckbox,
  NCollapse,
  NCollapseItem,
  NDrawer,
  NDrawerContent,
  NForm,
  NFormItem,
  NInput,
  NSelect,
  NSpace,
  NTable,
  NTag,
  useDialog,
  useMessage
} from 'naive-ui'
import {
  type Character,
  type CharacterRole
} from '@novel-assistant/core'
import { buildExistingDisplayRows } from '@novel-assistant/core'
import { FIELD_HISTORY_LABELS, HISTORY_PREVIEW_LIMIT } from '@/utils/character'
import MergeCharacterModal from '@/components/character/MergeCharacterModal.vue'
import { useCharacterStore } from '@/stores/character'
import { useGraphStore } from '@/stores/graph'
import { useProjectStore } from '@/stores/project'
interface InfoEntry {
  key: string
  value: string
}

interface CharacterFormState {
  name: string
  disambiguation: string
  role: CharacterRole
  notes: string
  isNetworkCenter: boolean
  infoEntries: InfoEntry[]
}

function buildFormFromCharacter(character: Character): CharacterFormState {
  return {
    name: character.name,
    disambiguation: character.disambiguation,
    role: character.role,
    notes: character.notes,
    isNetworkCenter: character.isNetworkCenter ?? false,
    infoEntries: buildExistingDisplayRows(character).map((row) => ({
      key: row.name,
      value: row.value
    }))
  }
}

const characterStore = useCharacterStore()
const graphStore = useGraphStore()
const projectStore = useProjectStore()
const message = useMessage()
const dialog = useDialog()
const saving = ref(false)
const deleting = ref(false)
const showMergeModal = ref(false)

const visible = computed({
  get: () => characterStore.detailDrawerOpen,
  set: (value: boolean) => {
    if (!value) characterStore.closeDetail()
  }
})

const character = computed(() => characterStore.selectedCharacter)

const form = ref<CharacterFormState>({
  name: '',
  disambiguation: '',
  role: 'mentioned',
  notes: '',
  isNetworkCenter: false,
  infoEntries: []
})

const roleOptions = [
  { label: '主角', value: 'protagonist' },
  { label: '重要配角', value: 'major' },
  { label: '次要角色', value: 'minor' },
  { label: '仅提及', value: 'mentioned' }
]

const appearanceRows = computed(() =>
  [...(character.value?.appearances ?? [])].sort((left, right) => left.chapterNumber - right.chapterNumber)
)

const fieldHistories = computed(() => {
  if (!character.value) return []
  return [
    { key: FIELD_HISTORY_LABELS.identity, field: character.value.identity },
    { key: FIELD_HISTORY_LABELS.realm, field: character.value.realm },
    { key: FIELD_HISTORY_LABELS.location, field: character.value.location },
    ...(character.value.faction
      ? [{ key: FIELD_HISTORY_LABELS.faction, field: character.value.faction }]
      : [])
  ]
    .map((item) => ({
      ...item,
      entries: [...item.field.history].sort(
        (left, right) => (left.chapterNumber ?? 0) - (right.chapterNumber ?? 0)
      )
    }))
    .filter((item) => item.entries.length > 0)
})

const hasTimeline = computed(
  () => appearanceRows.value.length > 0 || fieldHistories.value.length > 0
)

watch(
  () => characterStore.selectedCharacterId,
  () => {
    const next = characterStore.selectedCharacter
    if (!next) return
    form.value = buildFormFromCharacter(next)
  },
  { immediate: true }
)

function addInfoEntry(): void {
  form.value.infoEntries = [...form.value.infoEntries, { key: '', value: '' }]
}

function removeInfoEntry(index: number): void {
  form.value.infoEntries = form.value.infoEntries.filter((_, rowIndex) => rowIndex !== index)
}

function updateInfoEntry(index: number, patch: Partial<InfoEntry>): void {
  form.value.infoEntries = form.value.infoEntries.map((entry, rowIndex) =>
    rowIndex === index ? { ...entry, ...patch } : entry
  )
}

function dedupeInfoEntries(entries: InfoEntry[]): InfoEntry[] {
  const map = new Map<string, InfoEntry>()
  for (const entry of entries) {
    const key = entry.key.trim()
    if (!key) continue
    map.set(key, { key, value: entry.value.trim() })
  }
  return [...map.values()]
}

function buildPanelFromEntries(entries: InfoEntry[]): {
  identity: string
  realm: string
  location: string
  faction: string | null
  status: string | null
  panelEntries: InfoEntry[]
} {
  const standardKeys = new Set(['身份/称号', '境界', '职业', '所在地', '势力', '状态'])
  const result = {
    identity: '',
    realm: '',
    location: '',
    faction: null as string | null,
    status: null as string | null,
    panelEntries: [] as InfoEntry[]
  }

  for (const entry of entries) {
    const key = entry.key.trim()
    const value = entry.value.trim()
    if (!key) continue
    switch (key) {
      case '身份/称号':
        result.identity = value
        break
      case '境界':
        result.realm = value
        break
      case '职业':
        result.panelEntries.push({ key: '职业', value })
        break
      case '所在地':
        result.location = value
        break
      case '势力':
        result.faction = value || null
        break
      case '状态':
        result.status = value || null
        break
      default:
        if (!standardKeys.has(key)) {
          result.panelEntries.push({ key, value })
        }
    }
  }

  result.panelEntries = dedupeInfoEntries(result.panelEntries)
  return result
}

async function handleSave(): Promise<void> {
  if (!character.value) return
  if (!form.value.name.trim()) {
    message.warning('角色名不能为空')
    return
  }

  const mapped = buildPanelFromEntries(form.value.infoEntries)

  saving.value = true
  try {
    const updated = await characterStore.updateCharacter({
      id: character.value.id,
      name: form.value.name.trim(),
      disambiguation: form.value.disambiguation.trim(),
      role: form.value.role,
      isNetworkCenter: form.value.isNetworkCenter,
      identity: mapped.identity,
      realm: mapped.realm,
      location: mapped.location,
      faction: mapped.faction,
      notes: form.value.notes,
      status: mapped.status,
      panel: {
        entries: mapped.panelEntries
          .filter((entry) => entry.key.trim())
          .map((entry) => {
            const existing = character.value!.panel.entries.find((item) => item.key === entry.key)
            return {
              key: entry.key.trim(),
              value: entry.value,
              history: (existing?.history ?? []).map((item) => ({ ...item }))
            }
          })
      }
    })
    form.value = buildFormFromCharacter(updated)
    graphStore.refresh()
    message.success('角色已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function handleDelete(): void {
  if (!character.value) return

  const target = character.value
  const isProtagonist =
    target.role === 'protagonist' || projectStore.currentProject?.protagonistId === target.id

  dialog.warning({
    title: '删除角色',
    content: isProtagonist
      ? `确定删除主角「${target.name}」？将同时清除作品主角设置、出场记录与关系网数据，此操作不可恢复。`
      : `确定删除角色「${target.name}」？将同时删除其出场记录与关系网数据，此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      deleting.value = true
      try {
        await characterStore.deleteCharacter(target.id)
        graphStore.refresh()
        message.success('角色已删除')
      } catch (error) {
        message.error(error instanceof Error ? error.message : '删除失败')
      } finally {
        deleting.value = false
      }
    }
  })
}

function handleMerged(characterId: string): void {
  const next = characterStore.characters.find((item) => item.id === characterId)
  if (next) {
    form.value = buildFormFromCharacter(next)
  }
}

function formatCommittedAt(value: string): string {
  return new Date(value).toLocaleString('zh-CN')
}
</script>

<template>
  <n-drawer v-model:show="visible" :width="480" placement="right">
    <n-drawer-content v-if="character" :title="character.name" closable>
      <n-form label-placement="top" size="small">
        <n-form-item label="角色名" required>
          <n-input v-model:value="form.name" />
        </n-form-item>
        <n-form-item label="区分标识">
          <n-input v-model:value="form.disambiguation" placeholder="同名时填写" />
        </n-form-item>
        <n-form-item v-if="character.aliases.length > 0" label="别名">
          <div class="flex flex-wrap gap-1.5">
            <n-tag v-for="alias in character.aliases" :key="alias" size="small" :bordered="false">
              {{ alias }}
            </n-tag>
          </div>
        </n-form-item>
        <n-form-item label="角色类型">
          <n-select v-model:value="form.role" :options="roleOptions" />
        </n-form-item>
        <n-form-item
          v-if="projectStore.currentProject?.networkMode === 'ensemble'"
          label="关系网中心"
        >
          <n-checkbox v-model:checked="form.isNetworkCenter">
            作为群像模式锚点节点
          </n-checkbox>
        </n-form-item>

        <section class="mb-4">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-medium">角色信息</span>
            <n-button size="tiny" quaternary @click="addInfoEntry">添加</n-button>
          </div>
          <p v-if="form.infoEntries.length === 0" class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
            识别后将自动填充；也可手动添加词条
          </p>
          <div
            v-for="(entry, index) in form.infoEntries"
            :key="`info-${index}`"
            class="mb-2 grid grid-cols-[88px_1fr_auto] gap-2"
          >
            <n-input
              size="small"
              :value="entry.key"
              placeholder="字段"
              @update:value="(value) => updateInfoEntry(index, { key: value })"
            />
            <n-input
              size="small"
              :value="entry.value"
              placeholder="内容"
              @update:value="(value) => updateInfoEntry(index, { value })"
            />
            <n-button size="tiny" quaternary type="error" @click="removeInfoEntry(index)">删</n-button>
          </div>
        </section>

        <n-form-item label="备注">
          <n-input v-model:value="form.notes" type="textarea" :rows="2" placeholder="可选" />
        </n-form-item>

        <n-collapse v-if="hasTimeline" class="mt-2">
          <n-collapse-item v-if="appearanceRows.length" title="出场记录" name="appearances">
            <n-table size="small" :bordered="false" :single-line="false">
              <thead>
                <tr>
                  <th>章</th>
                  <th>次数</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="appearance in appearanceRows" :key="appearance.chapterId">
                  <td>第{{ appearance.chapterNumber }}章</td>
                  <td>{{ appearance.mentionCount }}</td>
                </tr>
              </tbody>
            </n-table>
          </n-collapse-item>
          <n-collapse-item
            v-for="history in fieldHistories"
            :key="history.key"
            :title="`${history.key} 历史`"
            :name="history.key"
          >
            <div
              v-for="(entry, index) in history.entries.slice(0, HISTORY_PREVIEW_LIMIT)"
              :key="`${history.key}-${index}`"
              class="mb-2 rounded border border-slate-100 bg-slate-50 p-2 text-xs"
            >
              <div>{{ entry.value }}</div>
              <div class="text-slate-500">第{{ entry.chapterNumber ?? '?' }}章</div>
            </div>
          </n-collapse-item>
        </n-collapse>
      </n-form>

      <template #footer>
        <n-space justify="space-between" class="w-full">
          <n-space>
            <n-button type="error" quaternary :loading="deleting" @click="handleDelete">删除角色</n-button>
            <n-button quaternary @click="showMergeModal = true">合并角色</n-button>
          </n-space>
          <n-space>
            <n-button type="primary" :loading="saving" @click="handleSave">保存</n-button>
            <n-button @click="characterStore.closeDetail()">关闭</n-button>
          </n-space>
        </n-space>
      </template>
    </n-drawer-content>
  </n-drawer>

  <merge-character-modal
    v-model:show="showMergeModal"
    :character="character"
    @merged="handleMerged"
  />
</template>
