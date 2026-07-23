import type { Character } from '../../models/character'
import type { CharacterExtraction } from '../../models/recognition-step2'
import type { CharacterExtractionLlmResponse } from '../schemas/step2'
import { isExcludedPreviewFieldKey } from '../excludedFieldKeys'
import { isNoiseExtraction } from './extractionNoise'
import { normalizeExtractedFields, shouldDropRecognitionEntry } from './fieldNormalization'
import type { ExtractedField } from '../../models/recognition'

function collectResponseEntries(
  response: CharacterExtractionLlmResponse
): Array<{ key: string; field: ExtractedField }> {
  const entries: Array<{ key: string; field: ExtractedField }> = []
  for (const [key, field] of Object.entries(response.fields ?? {})) {
    const value = field.value?.trim() ?? ''
    const excerpt = (field.excerpt?.trim() || value).trim()
    if (!value || !excerpt) continue
    if (isExcludedPreviewFieldKey(key)) continue
    if (shouldDropRecognitionEntry(key, value, excerpt)) continue
    if (isNoiseExtraction(key, value, excerpt)) continue
    entries.push({ key, field: { value, excerpt, confidence: field.confidence } })
  }
  for (const entry of response.panelEntries ?? []) {
    const value = entry.value.trim()
    const excerpt = (entry.excerpt.trim() || value).trim()
    if (!entry.key.trim() || !value || !excerpt) continue
    if (isExcludedPreviewFieldKey(entry.key)) continue
    if (shouldDropRecognitionEntry(entry.key, value, excerpt)) continue
    if (isNoiseExtraction(entry.key, value, excerpt)) continue
    entries.push({
      key: entry.key,
      field: { value, excerpt, confidence: 'medium' }
    })
  }
  return entries
}

export function sanitizeCharacterExtraction(
  character: Character,
  characterId: string,
  mentionCount: number,
  response: CharacterExtractionLlmResponse
): CharacterExtraction {
  const normalized = normalizeExtractedFields(collectResponseEntries(response))
  const fields = normalized.fields

  const relations = response.relations
    ?.filter((relation) => relation.excerpt.trim())
    .map((relation) => ({
      targetName: relation.targetName.trim(),
      type: relation.type.trim(),
      excerpt: relation.excerpt.trim()
    }))

  return {
    characterId,
    mentionCount: response.mentionCount ?? mentionCount,
    proposedNewAliases: response.proposedNewAliases?.map((alias) => alias.trim()).filter(Boolean),
    fields,
    relations,
    panelEntries: normalized.panelEntries
  }
}
