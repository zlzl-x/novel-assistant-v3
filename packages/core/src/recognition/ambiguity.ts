import type { AmbiguousName, Step1Result } from '../models/recognition'
import type { CharacterRegistryEntry } from './matchLocal'
import { matchMentionsToRegistry } from './matchLocal'

export interface ResolveAmbiguityInput {
  step1: Step1Result
  surfaceForm: string
  resolution:
    | { type: 'existing'; characterId: string; characterName: string }
    | { type: 'skip' }
}

export function resolveAmbiguity(
  input: ResolveAmbiguityInput,
  characters: CharacterRegistryEntry[]
): Step1Result {
  const remainingAmbiguous = input.step1.ambiguousNames.filter(
    (item) => item.surfaceForm !== input.surfaceForm
  )

  if (input.resolution.type === 'skip') {
    return matchMentionsToRegistry(
      {
        ...input.step1,
        ambiguousNames: remainingAmbiguous
      },
      characters
    )
  }

  const { characterName } = input.resolution

  const mentions = input.step1.mentions.map((mention) => {
    if (mention.surfaceForm !== input.surfaceForm) return mention
    return {
      ...mention,
      inferredName: characterName,
      isNickname: mention.surfaceForm !== characterName
    }
  })

  const chapterExtractions = input.step1.chapterExtractions.map((extraction) => {
    if (extraction.inferredName !== input.surfaceForm) return extraction
    return { ...extraction, inferredName: characterName }
  })

  const unresolved = input.step1.unresolvedMentions.filter(
    (name) => name !== input.surfaceForm && name !== characterName
  )

  const nextStep1: Step1Result = {
    ...input.step1,
    mentions,
    chapterExtractions,
    unresolvedMentions: unresolved,
    ambiguousNames: remainingAmbiguous
  }

  return matchMentionsToRegistry(nextStep1, characters)
}

export function removeUnresolvedMention(step1: Step1Result, name: string): Step1Result {
  return {
    ...step1,
    unresolvedMentions: step1.unresolvedMentions.filter((item) => item !== name)
  }
}

export function isAmbiguityResolved(step1: Step1Result): boolean {
  return step1.ambiguousNames.length === 0
}

export function getAmbiguityBySurfaceForm(
  step1: Step1Result,
  surfaceForm: string
): AmbiguousName | undefined {
  return step1.ambiguousNames.find((item) => item.surfaceForm === surfaceForm)
}
