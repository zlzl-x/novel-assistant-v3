import type { RecognitionPreview, Step1Result } from '../models/recognition'
import { getMatchedCharacterIds, type CharacterRegistryEntry } from './matchLocal'

export function canRunStep2(
  preview: Pick<RecognitionPreview, 'step1'> & { blocked?: boolean },
  characters: CharacterRegistryEntry[]
): boolean {
  if (preview.blocked || preview.step1.ambiguousNames.length > 0) return false
  return getMatchedCharacterIds(preview.step1, characters).length > 0
}

export function isStep2Ready(preview: RecognitionPreview): boolean {
  return Boolean(preview.step2 && !preview.blocked)
}

export function isPreviewReady(preview: RecognitionPreview): boolean {
  if (preview.blocked) return false
  const metaCount = Object.keys(preview.characterPreviewMeta ?? {}).length
  const rowCount = Object.values(preview.previewRowsByCharacter ?? {}).flat().length
  return metaCount > 0 || rowCount > 0 || Boolean(preview.step2)
}

export function summarizeStep1(step1: Step1Result): {
  matchedCount: number
  unresolvedCount: number
  ambiguousCount: number
} {
  return {
    matchedCount: 0,
    unresolvedCount: step1.unresolvedMentions.length,
    ambiguousCount: step1.ambiguousNames.length
  }
}
