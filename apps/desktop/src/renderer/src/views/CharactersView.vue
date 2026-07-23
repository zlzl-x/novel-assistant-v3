<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  NButton,
  NEmpty,
  NRadioButton,
  NRadioGroup,
  NSpace,
  NTabPane,
  NTabs,
  NText,
  useMessage
} from 'naive-ui'
import CreateCharacterModal from '@/components/character/CreateCharacterModal.vue'
import CharacterBubbleCard from '@/components/character/CharacterBubbleCard.vue'
import RelationGraph from '@/components/character/RelationGraph.vue'
import { useCharacterStore } from '@/stores/character'
import { useGraphStore } from '@/stores/graph'
import { useProjectStore } from '@/stores/project'

const route = useRoute()
const message = useMessage()
const characterStore = useCharacterStore()
const graphStore = useGraphStore()
const projectStore = useProjectStore()

const showCreateModal = ref(false)
const activeTab = ref<'list' | 'graph'>('graph')
const graphRef = ref<InstanceType<typeof RelationGraph> | null>(null)
const updatingNetworkMode = ref(false)

const projectId = computed(() => String(route.params.id ?? ''))
const characters = computed(() => characterStore.sortedCharacters)
const networkMode = computed(() => projectStore.currentProject?.networkMode ?? 'single')

const networkModeOptions = [
  { label: '单主角', value: 'single' },
  { label: '群像多中心', value: 'ensemble' }
]

onMounted(() => {
  graphStore.registerGraphComponent(graphRef.value)
})

watch(graphRef, (component) => {
  graphStore.registerGraphComponent(component)
})

onBeforeUnmount(() => {
  graphStore.registerGraphComponent(null)
})

function openCharacter(characterId: string): void {
  characterStore.selectCharacter(characterId)
  characterStore.openDetail(characterId)
}

function handleGraphSelect(characterId: string): void {
  characterStore.selectCharacter(characterId)
  characterStore.openDetail(characterId)
}

function handleCreated(characterId: string): void {
  openCharacter(characterId)
}

function handleSelectAggregate(): void {
  activeTab.value = 'list'
  message.info('已切换到列表视图，可查看全部角色')
}

async function handleNetworkModeChange(mode: 'single' | 'ensemble'): Promise<void> {
  if (!projectStore.currentProject) return
  updatingNetworkMode.value = true
  try {
    await projectStore.updateProject({
      id: projectStore.currentProject.id,
      networkMode: mode
    })
    graphStore.refresh()
    message.success(mode === 'ensemble' ? '已切换为群像多中心模式' : '已切换为单主角模式')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '更新失败')
  } finally {
    updatingNetworkMode.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-semibold">角色 · 关系网</h2>
        <n-text depth="3" class="mt-1">气泡关系网与动态角色卡片</n-text>
      </div>
      <n-space align="center">
        <n-radio-group
          :value="networkMode"
          size="small"
          :disabled="updatingNetworkMode"
          @update:value="handleNetworkModeChange"
        >
          <n-radio-button
            v-for="option in networkModeOptions"
            :key="option.value"
            :value="option.value"
            :label="option.label"
          />
        </n-radio-group>
        <n-button type="primary" @click="showCreateModal = true">新建角色</n-button>
      </n-space>
    </div>

    <n-tabs v-model:value="activeTab" class="mt-4 flex min-h-0 flex-1 flex-col" type="line">
      <n-tab-pane name="graph" tab="关系网" class="flex min-h-0 flex-1 flex-col">
        <div v-if="characters.length === 0" class="flex flex-1 items-center justify-center">
          <n-empty description="暂无角色">
            <template #extra>
              <n-button size="small" @click="showCreateModal = true">创建第一个角色</n-button>
            </template>
          </n-empty>
        </div>
        <div v-else class="flex min-h-0 flex-1 flex-col gap-3">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              显示 {{ graphStore.graph.meta.displayedCount }} / {{ graphStore.graph.meta.totalCount }} 人
            </span>
            <div class="flex flex-wrap items-center gap-3">
              <span class="inline-flex items-center gap-1">
                <span class="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
                主角
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                配角
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="inline-block h-4 w-6 border-t-2 border-orange-500" />
                与主角关系
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="inline-block h-4 w-6 border-t border-dashed border-orange-400" />
                旧资料迁移
              </span>
            </div>
            <n-button
              v-if="graphStore.graph.meta.requiresShowAll && !graphStore.showAllCharacters"
              size="tiny"
              @click="graphStore.showAllCharacters = true"
            >
              显示全部
            </n-button>
            <n-button
              v-else-if="graphStore.showAllCharacters"
              size="tiny"
              quaternary
              @click="graphStore.showAllCharacters = false"
            >
              仅显示重要角色
            </n-button>
          </div>
          <div class="min-h-0 flex-1">
            <relation-graph
              ref="graphRef"
              :graph="graphStore.graph"
              @select-character="handleGraphSelect"
              @select-aggregate="handleSelectAggregate"
            />
          </div>
        </div>
      </n-tab-pane>

      <n-tab-pane name="list" tab="气泡卡片">
        <div v-if="characters.length === 0" class="flex flex-1 items-center justify-center py-12">
          <n-empty description="暂无角色" />
        </div>
        <div
          v-else
          class="character-card-grid py-2"
        >
          <character-bubble-card
            v-for="character in characters"
            :key="character.id"
            :character="character"
            :protagonist-id="projectStore.currentProject?.protagonistId"
            :selected="characterStore.selectedCharacterId === character.id"
            @click="openCharacter"
          />
        </div>
      </n-tab-pane>
    </n-tabs>

    <create-character-modal
      :show="showCreateModal"
      :project-id="projectId"
      @close="showCreateModal = false"
      @created="handleCreated"
    />
  </div>
</template>

<style scoped>
.character-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 1rem;
  justify-items: center;
}
</style>
