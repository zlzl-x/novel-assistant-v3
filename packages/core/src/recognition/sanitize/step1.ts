import type { ChapterExtraction, CharacterMention, ExtractedField, Step1Result } from '../../models/recognition'
import type { Step1LlmResponse } from '../schemas/step1'
import { isExcludedPreviewFieldKey } from '../excludedFieldKeys'
import { isNoiseExtraction } from './extractionNoise'
import { normalizeExtractedFields, shouldDropRecognitionEntry } from './fieldNormalization'
import { isPlausibleCharacterName } from './mentionFilter'

function mentionKey(mention: Pick<CharacterMention, 'surfaceForm' | 'inferredName'>): string {
  return `${mention.surfaceForm}::${mention.inferredName ?? ''}`
}

function mergeMentions(existing: CharacterMention, incoming: CharacterMention): CharacterMention {
  const excerpts = [...new Set([...existing.excerpts, ...incoming.excerpts])]
  return {
    surfaceForm: existing.surfaceForm,
    inferredName: existing.inferredName ?? incoming.inferredName,
    mentionCount: Math.max(existing.mentionCount, incoming.mentionCount, excerpts.length),
    excerpts,
    isNickname: existing.isNickname || incoming.isNickname
  }
}

function collectFieldEntries(extraction: ChapterExtraction): Array<{ key: string; field: ExtractedField }> {
  const entries: Array<{ key: string; field: ExtractedField }> = []
  for (const [key, field] of Object.entries(extraction.fields) as Array<[string, ExtractedField]>) {
    entries.push({ key, field })
  }
  for (const entry of extraction.panelEntries ?? []) {
    entries.push({
      key: entry.key,
      field: {
        value: entry.value,
        excerpt: entry.excerpt,
        confidence: 'medium'
      }
    })
  }
  return entries
}

function sanitizeRawFieldEntries(
  entries: Array<{ key: string; field: ExtractedField }>
): Array<{ key: string; field: ExtractedField }> {
  const next: Array<{ key: string; field: ExtractedField }> = []
  for (const { key, field } of entries) {
    const trimmedKey = key.trim()
    const trimmedValue = field.value?.trim() ?? ''
    const trimmedExcerpt = (field.excerpt?.trim() || trimmedValue).trim()
    if (!trimmedKey || !trimmedValue) continue
    if (isExcludedPreviewFieldKey(trimmedKey)) continue
    if (shouldDropRecognitionEntry(trimmedKey, trimmedValue, trimmedExcerpt)) continue
    if (isNoiseExtraction(trimmedKey, trimmedValue, trimmedExcerpt)) continue
    next.push({
      key: trimmedKey,
      field: {
        value: trimmedValue,
        excerpt: trimmedExcerpt,
        confidence: field.confidence
      }
    })
  }
  return next
}

function mergeChapterExtractions(
  left: ChapterExtraction,
  right: ChapterExtraction,
  inferredName = left.inferredName
): ChapterExtraction {
  const normalized = normalizeExtractedFields(
    sanitizeRawFieldEntries([...collectFieldEntries(left), ...collectFieldEntries(right)])
  )
  return {
    inferredName,
    mentionCount: Math.max(left.mentionCount, right.mentionCount),
    fields: normalized.fields,
    panelEntries: normalized.panelEntries,
    relations: [...(left.relations ?? []), ...(right.relations ?? [])],
    protagonistRelation: right.protagonistRelation ?? left.protagonistRelation
  }
}

function sanitizeChapterExtraction(extraction: ChapterExtraction): ChapterExtraction | null {
  const normalized = normalizeExtractedFields(sanitizeRawFieldEntries(collectFieldEntries(extraction)))
  const relations = extraction.relations?.filter(
    (item) =>
      item.excerpt.trim() &&
      item.targetName.trim() &&
      item.type.trim() &&
      !isNoiseExtraction(item.type, item.targetName, item.excerpt)
  )
  const protagonistRelation =
    extraction.protagonistRelation?.excerpt.trim() &&
    !isNoiseExtraction(
      '与主角关系',
      extraction.protagonistRelation.type,
      extraction.protagonistRelation.excerpt
    )
      ? extraction.protagonistRelation
      : undefined

  if (
    Object.keys(normalized.fields).length === 0 &&
    !relations?.length &&
    normalized.panelEntries.length === 0 &&
    !protagonistRelation
  ) {
    return null
  }

  return {
    inferredName: extraction.inferredName.trim(),
    mentionCount: extraction.mentionCount,
    fields: normalized.fields,
    relations,
    protagonistRelation,
    panelEntries: normalized.panelEntries
  }
}

export function sanitizeStep1LlmResponse(response: Step1LlmResponse): Step1LlmResponse {
  const mentionMap = new Map<string, CharacterMention>()
  for (const mention of response.mentions) {
    if (!mention.surfaceForm.trim() || mention.excerpts.length === 0) continue
    if (!isPlausibleCharacterName(mention.surfaceForm)) continue
    if (mention.inferredName && !isPlausibleCharacterName(mention.inferredName)) continue

    const normalized: CharacterMention = {
      surfaceForm: mention.surfaceForm.trim(),
      inferredName: mention.inferredName?.trim() || undefined,
      mentionCount: mention.mentionCount,
      excerpts: mention.excerpts.map((item) => item.trim()).filter(Boolean),
      isNickname: mention.isNickname
    }
    const key = mentionKey(normalized)
    const existing = mentionMap.get(key)
    mentionMap.set(key, existing ? mergeMentions(existing, normalized) : normalized)
  }

  const extractionMap = new Map<string, ChapterExtraction>()
  for (const extraction of response.chapterExtractions) {
    if (!isPlausibleCharacterName(extraction.inferredName)) continue
    const sanitized = sanitizeChapterExtraction(extraction)
    if (!sanitized) continue
    const existing = extractionMap.get(sanitized.inferredName)
    extractionMap.set(
      sanitized.inferredName,
      existing ? mergeChapterExtractions(existing, sanitized) : sanitized
    )
  }

  const aliasToCanonical = new Map<string, string>()
  for (const mention of mentionMap.values()) {
    const canonical = mention.inferredName?.trim() || mention.surfaceForm.trim()
    aliasToCanonical.set(mention.surfaceForm.trim(), canonical)
    if (mention.inferredName?.trim()) {
      aliasToCanonical.set(mention.inferredName.trim(), canonical)
    }
  }

  const canonicalizedMap = new Map<string, ChapterExtraction>()
  for (const [name, extraction] of extractionMap) {
    const canonical = aliasToCanonical.get(name) ?? name
    const existing = canonicalizedMap.get(canonical)
    canonicalizedMap.set(
      canonical,
      existing
        ? mergeChapterExtractions(existing, extraction, canonical)
        : { ...extraction, inferredName: canonical }
    )
  }

  return {
    mentions: [...mentionMap.values()],
    chapterExtractions: [...canonicalizedMap.values()]
  }
}

export function attachChapterId(chapterId: string, response: Step1LlmResponse): Step1Result {
  return {
    chapterId,
    mentions: response.mentions,
    chapterExtractions: response.chapterExtractions,
    unresolvedMentions: [],
    ambiguousNames: []
  }
}
