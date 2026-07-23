<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NButton,
  NDropdown,
  NEmpty,
  NInput,
  NSpace,
  NSpin,
  useMessage
} from 'naive-ui'
import {
  SETTING_TEMPLATES,
  type SettingModule,
  type SettingModulePayload,
  type SettingModuleType,
  type SettingTemplateId
} from '@novel-assistant/core'
import SettingModuleCard from '@/components/settings/SettingModuleCard.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import { useSettingStore } from '@/stores/setting'

const route = useRoute()
const message = useMessage()
const settingStore = useSettingStore()

const searchQuery = ref('')
const dragSourceId = ref<string | null>(null)
const dragOverId = ref<string | null>(null)
const focusModuleId = ref<string | null>(null)

const projectId = computed(() => String(route.params.id ?? ''))

const visibleModules = computed(() => settingStore.filteredModules(searchQuery.value))

const addModuleOptions = [
  {
    label: '富文本',
    key: 'type:richtext'
  },
  {
    label: '清单',
    key: 'type:checklist'
  },
  {
    label: '表格',
    key: 'type:table'
  },
  {
    type: 'divider',
    key: 'divider-templates'
  },
  ...SETTING_TEMPLATES.map((template) => ({
    label: `模板：${template.name}`,
    key: `template:${template.id}`
  }))
]

onMounted(() => {
  void loadModules()
})

watch(projectId, () => {
  void loadModules()
})

async function loadModules(): Promise<void> {
  if (!projectId.value) return
  settingStore.reset()
  await settingStore.loadModules(projectId.value)
}

async function handleAddModule(key: string): Promise<void> {
  try {
    if (key.startsWith('type:')) {
      const type = key.replace('type:', '') as SettingModuleType
      const created = await settingStore.addBlankModule(type)
      focusModuleId.value = created.id
      message.success('已添加模块')
      return
    }
    if (key.startsWith('template:')) {
      const templateId = key.replace('template:', '') as SettingTemplateId
      const created = await settingStore.addFromTemplate(templateId)
      focusModuleId.value = created[created.length - 1]?.id ?? null
      message.success('已从模板添加模块')
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '添加模块失败')
  }
}

async function updateTitle(module: SettingModule, title: string): Promise<void> {
  try {
    await settingStore.updateModule({ id: module.id, title })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新标题失败')
  }
}

async function updateCollapsed(module: SettingModule, collapsed: boolean): Promise<void> {
  try {
    await settingStore.updateModule({ id: module.id, collapsed })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新折叠状态失败')
  }
}

async function updatePayload(module: SettingModule, payload: SettingModulePayload): Promise<void> {
  try {
    await settingStore.updateModule({ id: module.id, payload })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存内容失败')
  }
}

async function deleteModule(moduleId: string): Promise<void> {
  try {
    await settingStore.deleteModule(moduleId)
    message.success('已删除模块')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除模块失败')
  }
}

function onDragStart(moduleId: string): void {
  dragSourceId.value = moduleId
}

function onDragOver(moduleId: string): void {
  dragOverId.value = moduleId
}

async function onDrop(targetModuleId: string): Promise<void> {
  const sourceId = dragSourceId.value
  dragSourceId.value = null
  dragOverId.value = null
  if (!sourceId || sourceId === targetModuleId) return

  const orderedIds = settingStore.sortedModules.map((module) => module.id)
  const sourceIndex = orderedIds.indexOf(sourceId)
  const targetIndex = orderedIds.indexOf(targetModuleId)
  if (sourceIndex < 0 || targetIndex < 0) return

  orderedIds.splice(sourceIndex, 1)
  orderedIds.splice(targetIndex, 0, sourceId)

  try {
    await settingStore.reorderModules(orderedIds)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '排序失败')
  }
}

function onDragEnd(): void {
  dragSourceId.value = null
  dragOverId.value = null
}

async function collapseAll(): Promise<void> {
  try {
    await settingStore.collapseAll(true)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '折叠失败')
  }
}

watch(focusModuleId, async (moduleId) => {
  if (!moduleId) return
  await nextTick()
  const element = document.querySelector(`[data-module-id="${moduleId}"] textarea, [data-module-id="${moduleId}"] input`)
  if (element instanceof HTMLElement) {
    element.focus()
  }
  focusModuleId.value = null
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="border-b border-slate-200 px-6 py-4">
      <h2 class="text-xl font-semibold">设定</h2>
      <p class="mt-1 text-sm text-slate-500">自定义模块（富文本 / 清单 / 表格）</p>
      <n-space class="mt-4" align="center">
        <n-dropdown trigger="click" :options="addModuleOptions" @select="handleAddModule">
          <n-button type="primary">+ 添加模块</n-button>
        </n-dropdown>
        <n-button @click="collapseAll">全部折叠</n-button>
        <SearchInput v-model:value="searchQuery" placeholder="搜索设定内容" class="w-64" />
      </n-space>
    </div>

    <div class="flex-1 overflow-y-auto px-6 py-4">
      <n-spin :show="settingStore.loading">
        <div v-if="visibleModules.length > 0" class="space-y-4">
          <div
            v-for="module in visibleModules"
            :key="module.id"
            :data-module-id="module.id"
          >
            <setting-module-card
              :module="module"
              :dragging="dragSourceId === module.id"
              :drag-over="dragOverId === module.id"
              @update:title="(title) => updateTitle(module, title)"
              @update:collapsed="(collapsed) => updateCollapsed(module, collapsed)"
              @update:payload="(payload) => updatePayload(module, payload)"
              @delete="deleteModule(module.id)"
              @drag-start="onDragStart"
              @drag-over="onDragOver"
              @drop="onDrop"
              @drag-end="onDragEnd"
            />
          </div>
        </div>
        <n-empty
          v-else-if="!settingStore.loading"
          class="mt-16"
          description="添加第一个设定模块，或从模板开始"
        />
      </n-spin>
    </div>
  </div>
</template>
