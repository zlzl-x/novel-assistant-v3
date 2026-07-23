<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  NAlert,
  NButton,
  NEmpty,
  NInput,
  NModal,
  NSelect,
  NSpace,
  NText,
  NTree,
  useMessage
} from 'naive-ui'
import type { MapNodeType } from '@novel-assistant/core'
import MapSandbox from '@/components/map/MapSandbox.vue'
import MapDebugModal from '@/components/map/MapDebugModal.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import { runMapCodegen } from '@/services/map/runMapCodegen'
import { hasActiveApiKey } from '@/services/llm'
import { useMapStore } from '@/stores/map'
import { useMapDebugStore } from '@/stores/mapDebug'
import { buildMapTreeOptions } from '@/utils/map-tree'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const mapStore = useMapStore()
const mapDebugStore = useMapDebugStore()

const generating = ref(false)
const generatingElapsedSec = ref(0)
let generatingTimer: number | null = null
let generateAbortController: AbortController | null = null
const currentGenerateRequestId = ref<string | null>(null)
const savingCode = ref(false)
const showCodeModal = ref(false)
const showDebugModal = ref(false)
const showNodeModal = ref(false)
const codeDraft = ref('')
const llmReady = ref(false)
const editingNodeId = ref<string | null>(null)
const worldDescription = ref('')
const worldStylePreset = ref('')

const nodeForm = ref({
  name: '',
  summary: '',
  type: 'other' as MapNodeType,
  relativePosition: '',
  neighbors: '',
  distanceHint: ''
})

const projectId = computed(() => String(route.params.id ?? ''))

const worldOptions = computed(() =>
  mapStore.worlds.map((world) => ({ label: world.name, value: world.id }))
)

const treeOptions = computed(() => buildMapTreeOptions(mapStore.filteredNodes))

const debugLogs = computed(() =>
  mapStore.currentWorldId ? mapDebugStore.getLogs(mapStore.currentWorldId) : []
)

const lastDebugError = computed(() =>
  [...debugLogs.value].reverse().find((entry) => entry.stage === 'map-codegen-error') ?? null
)

const lastDebugErrorMessage = computed(() => {
  const payload = lastDebugError.value?.payload
  if (payload && typeof payload === 'object' && 'error' in payload) {
    return String((payload as { error?: string }).error ?? '')
  }
  return ''
})

function startGeneratingTimer(): void {
  generatingElapsedSec.value = 0
  generatingTimer = window.setInterval(() => {
    generatingElapsedSec.value += 1
  }, 1000)
}

function stopGeneratingTimer(): void {
  if (generatingTimer !== null) {
    window.clearInterval(generatingTimer)
    generatingTimer = null
  }
  generatingElapsedSec.value = 0
}

function cancelGenerateMap(): void {
  generateAbortController?.abort()
  currentGenerateRequestId.value = null
  generating.value = false
  stopGeneratingTimer()
  message.info('已取消地图生成')
}

const generateButtonLabel = computed(() =>
  generating.value ? `生成中… ${generatingElapsedSec.value}s` : '生成地图'
)

const nodeTypeOptions = [
  { label: '大陆', value: 'continent' },
  { label: '国家', value: 'country' },
  { label: '区域', value: 'region' },
  { label: '城市', value: 'city' },
  { label: '宗门', value: 'sect' },
  { label: '建筑', value: 'building' },
  { label: '荒野', value: 'wilderness' },
  { label: '其他', value: 'other' }
]

async function bootstrap(): Promise<void> {
  if (!projectId.value) return
  llmReady.value = await hasActiveApiKey()
  await mapStore.loadWorlds(projectId.value)
}

function openCreateNodeModal(parentId: string | null = null): void {
  editingNodeId.value = null
  nodeForm.value = {
    name: '',
    summary: '',
    type: 'other',
    relativePosition: '',
    neighbors: '',
    distanceHint: ''
  }
  if (parentId) {
    mapStore.selectNode(parentId)
  }
  showNodeModal.value = true
}

