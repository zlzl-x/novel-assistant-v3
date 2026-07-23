<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NDropdown, NInput, NModal, NSpin, useMessage, type DropdownOption } from 'naive-ui'
import type { Chapter } from '@novel-assistant/core'
import AppIcon from '@/components/common/AppIcon.vue'
import { useChapterDelete } from '@/composables/useChapterDelete'
import { useChapterStore } from '@/stores/chapter'

const emit = defineEmits<{
  select: [chapterId: string]
  deleted: [nextChapterId: string | null]
}>()

const props = defineProps<{
  currentChapterId: string | null
}>()

const chapterStore = useChapterStore()
const message = useMessage()
const { confirmDeleteChapter, confirmDeleteChapterAndAfter } = useChapterDelete((nextChapterId) => {
  emit('deleted', nextChapterId)
})

const draggingId = ref<string | null>(null)
const renameModal = ref(false)
const renameTitle = ref('')
const renamingChapterId = ref<string | null>(null)
const contextChapter = ref<Chapter | null>(null)
const showContextMenu = ref(false)
const contextPosition = ref({ x: 0, y: 0 })
const creating = ref(false)

const contextOptions = computed<DropdownOption[]>(() => [
  { label: '重命名', key: 'rename' },
  { label: '在此章后插入', key: 'insert-after' },
  { type: 'divider', key: 'd1' },
  { label: '删除本章', key: 'delete' },
  { label: '删除本章及之后所有章', key: 'delete-after' }
])

async function handleCreate(): Promise<void> {
  if (creating.value) return
  creating.value = true
  try {
    const chapter = await chapterStore.createChapter()
    emit('select', chapter.id)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '创建失败')
  } finally {
    creating.value = false
  }
}

function openContextMenu(chapter: Chapter, event: MouseEvent): void {
  event.preventDefault()
  contextChapter.value = chapter
  contextPosition.value = { x: event.clientX, y: event.clientY }
  showContextMenu.value = true
}

async function handleContextSelect(key: string): Promise<void> {
  const chapter = contextChapter.value
  showContextMenu.value = false
  if (!chapter) return

  if (key === 'rename') {
    renamingChapterId.value = chapter.id
    renameTitle.value = chapter.title
    renameModal.value = true
    return
  }

  if (key === 'insert-after') {
    try {
      const inserted = await chapterStore.insertAfterChapter(chapter.id)
      emit('select', inserted.id)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '插入失败')
    }
    return
  }

  if (key === 'delete') {
    confirmDeleteChapter(chapter)
    return
  }

  if (key === 'delete-after') {
    confirmDeleteChapterAndAfter(chapter)
  }
}

async function confirmRename(): Promise<void> {
  if (!renamingChapterId.value) return
  try {
    await chapterStore.renameChapter(renamingChapterId.value, renameTitle.value.trim())
    renameModal.value = false
  } catch (error) {
    message.error(error instanceof Error ? error.message : '重命名失败')
  }
}

function onDragStart(chapterId: string, event: DragEvent): void {
  draggingId.value = chapterId
  event.dataTransfer?.setData('text/plain', chapterId)
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
}

async function onDrop(targetId: string): Promise<void> {
  if (!draggingId.value || draggingId.value === targetId) return
  const ids = chapterStore.sortedChapters.map((chapter) => chapter.id)
  const fromIndex = ids.indexOf(draggingId.value)
  const toIndex = ids.indexOf(targetId)
  if (fromIndex < 0 || toIndex < 0) return

  const next = [...ids]
  const [moved] = next.splice(fromIndex, 1)
  if (!moved) return
  next.splice(toIndex, 0, moved)

  try {
    await chapterStore.reorderChapters(next)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '排序失败')
  } finally {
    draggingId.value = null
  }
}
</script>

