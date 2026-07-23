import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Character, CharacterRole } from '@novel-assistant/core'
import { sortCharacters, type CharacterSortMode } from '@/utils/character'
import { cloneForIpc } from '@/utils/ipc'
import { useProjectStore } from '@/stores/project'

let searchTimer: ReturnType<typeof setTimeout> | null = null

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<Character[]>([])
  const searchQuery = ref('')
  const searchResults = ref<Character[] | null>(null)
  const searching = ref(false)
  const selectedCharacterId = ref<string | null>(null)
  const detailDrawerOpen = ref(false)
  const sortMode = ref<CharacterSortMode>('recent')
  const loading = ref(false)
  const projectId = ref<string | null>(null)

  const byProject = computed(() => characters.value)

  const sortedCharacters = computed(() =>
    sortCharacters(characters.value, sortMode.value)
  )

  const displayCharacters = computed(() => {
    const source = searchResults.value ?? sortedCharacters.value
    return source
  })

  const selectedCharacter = computed(
    () => characters.value.find((character) => character.id === selectedCharacterId.value) ?? null
  )

  async function loadCharacters(nextProjectId: string): Promise<void> {
    projectId.value = nextProjectId
    loading.value = true
    try {
      const result = await window.novelApi.characters.list(nextProjectId)
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '加载角色失败')
      }
      characters.value = result.data
      searchResults.value = null
    } finally {
      loading.value = false
    }
  }

  async function refreshCharacter(characterId: string): Promise<Character | null> {
    const result = await window.novelApi.characters.get(characterId)
    if (!result.success || !result.data) return null
    upsertCharacters([result.data])
    return result.data
  }

  async function performSearch(query: string): Promise<void> {
    if (!projectId.value) return
    const trimmed = query.trim()
    if (!trimmed) {
      searchResults.value = null
      return
    }

    searching.value = true
    try {
      const result = await window.novelApi.characters.search({
        projectId: projectId.value,
        query: trimmed,
        limit: 50
      })
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '搜索角色失败')
      }
      searchResults.value = sortCharacters(result.data, sortMode.value)
    } finally {
      searching.value = false
    }
  }

  function setSearchQuery(query: string): void {
    searchQuery.value = query
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      void performSearch(query)
    }, 150)
  }

  function setSortMode(mode: CharacterSortMode): void {
    sortMode.value = mode
    if (searchResults.value) {
      searchResults.value = sortCharacters(searchResults.value, mode)
    }
  }

  function openDetail(characterId: string): void {
    selectedCharacterId.value = characterId
    detailDrawerOpen.value = true
  }

  function closeDetail(): void {
    detailDrawerOpen.value = false
  }

  function selectCharacter(characterId: string): void {
    selectedCharacterId.value = characterId
  }

  async function createCharacter(input: {
    projectId: string
    name: string
    disambiguation?: string
    aliases?: string[]
    role?: CharacterRole
  }): Promise<Character> {
    const trimmedName = input.name.trim()
    if (!trimmedName) {
      throw new Error('角色名不能为空')
    }

    const result = await window.novelApi.characters.create(cloneForIpc({ ...input, name: trimmedName }))
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '创建角色失败')
    }
    characters.value = [...characters.value, result.data]
    return result.data
  }

  async function updateCharacter(input: Parameters<typeof window.novelApi.characters.update>[0]): Promise<Character> {
    const result = await window.novelApi.characters.update(cloneForIpc(input))
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '更新角色失败')
    }
    upsertCharacters([result.data])
    return result.data
  }

  async function mergeCharacters(primaryId: string, secondaryId: string): Promise<Character> {
    const result = await window.novelApi.characters.merge({ primaryId, secondaryId })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '合并角色失败')
    }

    characters.value = characters.value
      .filter((character) => character.id !== secondaryId)
      .map((character) => (character.id === primaryId ? result.data! : character))

    if (searchResults.value) {
      searchResults.value = searchResults.value
        .filter((character) => character.id !== secondaryId)
        .map((character) => (character.id === primaryId ? result.data! : character))
    }

    if (selectedCharacterId.value === secondaryId) {
      selectedCharacterId.value = primaryId
    }

    return result.data
  }

  async function deleteCharacter(characterId: string): Promise<void> {
    const projectStore = useProjectStore()
    const wasProtagonist = projectStore.currentProject?.protagonistId === characterId

    const result = await window.novelApi.characters.delete(characterId)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '删除角色失败')
    }

    characters.value = characters.value.filter((character) => character.id !== characterId)
    if (searchResults.value) {
      searchResults.value = searchResults.value.filter((character) => character.id !== characterId)
    }
    if (selectedCharacterId.value === characterId) {
      selectedCharacterId.value = null
      detailDrawerOpen.value = false
    }

    if (wasProtagonist && projectStore.currentProject) {
      await projectStore.updateProject({
        id: projectStore.currentProject.id,
        protagonistId: null
      })
    }
  }

  function upsertCharacters(updated: Character[]): void {
    if (updated.length === 0) return
    const map = new Map(characters.value.map((character) => [character.id, character]))
    for (const character of updated) {
      map.set(character.id, character)
    }
    characters.value = [...map.values()]
  }

  function reset(): void {
    characters.value = []
    searchQuery.value = ''
    searchResults.value = null
    selectedCharacterId.value = null
    detailDrawerOpen.value = false
    sortMode.value = 'recent'
    projectId.value = null
    if (searchTimer) {
      clearTimeout(searchTimer)
      searchTimer = null
    }
  }

  return {
    characters,
    byProject,
    searchQuery,
    searchResults,
    searching,
    selectedCharacterId,
    selectedCharacter,
    detailDrawerOpen,
    sortMode,
    loading,
    projectId,
    sortedCharacters,
    displayCharacters,
    loadCharacters,
    refreshCharacter,
    setSearchQuery,
    setSortMode,
    openDetail,
    closeDetail,
    selectCharacter,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    mergeCharacters,
    upsertCharacters,
    reset
  }
})