function openEditNodeModal(nodeId: string): void {
  const node = mapStore.nodes.find((item) => item.id === nodeId)
  if (!node) return
  editingNodeId.value = node.id
  nodeForm.value = {
    name: node.name,
    summary: node.summary,
    type: node.type,
    relativePosition: node.geo?.relativePosition ?? '',
    neighbors: node.geo?.neighbors?.join('、') ?? '',
    distanceHint: node.geo?.distanceHint ?? ''
  }
  showNodeModal.value = true
}

async function saveNode(): Promise<void> {
  if (!nodeForm.value.name.trim()) {
    message.warning('地点名称不能为空')
    return
  }
  const geo = {
    relativePosition: nodeForm.value.relativePosition.trim() || undefined,
    neighbors: nodeForm.value.neighbors
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter(Boolean),
    distanceHint: nodeForm.value.distanceHint.trim() || undefined
  }
  try {
    if (editingNodeId.value) {
      await mapStore.updateNode({
        id: editingNodeId.value,
        name: nodeForm.value.name.trim(),
        summary: nodeForm.value.summary,
        type: nodeForm.value.type,
        geo
      })
      message.success('节点已更新')
    } else {
      await mapStore.createNode({
        name: nodeForm.value.name.trim(),
        parentId: mapStore.selectedNodeId,
        summary: nodeForm.value.summary,
        type: nodeForm.value.type,
        geo
      })
      message.success('节点已创建')
    }
    showNodeModal.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存节点失败')
  }
}

async function handleGenerateMap(): Promise<void> {
  if (!mapStore.currentWorld) return
  llmReady.value = await hasActiveApiKey()
  if (!llmReady.value) {
    message.warning('请先在应用设置中配置 LLM API Key')
    router.push('/app-settings')
    return
  }

  const description = worldDescription.value.trim()
  const nodeCount = mapStore.nodes.length
  if (!description && nodeCount === 0) {
    message.warning('请先填写地图说明，或至少添加一个地点节点')
    return
  }
  if (nodeCount === 0) {
    message.info('当前没有地点节点，将仅根据地图说明生成区域（之后可在左侧添加节点并重新生成）', {
      duration: 5000
    })
  }

  const worldId = mapStore.currentWorld.id
  mapDebugStore.createSession(worldId)
  const appendLog = (entry: Parameters<typeof mapDebugStore.append>[1]) => {
    mapDebugStore.append(worldId, entry)
  }

  generating.value = true
  startGeneratingTimer()
  generateAbortController = new AbortController()
  const requestId = `map-${worldId}-${Date.now()}`
  currentGenerateRequestId.value = requestId
  try {
    appendLog({
      stage: 'map-codegen-start',
      label: '更新世界说明',
      payload: {
        descriptionLength: description.length,
        nodeCount,
        stylePreset: worldStylePreset.value || null
      }
    })

    const updatedWorld = await mapStore.updateWorld({
      id: worldId,
      description: worldDescription.value,
      stylePreset: worldStylePreset.value || null
    })

    const { html: code } = await runMapCodegen({
      world: updatedWorld,
      nodes: mapStore.nodes,
      onDebug: appendLog,
      requestId,
      signal: generateAbortController.signal
    })

    appendLog({
      stage: 'map-save',
      label: '保存地图代码',
      payload: { codeLength: code.length }
    })

    await mapStore.saveGeneratedCode(code)

    appendLog({
      stage: 'map-render',
      label: '地图渲染完成',
      payload: {
        renderHtmlLength: mapStore.renderHtml.length,
        codeVersion: mapStore.currentWorld?.codeVersion ?? 0
      }
    })

    message.success('地图已生成')
  } catch (error) {
    if (generateAbortController.signal.aborted) {
      return
    }
    const errorMessage = error instanceof Error ? error.message : '生成地图失败'
    appendLog({
      stage: 'map-codegen-error',
      label: '生成流程失败',
      payload: { error: errorMessage }
    })
    message.error(errorMessage)
    showDebugModal.value = true
  } finally {
    generating.value = false
    stopGeneratingTimer()
    generateAbortController = null
    currentGenerateRequestId.value = null
  }
}

function openCodeEditor(): void {
  codeDraft.value = mapStore.currentWorld?.generatedCode ?? ''
  showCodeModal.value = true
}

