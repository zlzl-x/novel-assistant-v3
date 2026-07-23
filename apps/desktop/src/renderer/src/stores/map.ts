import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  isTruncatedMapHtml,
  prepareMapCodeFromLlm,
  type MapNode,
  type MapWorld
} from '@novel-assistant/core'

export const useMapStore = defineStore('map', () => {
  const worlds = ref<MapWorld[]>([])
  const nodes = ref<MapNode[]>([])
  const currentWorldId = ref<string | null>(null)
  const selectedNodeId = ref<string | null>(null)
  const searchQuery = ref('')
  const loading = ref(false)
  const renderHtml = ref('')
  const renderError = ref<string | null>(null)
  const projectId = ref<string | null>(null)

  const currentWorld = computed(
    () => worlds.value.find((world) => world.id === currentWorldId.value) ?? null
  )

  const selectedNode = computed(
    () => nodes.value.find((node) => node.id === selectedNodeId.value) ?? null
  )

  const filteredNodes = computed(() => {
    const query = searchQuery.value.trim().toLowerCase()
    if (!query) return nodes.value
    return nodes.value.filter((node) =>
      [node.name, node.summary, node.type, ...(node.tags ?? [])].some((value) =>
        value.toLowerCase().includes(query)
      )
    )
  })

  async function loadWorlds(nextProjectId: string): Promise<void> {
    projectId.value = nextProjectId
    loading.value = true
    try {
      const result = await window.novelApi.maps.listWorlds(nextProjectId)
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '加载地图世界失败')
      }
      worlds.value = result.data
      if (!currentWorldId.value && result.data[0]) {
        await selectWorld(result.data[0].id)
      } else if (currentWorldId.value) {
        await loadNodes(currentWorldId.value)
      }
    } finally {
      loading.value = false
    }
  }

  async function selectWorld(worldId: string): Promise<void> {
    currentWorldId.value = worldId
    selectedNodeId.value = null
    await loadNodes(worldId)
    refreshRenderFromWorld()
  }

  async function loadNodes(worldId: string): Promise<void> {
    const result = await window.novelApi.maps.listNodes(worldId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '加载地图节点失败')
    }
    nodes.value = result.data
  }

  function refreshRenderFromWorld(): void {
    renderError.value = null
    const code = currentWorld.value?.generatedCode
    if (!code) {
      renderHtml.value = ''
      return
    }
    if (isTruncatedMapHtml(code)) {
      renderError.value =
        '地图代码不完整（生成时被截断），请点击「重新生成」或查看/编辑代码后保存完整 HTML'
      renderHtml.value = ''
      return
    }
    try {
      const prepared = prepareMapCodeFromLlm(code)
      renderHtml.value = prepared.renderHtml
    } catch (error) {
      renderError.value = error instanceof Error ? error.message : '地图代码无法渲染'
      renderHtml.value = ''
    }
  }

  function setRenderHtmlFromCode(code: string): void {
    const prepared = prepareMapCodeFromLlm(code)
    renderHtml.value = prepared.renderHtml
    renderError.value = null
  }

  async function createWorld(name: string): Promise<MapWorld> {
    if (!projectId.value) throw new Error('未选择作品')
    const result = await window.novelApi.maps.createWorld({
      projectId: projectId.value,
      name,
      description: ''
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '创建世界失败')
    }
    worlds.value = [...worlds.value, result.data]
    await selectWorld(result.data.id)
    return result.data
  }

  async function updateWorld(input: {
    id: string
    name?: string
    description?: string
    stylePreset?: string | null
  }): Promise<MapWorld> {
    const result = await window.novelApi.maps.updateWorld(input)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '更新世界失败')
    }
    worlds.value = worlds.value.map((world) => (world.id === result.data!.id ? result.data! : world))
    return result.data
  }

  async function saveGeneratedCode(code: string): Promise<MapWorld> {
    if (!currentWorldId.value) throw new Error('未选择世界')
    const result = await window.novelApi.maps.saveGeneratedCode({
      worldId: currentWorldId.value,
      code
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '保存地图代码失败')
    }
    worlds.value = worlds.value.map((world) => (world.id === result.data!.id ? result.data! : world))
    refreshRenderFromWorld()
    if (renderError.value) {
      throw new Error(renderError.value)
    }
    if (!renderHtml.value.trim()) {
      throw new Error('地图代码已保存，但渲染结果为空')
    }
    return result.data
  }

  async function createNode(input: {
    name: string
    parentId?: string | null
    summary?: string
    type?: MapNode['type']
    geo?: MapNode['geo']
  }): Promise<MapNode> {
    if (!currentWorldId.value) throw new Error('未选择世界')
    const result = await window.novelApi.maps.createNode({
      worldId: currentWorldId.value,
      name: input.name,
      parentId: input.parentId ?? null,
      summary: input.summary ?? '',
      type: input.type ?? 'other',
      geo: input.geo
    })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '创建节点失败')
    }
    nodes.value = [...nodes.value, result.data]
    return result.data
  }

  async function updateNode(input: {
    id: string
    name?: string
    parentId?: string | null
    summary?: string
    type?: MapNode['type']
    geo?: MapNode['geo'] | null
  }): Promise<MapNode> {
    const result = await window.novelApi.maps.updateNode(input)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '更新节点失败')
    }
    nodes.value = nodes.value.map((node) => (node.id === result.data!.id ? result.data! : node))
    return result.data
  }

  async function deleteNode(nodeId: string): Promise<void> {
    const result = await window.novelApi.maps.deleteNode(nodeId)
    if (!result.success) {
      throw new Error(result.error ?? '删除节点失败')
    }
    nodes.value = nodes.value.filter((node) => node.id !== nodeId)
    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null
    }
  }

  function selectNode(nodeId: string | null): void {
    selectedNodeId.value = nodeId
  }

  function reset(): void {
    worlds.value = []
    nodes.value = []
    currentWorldId.value = null
    selectedNodeId.value = null
    searchQuery.value = ''
    renderHtml.value = ''
    renderError.value = null
    projectId.value = null
  }

  return {
    worlds,
    nodes,
    currentWorldId,
    selectedNodeId,
    searchQuery,
    loading,
    renderHtml,
    renderError,
    projectId,
    currentWorld,
    selectedNode,
    filteredNodes,
    loadWorlds,
    selectWorld,
    loadNodes,
    refreshRenderFromWorld,
    setRenderHtmlFromCode,
    createWorld,
    updateWorld,
    saveGeneratedCode,
    createNode,
    updateNode,
    deleteNode,
    selectNode,
    reset
  }
})
