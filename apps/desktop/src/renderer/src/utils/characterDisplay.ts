import type { Character } from '@novel-assistant/core'

export function computeBubbleScale(character: Character, protagonistId?: string | null): number {  const isHero = character.id === protagonistId || character.role === 'protagonist'
  const proximity = character.protagonistRelation?.proximity ?? 3
  const mentionFactor = Math.min(1.4, 0.85 + Math.log2(character.mentionCount + 1) * 0.12)
  const proximityFactor = 0.75 + proximity * 0.08
  const roleFactor = isHero
    ? 1.25
    : character.role === 'major'
      ? 1.08
      : character.role === 'minor'
        ? 0.92
        : 0.8
  return mentionFactor * proximityFactor * roleFactor
}
