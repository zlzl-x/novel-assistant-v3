import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { toVisNetwork } from '@novel-assistant/core'
import { useCharacterStore } from '@/stores/character'
import { useProjectStore } from '@/stores/project'

export const useGraphStore = defineStore('graph', () => {
  const characterStore = useCharacterStore()
  const projectStore = useProjectStore()

  const showAllCharacters = ref(false)
  const graphVersion = ref(0)
  const pendingFocusId = ref<string | null>(null)
  let graphComponent: { focusNode: (id: string) => void } | null = null

  const graph = computed(() => {
    void graphVersion.value
    return toVisNetwork({
      characters: characterStore.characters,
      protagonistId: projectStore.currentProject?.protagonistId,
      networkMode: projectStore.currentProject?.networkMode ?? 'single',
      showAll: showAllCharacters.value
    })
  })

  function registerGraphComponent(component: { focusNode: (id: string) => void } | null): void {
    graphComponent = component
    if (pendingFocusId.value && component) {
      component.focusNode(pendingFocusId.value)
      pendingFocusId.value = null
    }
  }

  function refresh(): void {
    graphVersion.value += 1
  }

  function focusCharacter(characterId: string): void {
    if (graphComponent) {
      graphComponent.focusNode(characterId)
      return
    }
    pendingFocusId.value = characterId
  }

  function reset(): void {
    showAllCharacters.value = false
    graphVersion.value = 0
    pendingFocusId.value = null
    graphComponent = null
  }

  return {
    showAllCharacters,
    graph,
    refresh,
    focusCharacter,
    registerGraphComponent,
    reset
  }
})
