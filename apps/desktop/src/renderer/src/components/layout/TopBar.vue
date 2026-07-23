<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NDropdown, useMessage } from 'naive-ui'
import AppIcon from '@/components/common/AppIcon.vue'
import { useAppStore } from '@/stores/app'
import { useProjectStore } from '@/stores/project'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const appStore = useAppStore()
const projectStore = useProjectStore()

const isWorkspace = computed(() => route.path.startsWith('/project/'))
const projectTitle = computed(() => projectStore.currentProject?.title ?? '未命名作品')
const projectId = computed(() => {
  const id = route.params.id
  return typeof id === 'string' ? id : null
})

const storageLabel = computed(() => {
  if (!appStore.storagePath) return '选择存储目录'
  const parts = appStore.storagePath.split(/[/\\]/)
  return parts[parts.length - 1] || appStore.storagePath
})

const exportOptions = computed(() => {
  const options = [{ label: '导出全部数据 (.nav3)', key: 'all' }]
  if (projectId.value) {
    options.unshift({ label: '导出当前作品', key: 'project' })
  }
  return options
})

async function handlePickDirectory(): Promise<void> {
  try {
    const changed = await appStore.pickStorageDirectory()
    if (!changed) return
    projectStore.reset()
    await projectStore.loadProjects()
    if (route.path.startsWith('/project/')) {
      await router.push('/')
    }
    message.success('存储目录已更新，作品列表已重新加载')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '切换目录失败')
  }
}

async function handleExport(key: string): Promise<void> {
  try {
    if (key === 'project') {
      if (!projectId.value) return
      const result = await window.novelApi.export.project({ projectId: projectId.value })
      if (!result.success || !result.data) {
        throw new Error(result.error ?? '导出作品失败')
      }
      message.success(`作品备份已保存：${result.data.filePath}`)
      return
    }

    const result = await window.novelApi.export.all()
    if (!result.success || !result.data) {
      throw new Error(result.error ?? '导出全部数据失败')
    }
    message.success(`全部数据已保存：${result.data.filePath}`)
  } catch (error) {
    const text = error instanceof Error ? error.message : '导出失败'
    if (text.includes('已取消')) return
    message.error(text)
  }
}

function goHome(): void {
  router.push('/')
}

function goAppSettings(): void {
  router.push('/app-settings')
}
</script>

<template>
  <header class="top-bar">
    <div class="top-bar-left">
      <button type="button" class="top-bar-brand" @click="goHome">
        <span class="top-bar-brand-icon">
          <AppIcon name="book" :size="18" />
        </span>
        <span>小说创作助手</span>
      </button>

      <n-dropdown
        trigger="click"
        :options="[{ label: '更改目录…', key: 'pick' }]"
        @select="handlePickDirectory"
      >
        <n-button quaternary size="small" class="top-bar-storage">
          <span class="inline-flex max-w-[220px] items-center gap-1.5 truncate">
            <AppIcon name="folder" :size="16" />
            {{ storageLabel }}
          </span>
        </n-button>
      </n-dropdown>

      <span v-if="isWorkspace" class="top-bar-breadcrumb">/ {{ projectTitle }}</span>
    </div>

    <div class="top-bar-right">
      <n-dropdown trigger="click" :options="exportOptions" @select="handleExport">
        <n-button quaternary size="small">
          <span class="inline-flex items-center gap-1.5">
            <AppIcon name="download" :size="16" />
            导出备份
          </span>
        </n-button>
      </n-dropdown>
      <n-button quaternary size="small" @click="goAppSettings">
        <span class="inline-flex items-center gap-1.5">
          <AppIcon name="settings" :size="16" />
          设置
        </span>
      </n-button>
    </div>
  </header>
</template>

<style scoped>
.top-bar {
  display: flex;
  height: 3.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e2e8f0;
  background: rgba(255, 255, 255, 0.92);
  padding: 0 1.25rem;
  backdrop-filter: blur(10px);
}

.top-bar-left,
.top-bar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.top-bar-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: none;
  background: transparent;
  font-size: 0.98rem;
  font-weight: 650;
  color: #0f172a;
  cursor: pointer;
}

.top-bar-brand:hover {
  color: #2563eb;
}

.top-bar-brand-icon {
  display: inline-flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.65rem;
  background: #eff6ff;
  color: #2563eb;
}

.top-bar-storage {
  border-radius: 0.75rem;
}

.top-bar-breadcrumb {
  font-size: 0.88rem;
  color: #94a3b8;
}
</style>
