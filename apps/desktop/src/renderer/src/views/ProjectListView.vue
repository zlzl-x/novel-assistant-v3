<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NInput, NModal, NSpin, useMessage } from 'naive-ui'
import AppIcon from '@/components/common/AppIcon.vue'
import { useProjectStore } from '@/stores/project'

const router = useRouter()
const message = useMessage()
const projectStore = useProjectStore()

const showCreateModal = ref(false)
const newTitle = ref('')
const creating = ref(false)

onMounted(async () => {
  await projectStore.loadProjects()
})

function openCreateModal(): void {
  newTitle.value = ''
  showCreateModal.value = true
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function createProject(): Promise<boolean> {
  const title = newTitle.value.trim()
  if (!title) {
    message.warning('请输入作品名称')
    return false
  }

  creating.value = true
  try {
    const project = await projectStore.createProject(title)
    showCreateModal.value = false
    await router.push(`/project/${project.id}/manuscript`)
    return true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建失败')
    return false
  } finally {
    creating.value = false
  }
}

function openProject(projectId: string): void {
  router.push(`/project/${projectId}/manuscript`)
}
</script>

<template>
  <div class="home-page">
    <n-spin :show="projectStore.loading" class="h-full w-full">
      <div class="home-container">
        <header class="home-header">
          <div class="home-intro">
            <div class="home-logo">
              <AppIcon name="book" :size="28" />
            </div>
            <div>
              <h1 class="home-title">我的作品</h1>
              <p class="home-subtitle">选择作品继续创作，或开启新的故事篇章</p>
            </div>
          </div>
          <n-button type="primary" size="large" class="home-create-btn" @click="openCreateModal">
            <span class="inline-flex items-center gap-2">
              <AppIcon name="plus" :size="18" />
              新建作品
            </span>
          </n-button>
        </header>

        <section v-if="projectStore.projects.length === 0" class="home-empty">
          <div class="home-empty-icon">
            <AppIcon name="sparkles" :size="36" />
          </div>
          <h2 class="home-empty-title">还没有作品</h2>
          <p class="home-empty-text">创建第一部作品，开始整理章节、角色与设定。</p>
          <n-button type="primary" size="large" class="mt-6" @click="openCreateModal">
            创建第一部作品
          </n-button>
        </section>

        <section v-else class="project-grid">
          <button
            v-for="project in projectStore.projects"
            :key="project.id"
            type="button"
            class="project-card"
            @click="openProject(project.id)"
          >
            <div class="project-card-icon">
              <AppIcon name="book" :size="22" />
            </div>
            <div class="project-card-body">
              <h3 class="project-card-title">{{ project.title }}</h3>
              <p class="project-card-meta">
                <span class="project-badge">
                  {{ project.networkMode === 'ensemble' ? '群像模式' : '单主角' }}
                </span>
                <span>更新于 {{ formatUpdatedAt(project.updatedAt) }}</span>
              </p>
            </div>
            <div class="project-card-action">
              <AppIcon name="chevron-right" :size="20" />
            </div>
          </button>
        </section>
      </div>
    </n-spin>

    <n-modal
      v-model:show="showCreateModal"
      preset="card"
      title="新建作品"
      class="create-modal"
      :style="{ width: 'min(440px, 92vw)' }"
      :bordered="false"
      :segmented="{ content: true, footer: 'soft' }"
    >
      <p class="mb-4 text-sm leading-6 text-slate-500">为作品取一个名字，之后可在设定页补充世界观与大纲。</p>
      <n-input
        v-model:value="newTitle"
        placeholder="例如：剑与黎明"
        maxlength="80"
        show-count
        size="large"
        :disabled="creating"
        @keyup.enter="createProject"
      />
      <template #footer>
        <div class="flex justify-end gap-3">
          <n-button :disabled="creating" @click="showCreateModal = false">取消</n-button>
          <n-button type="primary" :loading="creating" @click="createProject">创建并进入</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100%;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.08), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.06), transparent 24%),
    #f8fafc;
}

.home-container {
  margin: 0 auto;
  max-width: 1080px;
  padding: 3rem 2.5rem 4rem;
}

.home-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.home-intro {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.home-logo {
  display: flex;
  height: 3.5rem;
  width: 3.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 1rem;
  background: linear-gradient(135deg, #eff6ff, #dbeafe);
  color: #2563eb;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.home-title {
  margin: 0;
  font-size: 1.875rem;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: #0f172a;
}

.home-subtitle {
  margin: 0.5rem 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: #64748b;
}

.home-create-btn {
  border-radius: 0.875rem;
  padding-inline: 1.25rem;
}

.home-empty {
  display: flex;
  min-height: 420px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px dashed #cbd5e1;
  border-radius: 1.5rem;
  background: rgba(255, 255, 255, 0.72);
  padding: 3rem 2rem;
  text-align: center;
}

.home-empty-icon {
  display: flex;
  height: 4.5rem;
  width: 4.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: #eff6ff;
  color: #3b82f6;
}

.home-empty-title {
  margin: 1.25rem 0 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  color: #0f172a;
}

.home-empty-text {
  margin: 0;
  max-width: 28rem;
  font-size: 0.95rem;
  line-height: 1.7;
  color: #64748b;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.project-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 1.125rem;
  background: rgba(255, 255, 255, 0.92);
  padding: 1.25rem 1.25rem 1.25rem 1rem;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.project-card:hover {
  border-color: #bfdbfe;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.project-card-icon {
  display: flex;
  height: 3rem;
  width: 3rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.875rem;
  background: #f8fafc;
  color: #475569;
}

.project-card-body {
  min-width: 0;
  flex: 1;
}

.project-card-title {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 1.05rem;
  font-weight: 600;
  color: #0f172a;
}

.project-card-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  margin: 0.45rem 0 0;
  font-size: 0.82rem;
  color: #94a3b8;
}

.project-badge {
  border-radius: 9999px;
  background: #f1f5f9;
  padding: 0.15rem 0.55rem;
  color: #64748b;
}

.project-card-action {
  flex-shrink: 0;
  color: #cbd5e1;
  transition: color 0.2s ease;
}

.project-card:hover .project-card-action {
  color: #3b82f6;
}

@media (max-width: 768px) {
  .home-container {
    padding: 2rem 1.25rem 3rem;
  }

  .home-header {
    flex-direction: column;
    align-items: stretch;
  }

  .home-create-btn {
    width: 100%;
  }
}
</style>
