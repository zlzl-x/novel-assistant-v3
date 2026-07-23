import type { Character } from '../../models/character'
import type { ChapterExtraction, Step1Result } from '../../models/recognition'
import type { PreviewRow } from '../../models/preview'
import type { CharacterPreviewMeta } from '../../models/recognition'
import { getCharacterFieldValue } from '../field-keys'
import { resolveCharacterIdForLabel, type CharacterRegistryEntry } from '../matchLocal'
import { normalizeExtractedFields, shouldDropRecognitionEntry } from '../sanitize/fieldNormalization'

export const PENDING_CHARACTER_PREFIX = 'pending::'

export function toPendingCharacterKey(name: string): string {
  return `${PENDING_CHARACTER_PREFIX}${name.trim()}`
}

export function isPendingCharacterKey(key: string): boolean {
  return key.startsWith(PENDING_CHARACTER_PREFIX)
}

export function pendingCharacterNameFromKey(key: string): string {
  return key.slice(PENDING_CHARACTER_PREFIX.length)
}


function collectExtractionRows(
  extraction: ChapterExtraction,
  character?: Character | null
): PreviewRow[] {
  const entries = [
    ...Object.entries(extraction.fields).map(([key, field]) => ({ key, field })),
    ...(extraction.panelEntries ?? []).map((entry) => ({
      key: entry.key,
      field: {
        value: entry.value,
        excerpt: entry.excerpt,
        confidence: 'medium' as const
      }
    }))
  ]
  const normalized = normalizeExtractedFields(entries)
  const rows: PreviewRow[] = []

  for (const [name, field] of Object.entries(normalized.fields)) {
    if (shouldDropRecognitionEntry(name, field.value, field.excerpt)) continue
    const existingValue = character ? getCharacterFieldValue(character, name) : null
    rows.push({
      name,
      existingValue,
      proposedValue: field.value,
      changed: (existingValue ?? '') !== field.value,
      checked: true,
      excerpt: field.excerpt
    })
  }

  for (const entry of normalized.panelEntries) {
    if (shouldDropRecognitionEntry(entry.key, entry.value, entry.excerpt)) continue
    const existingValue = character ? getCharacterFieldValue(character, entry.key) : null
    rows.push({
      name: entry.key,
      existingValue,
      proposedValue: entry.value,
      changed: (existingValue ?? '') !== entry.value,
      checked: true,
      excerpt: entry.excerpt
    })
  }

  return rows
}

export function buildPreviewRowsFromChapterExtraction(
  extraction: ChapterExtraction,
  character?: Character | null
): PreviewRow[] {
  return collectExtractionRows(extraction, character)
}

function inferDefaultRoleTier(mentionCount: number, maxMentionCount: number): CharacterPreviewMeta['roleTier'] {
  if (mentionCount >= maxMentionCount && maxMentionCount > 0) {
    return 'supporting'
  }
  if (mentionCount <= 1) {
    return 'extra'
  }
  return 'supporting'
}

export interface BuildPreviewFromStep1Result {
  previewRowsByCharacter: Record<string, PreviewRow[]>
  characterPreviewMeta: Record<string, CharacterPreviewMeta>
  protagonistPreviewKey: string | null
}

function mergeChapterExtractions(
  extractions: ChapterExtraction[]
): ChapterExtraction {
  const [first, ...rest] = extractions
  if (!first) {
    return { inferredName: '', mentionCount: 1, fields: {} }
  }

  return rest.reduce<ChapterExtraction>(
    (merged, extraction) => ({
      inferredName: merged.inferredName,
      mentionCount: Math.max(merged.mentionCount, extraction.mentionCount),
      fields: { ...merged.fields, ...extraction.fields },
      panelEntries: [...(merged.panelEntries ?? []), ...(extraction.panelEntries ?? [])],
      relations: [...(merged.relations ?? []), ...(extraction.relations ?? [])],
      protagonistRelation: extraction.protagonistRelation ?? merged.protagonistRelation
    }),
    { ...first }
  )
}

export function buildPreviewFromStep1(
  step1: Step1Result,
  registry: CharacterRegistryEntry[],
  characters: Character[] = []
): BuildPreviewFromStep1Result {
  const characterById = new Map(characters.map((character) => [character.id, character]))
  const previewRowsByCharacter: Record<string, PreviewRow[]> = {}
  const characterPreviewMeta: Record<string, CharacterPreviewMeta> = {}
  const extractionsByKey = new Map<string, ChapterExtraction[]>()

  for (const extraction of step1.chapterExtractions) {
    const matchedId = resolveCharacterIdForLabel(extraction.inferredName, registry)
    const key = matchedId ?? toPendingCharacterKey(extraction.inferredName)
    extractionsByKey.set(key, [...(extractionsByKey.get(key) ?? []), extraction])
  }

  const maxMentionCount = step1.chapterExtractions.reduce(
    (max, extraction) => Math.max(max, extraction.mentionCount),
    0
  )

  let protagonistPreviewKey: string | null = null
  let protagonistMentions = 0

  for (const [key, extractions] of extractionsByKey) {
    const merged = mergeChapterExtractions(extractions)
    const matchedId = isPendingCharacterKey(key) ? null : key
    const character = matchedId ? characterById.get(matchedId) ?? null : null

    previewRowsByCharacter[key] = buildPreviewRowsFromChapterExtraction(merged, character)
    characterPreviewMeta[key] = {
      name: merged.inferredName,
      mentionCount: merged.mentionCount,
      roleTier: inferDefaultRoleTier(merged.mentionCount, maxMentionCount),
      isPending: !matchedId,
      relationCount: merged.relations?.length ?? 0
    }

    if (merged.mentionCount > protagonistMentions) {
      protagonistMentions = merged.mentionCount
      protagonistPreviewKey = key
    }
  }

  if (protagonistPreviewKey && characterPreviewMeta[protagonistPreviewKey]) {
    characterPreviewMeta[protagonistPreviewKey] = {
      ...characterPreviewMeta[protagonistPreviewKey]!,
      roleTier: 'protagonist'
    }
  }

  return {
    previewRowsByCharacter,
    characterPreviewMeta,
    protagonistPreviewKey
  }
}