<template>
  <aside class="chapter-sidebar">
    <div class="chapter-sidebar-header">
      <span class="chapter-sidebar-title">章节</span>
      <n-button
        quaternary
        size="small"
        class="chapter-add-btn"
        title="新建章节"
        :loading="creating"
        @click="handleCreate"
      >
        <span class="inline-flex items-center gap-1">
          <AppIcon name="plus" :size="15" />
          <span class="chapter-add-label">新建</span>
        </span>
      </n-button>
    </div>

    <div class="chapter-scroll">
      <n-spin :show="chapterStore.loading">
        <div v-if="chapterStore.sortedChapters.length === 0" class="chapter-empty">
          <p class="chapter-empty-text">还没有章节</p>
          <n-button type="primary" size="small" :loading="creating" @click="handleCreate">
            新建第一章
          </n-button>
        </div>

        <div v-else class="chapter-list">
          <button
            v-for="chapter in chapterStore.sortedChapters"
            :key="chapter.id"
            type="button"
            draggable="true"
            class="chapter-item"
            :class="{ 'chapter-item--active': currentChapterId === chapter.id }"
            @click="emit('select', chapter.id)"
            @contextmenu="openContextMenu(chapter, $event)"
            @dragstart="onDragStart(chapter.id, $event)"
            @dragover="onDragOver"
            @drop="onDrop(chapter.id)"
          >
            <span class="chapter-item-number">{{ String(chapter.number).padStart(2, '0') }}</span>
            <span class="chapter-item-title">{{ chapter.title || `第${chapter.number}章` }}</span>
            <button
              type="button"
              class="chapter-item-delete"
              title="删除本章"
              aria-label="删除本章"
              @click.stop="confirmDeleteChapter(chapter)"
            >
              <AppIcon name="trash" :size="12" />
            </button>
          </button>
        </div>
      </n-spin>
    </div>

    <n-dropdown
      placement="bottom-start"
      trigger="manual"
      :x="contextPosition.x"
      :y="contextPosition.y"
      :show="showContextMenu"
      :options="contextOptions"
      @clickoutside="showContextMenu = false"
      @select="handleContextSelect"
    />

    <n-modal
      v-model:show="renameModal"
      preset="dialog"
      title="重命名章节"
      positive-text="保存"
      @positive-click="confirmRename"
    >
      <n-input v-model:value="renameTitle" placeholder="章节标题" @keyup.enter="confirmRename" />
    </n-modal>
  </aside>
</template>

<style scoped>
.chapter-sidebar {
  display: flex;
  width: 9.5rem;
  height: 100%;
  min-height: 0;
  flex-shrink: 0;
  flex-direction: column;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
}

.chapter-sidebar-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  border-bottom: 1px solid #e2e8f0;
  padding: 0.5rem 0.5rem 0.45rem;
}

.chapter-sidebar-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}

.chapter-add-btn {
  border-radius: 0.5rem;
}

.chapter-add-label {
  font-size: 0.72rem;
}

.chapter-scroll {
  min-height: 0;
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
}

.chapter-scroll :deep(.n-spin-container) {
  min-height: 100%;
}

.chapter-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.35rem;
}

.chapter-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid transparent;
  border-radius: 0.5rem;
  background: transparent;
  padding: 0.35rem 0.45rem;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease;
}

.chapter-item:hover {
  background: #ffffff;
}

.chapter-item--active {
  border-color: #dbeafe;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.chapter-item-number {
  width: 1.5rem;
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: #64748b;
}

.chapter-item-title {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.78rem;
  line-height: 1.25;
  color: #334155;
}

.chapter-item-delete {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.35rem;
  background: transparent;
  padding: 0.15rem;
  color: #94a3b8;
  opacity: 0;
  cursor: pointer;
  transition:
    opacity 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;
}

.chapter-item:hover .chapter-item-delete,
.chapter-item--active .chapter-item-delete {
  opacity: 1;
}

.chapter-item-delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

.chapter-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 1.25rem 0.75rem;
  text-align: center;
}

.chapter-empty-text {
  margin: 0;
  font-size: 0.78rem;
  color: #94a3b8;
}
</style>
