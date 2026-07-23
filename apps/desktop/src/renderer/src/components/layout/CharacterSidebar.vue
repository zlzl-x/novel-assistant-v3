<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSelect, NSpin, NTag, NText } from 'naive-ui'
import AppIcon from '@/components/common/AppIcon.vue'
import SearchInput from '@/components/common/SearchInput.vue'
import { useAppStore } from '@/stores/app'
import { useCharacterStore } from '@/stores/character'
import { useGraphStore } from '@/stores/graph'
import { useProjectStore } from '@/stores/project'
import { isProtagonist, type CharacterSortMode } from '@/utils/character'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const characterStore = useCharacterStore()
const graphStore = useGraphStore()
const projectStore = useProjectStore()

const sidebarWidth = computed(() => (appStore.sidebarCollapsed ? '40px' : '200px'))

const sortOptions = [
  { label: '最近出场', value: 'recent' },
  { label: '名称', value: 'name' },
  { label: '重要度', value: 'importance' }
]

function handleSearch(value: string): void {
  characterStore.setSearchQuery(value)
}

function handleCharacterClick(characterId: string): void {
  characterStore.selectCharacter(characterId)

  if (route.meta.nav === 'manuscript') {
    characterStore.openDetail(characterId)
    return
  }

  if (route.meta.nav === 'characters') {
    graphStore.focusCharacter(characterId)
    characterStore.openDetail(characterId)
    return
  }

  const projectId = String(route.params.id ?? '')
  router.push({ name: 'characters', params: { id: projectId } })
  characterStore.openDetail(characterId)
}

function isSelected(characterId: string): boolean {
  return characterStore.selectedCharacterId === characterId
}

function showProtagonistBadge(characterId: string, role: string): boolean {
  const character = characterStore.characters.find((item) => item.id === characterId)
  if (!character) return false
  return isProtagonist(character, projectStore.currentProject?.protagonistId)
}
</script>

<template>
  <aside
    class="flex shrink-0 flex-col border-r border-slate-200 bg-white transition-[width] duration-200"
    :style="{ width: sidebarWidth }"
  >
    <div class="flex h-10 items-center justify-between border-b border-slate-100 px-2">
      <n-button
        v-if="appStore.sidebarCollapsed"
        quaternary
        size="tiny"
        title="展开角色栏"
        @click="appStore.toggleSidebar()"
      >
        <AppIcon name="search" :size="16" />
      </n-button>
      <template v-else>
        <n-text strong class="text-xs text-slate-500">角色</n-text>
        <n-button quaternary size="tiny" title="折叠角色栏" @click="appStore.toggleSidebar()">⟨</n-button>
      </template>
    </div>

    <div v-if="!appStore.sidebarCollapsed" class="flex min-h-0 flex-1 flex-col p-2">
      <SearchInput
        :value="characterStore.searchQuery"
        placeholder="搜索角色"
        @update:value="handleSearch"
      />
      <n-select
        class="mt-2"
        size="small"
        :value="characterStore.sortMode"
        :options="sortOptions"
        @update:value="(value: CharacterSortMode) => characterStore.setSortMode(value)"
      />

      <n-spin :show="characterStore.loading || characterStore.searching" class="mt-3 min-h-0 flex-1">
        <div class="min-h-0 flex-1 space-y-2 overflow-y-auto">
          <button
            v-for="character in characterStore.displayCharacters"
            :key="character.id"
            type="button"
            class="w-full rounded-2xl border px-2.5 py-2 text-left transition hover:-translate-y-px hover:shadow-sm"
            :class="[
              isSelected(character.id)
                ? 'border-blue-300 bg-blue-50/80 shadow-sm'
                : 'border-slate-200/80 bg-gradient-to-br from-white to-slate-50',
              isProtagonist(character, projectStore.currentProject?.protagonistId)
                ? 'from-amber-50/80 to-orange-50/50'
                : ''
            ]"
            @click="handleCharacterClick(character.id)"
          >
            <div class="flex items-center gap-1">
              <span class="truncate text-sm font-medium text-slate-800">{{ character.name }}</span>
              <n-tag
                v-if="showProtagonistBadge(character.id, character.role)"
                size="tiny"
                type="warning"
                :bordered="false"
              >
                主角
              </n-tag>
            </div>
          </button>
          <n-text
            v-if="characterStore.displayCharacters.length === 0"
            depth="3"
            class="block px-2 py-4 text-center text-xs"
          >
            {{ characterStore.searchQuery ? '无匹配角色' : '暂无角色，识别或新建后将出现在此' }}
          </n-text>
        </div>
      </n-spin>

      <n-text depth="3" class="mt-2 text-center text-xs">
        共 {{ characterStore.characters.length }} 人
        <span v-if="characterStore.searchResults"> · 显示 {{ characterStore.displayCharacters.length }}</span>
      </n-text>
    </div>
  </aside>
</template>