async function saveCodeDraft(): Promise<void> {
  savingCode.value = true
  try {
    mapStore.setRenderHtmlFromCode(codeDraft.value)
    await mapStore.saveGeneratedCode(codeDraft.value)
    message.success('地图代码已保存并重新渲染')
    showCodeModal.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存代码失败')
  } finally {
    savingCode.value = false
  }
}

async function handleCreateWorld(): Promise<void> {
  const name = `新世界 ${mapStore.worlds.length + 1}`
  try {
    await mapStore.createWorld(name)
    message.success('已创建新世界')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建世界失败')
  }
}

function handleTreeSelect(keys: Array<string | number>): void {
  const nodeId = String(keys[0] ?? '')
  mapStore.selectNode(nodeId || null)
}

function handlePlaceClick(placeId: string): void {
  if (!mapStore.nodes.some((node) => node.id === placeId)) return
  mapStore.selectNode(placeId)
}

onMounted(bootstrap)
onBeforeUnmount(stopGeneratingTimer)
watch(() => route.params.id, bootstrap)
watch(
  () => mapStore.currentWorld,
  (world) => {
    worldDescription.value = world?.description ?? ''
    worldStylePreset.value = world?.stylePreset ?? ''
  },
  { immediate: true }
)

async function persistWorldMeta(): Promise<void> {
  if (!mapStore.currentWorld) return
  try {
    await mapStore.updateWorld({
      id: mapStore.currentWorld.id,
      description: worldDescription.value,
      stylePreset: worldStylePreset.value || null
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存世界说明失败')
  }
}
</script>

<template>
  <div class="flex h-full min-h-0">
    <aside class="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white p-4">
      <div class="mb-3 flex items-center justify-between gap-2">
        <n-text strong>地图世界</n-text>
        <n-button size="tiny" @click="handleCreateWorld">新建</n-button>
      </div>

      <n-select
        v-if="worldOptions.length"
        :value="mapStore.currentWorldId"
        :options="worldOptions"
        placeholder="选择世界"
        @update:value="(value: string) => mapStore.selectWorld(value)"
      />
      <n-empty v-else class="my-4" description="暂无世界" />

      <SearchInput
        v-model:value="mapStore.searchQuery"
        class="mt-3"
        placeholder="搜索地点"
      />

      <div class="mt-3 min-h-0 flex-1 overflow-y-auto rounded border border-slate-100 p-2">
        <n-tree
          v-if="treeOptions.length"
          block-line
          selectable
          :selected-keys="mapStore.selectedNodeId ? [mapStore.selectedNodeId] : []"
          :data="treeOptions"
          @update:selected-keys="handleTreeSelect"
        />
        <n-text v-else depth="3" class="block py-6 text-center text-xs">暂无地点节点</n-text>
      </div>

      <n-space vertical class="mt-3 w-full">
        <n-button size="small" @click="openCreateNodeModal()">添加地点</n-button>
        <n-button
          size="small"
          :disabled="!mapStore.selectedNodeId"
          @click="mapStore.selectedNodeId && openEditNodeModal(mapStore.selectedNodeId)"
        >
          编辑地点
        </n-button>
      </n-space>

      <div class="mt-4 border-t border-slate-100 pt-4">
        <n-text depth="3" class="mb-2 block text-xs">地图提示词</n-text>
        <n-input
          v-if="mapStore.currentWorld"
          v-model:value="worldDescription"
          type="textarea"
          :rows="5"
          placeholder="描述地理格局、地点关系、视觉风格…"
          @blur="persistWorldMeta"
        />
        <n-input
          v-if="mapStore.currentWorld"
          v-model:value="worldStylePreset"
          class="mt-2"
          size="small"
          placeholder="视觉风格预设"
          @blur="persistWorldMeta"
        />
        <n-button
          class="mt-3"
          block
          type="primary"
          :loading="generating"
          :disabled="!mapStore.currentWorld"
          @click="handleGenerateMap"
        >
          {{ generateButtonLabel }}
        </n-button>
        <n-button
          v-if="generating"
          class="mt-2"
          block
          quaternary
          @click="cancelGenerateMap"
        >
          取消生成
        </n-button>
        <n-text v-if="generating" depth="3" class="mt-2 block text-center text-xs">
          地图生成最多等待 5 分钟；将根据地图提示词绘制地理示意图
        </n-text>
        <n-text v-if="mapStore.currentWorld && mapStore.nodes.length === 0" depth="3" class="mt-2 block text-xs">
          未添加地点时，将根据地图提示词中的地名生成可点击区域（region-1…）；添加地点后重新生成可联动侧边栏。
        </n-text>
        <n-button
          class="mt-2"
          block
          quaternary
          :disabled="!mapStore.currentWorld?.generatedCode"
          @click="openCodeEditor"
        >
          查看/编辑代码
        </n-button>
        <n-button
          class="mt-2"
          block
          quaternary
          :disabled="debugLogs.length === 0"
          @click="showDebugModal = true"
        >
          查看生成日志
        </n-button>
        <n-alert
          v-if="lastDebugError"
          class="mt-3"
          type="error"
          :bordered="false"
          :title="lastDebugError.label"
        >
          {{ lastDebugErrorMessage || '请打开生成日志查看详情' }}
        </n-alert>
        <n-alert v-if="!llmReady" class="mt-3" type="warning" :bordered="false">
          未配置 LLM 时仍可使用树状导航；生成地图需先配置 API Key。
        </n-alert>
      </div>
    </aside>

    <section class="flex min-h-0 flex-1 flex-col p-4">
      <div class="mb-3 flex items-center justify-between">
        <div>
          <h2 class="text-lg font-semibold">{{ mapStore.currentWorld?.name || '地图' }}</h2>
          <n-text depth="3" class="text-xs">
            版本 {{ mapStore.currentWorld?.codeVersion ?? 0 }}
            <span v-if="mapStore.currentWorld?.codeGeneratedAt">
              · {{ new Date(mapStore.currentWorld.codeGeneratedAt).toLocaleString('zh-CN') }}
            </span>
          </n-text>
        </div>
      </div>

      <n-alert v-if="mapStore.renderError" type="error" class="mb-3" :title="mapStore.renderError" />

      <div v-if="mapStore.renderHtml" class="min-h-0 flex-1">
        <map-sandbox
          :html="mapStore.renderHtml"
          :highlight-node-id="mapStore.selectedNodeId"
          @place-click="handlePlaceClick"
        />
      </div>
      <div
        v-else
        class="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-slate-400"
      >
        填写地图说明并点击「生成地图」，或手动编辑代码后保存
      </div>
    </section>

    <n-modal v-model:show="showCodeModal" preset="card" title="地图 HTML 代码" class="max-w-4xl">
      <n-input v-model:value="codeDraft" type="textarea" :rows="18" placeholder="粘贴或编辑 HTML" />
      <template #footer>
        <n-space>
          <n-button @click="showCodeModal = false">取消</n-button>
          <n-button type="primary" :loading="savingCode" @click="saveCodeDraft">保存并渲染</n-button>
        </n-space>
      </template>
    </n-modal>

    <map-debug-modal :show="showDebugModal" :logs="debugLogs" @close="showDebugModal = false" />

    <n-modal v-model:show="showNodeModal" preset="card" :title="editingNodeId ? '编辑地点' : '添加地点'" class="max-w-lg">
      <n-space vertical class="w-full">
        <n-input v-model:value="nodeForm.name" placeholder="地点名称" />
        <n-select v-model:value="nodeForm.type" :options="nodeTypeOptions" />
        <n-input v-model:value="nodeForm.summary" type="textarea" :rows="3" placeholder="地点说明" />
        <n-input v-model:value="nodeForm.relativePosition" placeholder="相对位置，如「青云山东北侧」" />
        <n-input v-model:value="nodeForm.neighbors" placeholder="邻接地点 id，逗号分隔" />
        <n-input v-model:value="nodeForm.distanceHint" placeholder="距离感，如「距天元城三日路程」" />
      </n-space>
      <template #footer>
        <n-space>
          <n-button @click="showNodeModal = false">取消</n-button>
          <n-button type="primary" @click="saveNode">保存</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>
