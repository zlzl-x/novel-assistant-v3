import type { Character, CharacterRole } from '@novel-assistant/core'

export type CharacterSortMode = 'recent' | 'name' | 'importance'

const ROLE_WEIGHT: Record<CharacterRole, number> = {
  protagonist: 0,
  major: 1,
  minor: 2,
  mentioned: 3
}

export function sortCharacters(
  characters: Character[],
  mode: CharacterSortMode,
  protagonistId?: string | null
): Character[] {
  const sorted = [...characters]

  if (mode === 'recent') {
    sorted.sort((left, right) => {
      const leftChapter = left.lastAppearance?.chapterNumber ?? 0
      const rightChapter = right.lastAppearance?.chapterNumber ?? 0
      if (rightChapter !== leftChapter) return rightChapter - leftChapter
      return right.mentionCount - left.mentionCount
    })
    return sorted
  }

  if (mode === 'name') {
    sorted.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
    return sorted
  }

  sorted.sort((left, right) => {
    const leftWeight =
      left.id === protagonistId || left.role === 'protagonist' ? -1 : ROLE_WEIGHT[left.role]
    const rightWeight =
      right.id === protagonistId || right.role === 'protagonist' ? -1 : ROLE_WEIGHT[right.role]
    if (leftWeight !== rightWeight) return leftWeight - rightWeight
    return right.mentionCount - left.mentionCount
  })

  return sorted
}

export function isProtagonist(character: Character, protagonistId?: string | null): boolean {
  return character.id === protagonistId || character.role === 'protagonist'
}

export const FIELD_HISTORY_LABELS = {
  identity: '身份/称号',
  realm: '境界',
  location: '所在地',
  faction: '势力'
} as const

export const HISTORY_PREVIEW_LIMIT = 20
