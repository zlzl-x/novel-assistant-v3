<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import CharacterSidebar from '@/components/layout/CharacterSidebar.vue'
import MainNav from '@/components/layout/MainNav.vue'
import ContentArea from '@/components/layout/ContentArea.vue'
import CharacterDetailDrawer from '@/components/character/CharacterDetailDrawer.vue'
import { useCharacterStore } from '@/stores/character'
import { useProjectStore } from '@/stores/project'

const route = useRoute()
const projectStore = useProjectStore()
const characterStore = useCharacterStore()

async function syncProject(): Promise<void> {
  const projectId = route.params.id
  if (typeof projectId !== 'string') return
  await projectStore.loadProject(projectId)
  await characterStore.loadCharacters(projectId)
}

onMounted(syncProject)
watch(() => route.params.id, syncProject)
</script>

<template>
  <div class="flex h-full min-h-0">
    <CharacterSidebar />
    <MainNav />
    <ContentArea />
    <CharacterDetailDrawer />
  </div>
</template>
