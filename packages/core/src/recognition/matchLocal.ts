import type {
  AmbiguousName,
  CharacterMention,
  Step1Result
} from '../models/recognition'

export interface CharacterRegistryEntry {
  id: string
  name: string
  aliases: string[]
}

const EXCERPT_RADIUS = 24

function buildExcerpt(text: string, index: number, label: string): string {
  const start = Math.max(0, index - EXCERPT_RADIUS)
  const end = Math.min(text.length, index + label.length + EXCERPT_RADIUS)
  return text.slice(start, end).trim()
}

function countOccurrences(text: string, label: string): Array<{ index: number; excerpt: string }> {
  if (!label) return []
  const hits: Array<{ index: number; excerpt: string }> = []
  let from = 0
  while (from < text.length) {
    const index = text.indexOf(label, from)
    if (index < 0) break
    hits.push({ index, excerpt: buildExcerpt(text, index, label) })
    from = index + label.length
  }
  return hits
}

function labelsForCharacter(character: CharacterRegistryEntry): string[] {
  return [character.name, ...character.aliases].filter(Boolean)
}

export function findCandidateCharacterIds(
  label: string,
  characters: CharacterRegistryEntry[]
): string[] {
  const trimmed = label.trim()
  if (!trimmed) return []
  return characters
    .filter(
      (character) => character.name === trimmed || character.aliases.includes(trimmed)
    )
    .map((character) => character.id)
}

export function localNameScan(text: string, characters: CharacterRegistryEntry[]): CharacterMention[] {
  const mentions: CharacterMention[] = []
  const seen = new Set<string>()

  for (const character of characters) {
    for (const label of labelsForCharacter(character)) {
      const key = `${label}::${character.name}`
      if (seen.has(key)) continue
      const hits = countOccurrences(text, label)
      if (hits.length === 0) continue
      seen.add(key)
      mentions.push({
        surfaceForm: label,
        inferredName: character.name,
        mentionCount: hits.length,
        excerpts: hits.map((hit) => hit.excerpt),
        isNickname: label !== character.name
      })
    }
  }

  return mentions
}

function mergeMentionLists(
  primary: CharacterMention[],
  supplemental: CharacterMention[]
): CharacterMention[] {
  const map = new Map<string, CharacterMention>()
  for (const mention of [...primary, ...supplemental]) {
    const key = `${mention.surfaceForm}::${mention.inferredName ?? ''}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, mention)
      continue
    }
    map.set(key, {
      ...existing,
      mentionCount: Math.max(existing.mentionCount, mention.mentionCount),
      excerpts: [...new Set([...existing.excerpts, ...mention.excerpts])],
      isNickname: existing.isNickname || mention.isNickname
    })
  }
  return [...map.values()]
}

function labelsToMatch(mention: CharacterMention): string[] {
  return [mention.inferredName, mention.surfaceForm].filter(
    (value): value is string => Boolean(value?.trim())
  )
}

export function matchMentionsToRegistry(
  step1: Step1Result,
  characters: CharacterRegistryEntry[]
): Step1Result {
  const ambiguousMap = new Map<string, AmbiguousName>()
  const unresolved = new Set<string>()

  for (const mention of step1.mentions) {
    const labels = labelsToMatch(mention)
    const candidateIds = new Set<string>()
    for (const label of labels) {
      for (const id of findCandidateCharacterIds(label, characters)) {
        candidateIds.add(id)
      }
    }

    if (candidateIds.size > 1) {
      const key = mention.surfaceForm
      ambiguousMap.set(key, {
        surfaceForm: mention.surfaceForm,
        candidateCharacterIds: [...candidateIds],
        excerpt: mention.excerpts[0] ?? mention.surfaceForm
      })
      continue
    }

    if (candidateIds.size === 0) {
      unresolved.add(mention.inferredName ?? mention.surfaceForm)
    }
  }

  for (const extraction of step1.chapterExtractions) {
    const candidateIds = findCandidateCharacterIds(extraction.inferredName, characters)
    if (candidateIds.length > 1) {
      ambiguousMap.set(extraction.inferredName, {
        surfaceForm: extraction.inferredName,
        candidateCharacterIds: candidateIds,
        excerpt:
          Object.values(extraction.fields)[0]?.excerpt ??
          step1.mentions.find((mention) => mention.inferredName === extraction.inferredName)
            ?.excerpts[0] ??
          extraction.inferredName
      })
    } else if (candidateIds.length === 0) {
      unresolved.add(extraction.inferredName)
    }
  }

  return {
    ...step1,
    unresolvedMentions: [...unresolved].sort(),
    ambiguousNames: [...ambiguousMap.values()]
  }
}

export function applyLocalMatching(
  text: string,
  step1: Step1Result,
  characters: CharacterRegistryEntry[]
): Step1Result {
  const scanned = localNameScan(text, characters)
  const mergedMentions = mergeMentionLists(step1.mentions, scanned)
  return matchMentionsToRegistry(
    {
      ...step1,
      mentions: mergedMentions
    },
    characters
  )
}

export function resolveCharacterIdForLabel(
  label: string,
  characters: CharacterRegistryEntry[]
): string | null {
  const candidates = findCandidateCharacterIds(label, characters)
  return candidates.length === 1 ? candidates[0]! : null
}

export function getMatchedCharacterIds(
  step1: Step1Result,
  characters: CharacterRegistryEntry[]
): string[] {
  const ids = new Set<string>()

  for (const extraction of step1.chapterExtractions) {
    const id = resolveCharacterIdForLabel(extraction.inferredName, characters)
    if (id) ids.add(id)
  }

  for (const mention of step1.mentions) {
    for (const label of labelsToMatch(mention)) {
      const id = resolveCharacterIdForLabel(label, characters)
      if (id) ids.add(id)
    }
  }

  return [...ids]
}

export function getChapterExtractionForCharacter(
  step1: Step1Result,
  character: CharacterRegistryEntry
): Step1Result['chapterExtractions'][number] | null {
  const byName = step1.chapterExtractions.find(
    (extraction) => extraction.inferredName === character.name
  )
  if (byName) return byName

  for (const alias of character.aliases) {
    const byAlias = step1.chapterExtractions.find(
      (extraction) => extraction.inferredName === alias
    )
    if (byAlias) return byAlias
  }

  return null
}

export function countMentionsForCharacter(
  step1: Step1Result,
  character: CharacterRegistryEntry
): number {
  const labels = new Set([character.name, ...character.aliases])
  return step1.mentions
    .filter((mention) => {
      const inferred = mention.inferredName ?? mention.surfaceForm
      return labels.has(inferred) || labels.has(mention.surfaceForm)
    })
    .reduce((sum, mention) => sum + mention.mentionCount, 0)
}
