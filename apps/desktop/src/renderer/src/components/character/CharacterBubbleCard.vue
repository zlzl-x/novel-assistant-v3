<script setup lang="ts">
import { computed } from 'vue'
import { NTag } from 'naive-ui'
import type { Character } from '@novel-assistant/core'
import { computeBubbleScale } from '@/utils/characterDisplay'
import { isProtagonist } from '@/utils/character'

const props = withDefaults(
  defineProps<{
    character: Character
    protagonistId?: string | null
    selected?: boolean
    compact?: boolean
    minSize?: number
    maxSize?: number
  }>(),
  {
    protagonistId: null,
    selected: false,
    compact: false,
    minSize: 96,
    maxSize: 168
  }
)

const emit = defineEmits<{
  click: [characterId: string]
}>()

const hero = computed(() => isProtagonist(props.character, props.protagonistId))
const initial = computed(() => props.character.name.trim().slice(0, 1) || '?')

const cardScale = computed(() => {
  const scale = computeBubbleScale(props.character, props.protagonistId)
  return Math.min(1.12, Math.max(0.92, scale))
})

const roleLabel = computed(() => {
  if (hero.value) return '主角'
  if (props.character.role === 'major') return '配角'
  if (props.character.role === 'minor') return '次要'
  return '提及'
})
</script>

<template>
  <button
    type="button"
    class="character-card group"
    :class="[
      selected ? 'character-card--selected' : '',
      hero ? 'character-card--hero' : '',
      compact ? 'character-card--compact' : ''
    ]"
    :style="{ transform: `scale(${cardScale})` }"
    @click="emit('click', character.id)"
  >
    <div class="character-card__avatar" :class="hero ? 'character-card__avatar--hero' : ''">
      <span>{{ initial }}</span>
    </div>

    <div class="character-card__body">
      <div class="character-card__title-row">
        <span class="character-card__name">{{ character.name }}</span>
        <n-tag v-if="hero" size="tiny" type="warning" :bordered="false">主角</n-tag>
      </div>

      <div class="character-card__footer">
        <span class="character-card__role">{{ roleLabel }}</span>
        <span v-if="character.mentionCount > 0" class="character-card__mentions">
          {{ character.mentionCount }} 次
        </span>
      </div>
    </div>
  </button>
</template>

<style scoped>
.character-card {
  display: flex;
  width: 148px;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  border-radius: 1rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%);
  padding: 0.9rem 0.75rem 0.75rem;
  text-align: center;
  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.character-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
}

.character-card--selected {
  border-color: rgba(59, 130, 246, 0.55);
  box-shadow:
    0 0 0 2px rgba(59, 130, 246, 0.15),
    0 14px 28px rgba(37, 99, 235, 0.14);
}

.character-card--hero {
  border-color: rgba(251, 146, 60, 0.45);
  background: linear-gradient(180deg, rgba(255, 251, 235, 0.98) 0%, rgba(255, 247, 237, 0.96) 100%);
}

.character-card--compact {
  width: 120px;
  padding: 0.7rem 0.55rem 0.55rem;
}

.character-card__avatar {
  display: flex;
  height: 3rem;
  width: 3rem;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background: linear-gradient(145deg, #dbeafe 0%, #93c5fd 100%);
  color: #1e3a8a;
  font-size: 1.1rem;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.65);
}

.character-card--compact .character-card__avatar {
  height: 2.4rem;
  width: 2.4rem;
  font-size: 0.95rem;
}

.character-card__avatar--hero {
  background: linear-gradient(145deg, #fdba74 0%, #f97316 100%);
  color: #fff7ed;
}

.character-card__body {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 0.45rem;
}

.character-card__title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.character-card__name {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.9rem;
  font-weight: 600;
  color: #0f172a;
}

.character-card--compact .character-card__name {
  font-size: 0.78rem;
}

.character-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.62rem;
  color: #94a3b8;
}

.character-card__role {
  color: #64748b;
}

.character-card__mentions {
  color: #94a3b8;
}
</style>
