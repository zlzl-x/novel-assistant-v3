import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  createBlankPayload,
  defaultTitleForType,
  getSettingTemplate,
  moduleMatchesSearch,
  type SettingModule,
  type SettingModulePayload,
  type SettingModuleType,
  type SettingTemplateId
} from '@novel-assistant/core'

export const useSettingStore = defineStore('setting', () => {
  const modules = ref<SettingModule[]>([])
  const projectId = ref<string | null>(null)
  const loading = ref(false)

  const sortedModules = computed(() =>
    [...modules.value].sort((left, right) => left.order - right.order)
  )

  function filteredModules(query: string): SettingModule[] {
    return sortedModules.value.filter((module) => moduleMatchesSearch(module, query))
  }

  async function loadModules(nextProjectId: string): Promise<void> {
    projectId.value = nextProjectId
    loading.value = true
    try {
      const result = await window.novelApi.settingModules.list(nextProjectId)
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '加载设定模块失败')
      }
      modules.value = result.data
    } finally {
      loading.value = false
    }
  }

  async function createModule(input: {
    type: SettingModuleType
    title: string
    payload?: SettingModulePayload
    collapsed?: boolean
  }): Promise<SettingModule> {
    if (!projectId.value) throw new Error('未选择作品')
    const result = await window.novelApi.settingModules.create({
      projectId: projectId.value,
      type: input.type,
      title: input.title,
      payload: input.payload,
      collapsed: input.collapsed
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '创建设定模块失败')
    }
    modules.value = [...modules.value, result.data]
    return result.data
  }

  async function updateModule(input: {
    id: string
    title?: string
    collapsed?: boolean
    payload?: SettingModulePayload
  }): Promise<SettingModule> {
    const result = await window.novelApi.settingModules.update(input)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '更新设定模块失败')
    }
    modules.value = modules.value.map((module) =>
      module.id === result.data!.id ? result.data! : module
    )
    return result.data
  }

  async function deleteModule(moduleId: string): Promise<void> {
    const result = await window.novelApi.settingModules.delete(moduleId)
    if (!result.success) {
      throw new Error(result.error ?? '删除设定模块失败')
    }
    modules.value = modules.value.filter((module) => module.id !== moduleId)
  }

  async function reorderModules(orderedModuleIds: string[]): Promise<void> {
    if (!projectId.value) throw new Error('未选择作品')
    const result = await window.novelApi.settingModules.reorder({
      projectId: projectId.value,
      orderedModuleIds
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '排序设定模块失败')
    }
    modules.value = result.data
  }

  async function addBlankModule(type: SettingModuleType): Promise<SettingModule> {
    return createModule({
      type,
      title: defaultTitleForType(type),
      payload: createBlankPayload(type)
    })
  }

  async function addFromTemplate(templateId: SettingTemplateId): Promise<SettingModule[]> {
    const template = getSettingTemplate(templateId)
    if (!template) {
      throw new Error('模板不存在')
    }
    const created: SettingModule[] = []
    for (const moduleDef of template.modules) {
      const module = await createModule({
        type: moduleDef.type,
        title: moduleDef.title,
        payload: moduleDef.payload
      })
      created.push(module)
    }
    return created
  }

  async function collapseAll(collapsed: boolean): Promise<void> {
    const updates = sortedModules.value
      .filter((module) => module.collapsed !== collapsed)
      .map((module) => updateModule({ id: module.id, collapsed }))
    await Promise.all(updates)
  }

  function reset(): void {
    modules.value = []
    projectId.value = null
    loading.value = false
  }

  return {
    modules,
    projectId,
    loading,
    sortedModules,
    filteredModules,
    loadModules,
    createModule,
    updateModule,
    deleteModule,
    reorderModules,
    addBlankModule,
    addFromTemplate,
    collapseAll,
    reset
  }
})
