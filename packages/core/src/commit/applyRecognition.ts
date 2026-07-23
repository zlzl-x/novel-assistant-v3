import type { Character } from '../models/character'
import type { Chapter } from '../models/project'
import type { RecognitionCommit } from '../models/recognition'
import type { PreviewRow } from '../models/preview'
import { getCharacterFieldValue } from '../recognition/field-keys'
import type { CharacterRegistryEntry } from '../recognition/matchLocal'
import type {
  GraphCommitData,
  GraphCommitProtagonistRelation,
  GraphCommitRelation
} from '../recognition/preview/collectGraphCommitData'
import {
  applyGraphRelationsToCharacter,
  applyProtagonistRelationToCharacter
} from './applyGraphRelations'
import { applyPreviewRowToCharacter } from './apply-field'

export interface CommitAppearanceInput {
  characterId: string
  mentionCount: number
  excerpt?: string
}

export interface ApplyRecognitionCommitInput {
  chapter: Chapter
  characters: Character[]
  acceptedByCharacter: Record<string, PreviewRow[]>
  appearances: CommitAppearanceInput[]
  modelProfile?: string
  commitId: string
  committedAt: string
  newAliasesByCharacter?: Record<string, string[]>
  relationsByCharacter?: Record<string, GraphCommitRelation[]>
  protagonistRelationsByCharacter?: Record<string, GraphCommitProtagonistRelation>
  characterRegistry?: CharacterRegistryEntry[]
}

export interface ApplyRecognitionCommitResult {
  updatedCharacters: Character[]
  commit: RecognitionCommit
}

function mergeAliases(character: Character, aliases: string[] = []): string[] {
  if (aliases.length === 0) return character.aliases
  return [...new Set([...character.aliases, ...aliases])]
}

function appendAppearance(
  character: Character,
  chapter: Chapter,
  appearance: CommitAppearanceInput,
  committedAt: string
): Character {
  const existing = character.appearances.find((item) => item.chapterId === chapter.id)
  const nextAppearance = {
    chapterId: chapter.id,
    chapterNumber: chapter.number,
    chapterTitle: chapter.title,
    mentionCount: appearance.mentionCount,
    committedAt,
    excerpt: appearance.excerpt
  }

  const appearances = existing
    ? character.appearances.map((item) =>
        item.chapterId === chapter.id ? { ...item, ...nextAppearance } : item
      )
    : [...character.appearances, nextAppearance]

  const firstAppearance =
    character.firstAppearance &&
    character.firstAppearance.chapterNumber <= chapter.number
      ? character.firstAppearance
      : {
          chapterId: chapter.id,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title
        }

  const lastAppearance =
    !character.lastAppearance || character.lastAppearance.chapterNumber <= chapter.number
      ? {
          chapterId: chapter.id,
          chapterNumber: chapter.number,
          chapterTitle: chapter.title
        }
      : character.lastAppearance

  return {
    ...character,
    appearances,
    firstAppearance,
    lastAppearance,
    mentionCount: character.mentionCount + appearance.mentionCount
  }
}

export function applyRecognitionCommit(
  input: ApplyRecognitionCommitInput
): ApplyRecognitionCommitResult {
  const characterMap = new Map(input.characters.map((character) => [character.id, character]))
  const acceptedFields: RecognitionCommit['acceptedFields'] = []
  const updatedIds = new Set<string>()

  for (const [characterId, rows] of Object.entries(input.acceptedByCharacter)) {
    const existing = characterMap.get(characterId)
    if (!existing) continue

    let nextCharacter = existing
    for (const row of rows) {
      if (!row.checked) continue
      const oldValue = getCharacterFieldValue(existing, row.name) ?? ''
      if (oldValue === row.proposedValue) continue

      nextCharacter = applyPreviewRowToCharacter(nextCharacter, row, input.chapter, input.committedAt)
      acceptedFields.push({
        characterId,
        fieldKey: row.name,
        oldValue,
        newValue: row.proposedValue
      })
      updatedIds.add(characterId)
    }

    const aliases = mergeAliases(nextCharacter, input.newAliasesByCharacter?.[characterId])
    if (aliases !== nextCharacter.aliases) {
      nextCharacter = { ...nextCharacter, aliases }
      updatedIds.add(characterId)
    }

    characterMap.set(characterId, nextCharacter)
  }

  for (const appearance of input.appearances) {
    const existing = characterMap.get(appearance.characterId)
    if (!existing) continue
    characterMap.set(
      appearance.characterId,
      appendAppearance(existing, input.chapter, appearance, input.committedAt)
    )
    updatedIds.add(appearance.characterId)
  }

  for (const [characterId, aliases] of Object.entries(input.newAliasesByCharacter ?? {})) {
    const existing = characterMap.get(characterId)
    if (!existing || aliases.length === 0) continue
    const merged = mergeAliases(existing, aliases)
    if (merged !== existing.aliases) {
      characterMap.set(characterId, { ...existing, aliases: merged })
      updatedIds.add(characterId)
    }
  }

  const registry =
    input.characterRegistry ??
    input.characters.map((character) => ({
      id: character.id,
      name: character.name,
      aliases: character.aliases
    }))

  for (const [characterId, relations] of Object.entries(input.relationsByCharacter ?? {})) {
    const existing = characterMap.get(characterId)
    if (!existing || relations.length === 0) continue
    const next = applyGraphRelationsToCharacter(existing, relations, registry, input.chapter)
    if (next !== existing) {
      characterMap.set(characterId, next)
      updatedIds.add(characterId)
    }
  }

  for (const [characterId, relation] of Object.entries(input.protagonistRelationsByCharacter ?? {})) {
    const existing = characterMap.get(characterId)
    if (!existing) continue
    const next = applyProtagonistRelationToCharacter(existing, relation)
    if (next.protagonistRelation !== existing.protagonistRelation) {
      characterMap.set(characterId, next)
      updatedIds.add(characterId)
    }
  }

  const updatedCharacters = input.characters.map((character) => characterMap.get(character.id) ?? character)

  return {
    updatedCharacters: updatedCharacters.filter((character) => updatedIds.has(character.id)),
    commit: {
      id: input.commitId,
      chapterId: input.chapter.id,
      chapterNumber: input.chapter.number,
      committedAt: input.committedAt,
      acceptedFields,
      appearances: input.appearances.map((appearance) => ({
        characterId: appearance.characterId,
        mentionCount: appearance.mentionCount
      })),
      modelProfile: input.modelProfile ?? ''
    }
  }
}

export function validateCommitInput(input: {
  isLatestChapter: boolean
  ambiguousCount: number
  acceptedByCharacter: Record<string, PreviewRow[]>
  previewCharacterCount?: number
  appearanceCount?: number
}): string | null {
  if (!input.isLatestChapter) {
    return '仅最新章可更新角色库。请删除后续章节后重新识别。'
  }
  if (input.ambiguousCount > 0) {
    return '存在未裁决的同名歧义，无法提交'
  }
  const checkedCount = Object.values(input.acceptedByCharacter)
    .flat()
    .filter((row) => row.checked).length
  const characterCount = input.previewCharacterCount ?? 0
  const appearanceCount = input.appearanceCount ?? 0
  if (checkedCount === 0 && characterCount === 0 && appearanceCount === 0) {
    return '请至少确认一个角色或勾选一行要更新的字段'
  }
  return null
}
