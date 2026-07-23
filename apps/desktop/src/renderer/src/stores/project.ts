import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { Project, UpdateProjectInput } from '@novel-assistant/core'

export const useProjectStore = defineStore('project', () => {
  const projects = ref<Project[]>([])
  const currentProjectId = ref<string | null>(null)
  const loading = ref(false)

  const currentProject = computed(() =>
    projects.value.find((project) => project.id === currentProjectId.value) ?? null
  )

  async function loadProjects(): Promise<void> {
    loading.value = true
    try {
      const result = await window.novelApi.projects.list()
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '加载作品列表失败')
      }
      projects.value = result.data
    } finally {
      loading.value = false
    }
  }

  async function loadProject(projectId: string): Promise<Project | null> {
    currentProjectId.value = projectId
    if (projects.value.length === 0) {
      await loadProjects()
    }
    return currentProject.value
  }

  async function createProject(title: string): Promise<Project> {
    const result = await window.novelApi.projects.create({ title })
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '创建作品失败')
    }
    projects.value = [result.data, ...projects.value]
    currentProjectId.value = result.data.id
    return result.data
  }

  async function updateProject(input: UpdateProjectInput): Promise<Project> {
    const result = await window.novelApi.projects.update(input)
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '更新作品失败')
    }
    projects.value = projects.value.map((project) =>
      project.id === result.data!.id ? result.data! : project
    )
    return result.data
  }

  function reset(): void {
    currentProjectId.value = null
    projects.value = []
  }

  return {
    projects,
    currentProjectId,
    currentProject,
    loading,
    loadProjects,
    loadProject,
    createProject,
    updateProject,
    reset
  }
})
