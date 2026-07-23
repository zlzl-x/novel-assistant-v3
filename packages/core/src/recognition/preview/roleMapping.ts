import type { CharacterRole } from '../../models/character'
import type { PreviewRoleTier } from '../../models/recognition'

export function previewRoleTierToCharacterRole(
  tier: PreviewRoleTier,
  isProtagonist: boolean
): CharacterRole {
  if (isProtagonist || tier === 'protagonist') {
    return 'protagonist'
  }
  if (tier === 'extra') {
    return 'mentioned'
  }
  return 'major'
}
