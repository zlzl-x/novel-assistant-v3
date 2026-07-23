import type { Character } from '../models/character'
import type { Chapter } from '../models/project'
import { findCandidateCharacterIds, type CharacterRegistryEntry } from '../recognition/matchLocal'
import type { GraphCommitProtagonistRelation, GraphCommitRelation } from '../recognition/preview/collectGraphCommitData'

function mergeRelation(
  character: Character,
  targetCharacterId: string,
  type: string,
  chapterNumber: number
): Character {
  const existing = character.relations.find(
    (relation) => relation.targetCharacterId === targetCharacterId
  )
  if (existing?.type === type) {
    return character
  }

  const relations = existing
    ? character.relations.map((relation) =>
        relation.targetCharacterId === targetCharacterId ? { ...relation, type } : relation
      )
    : [
        ...character.relations,
        {
          targetCharacterId,
          type,
          sinceChapter: chapterNumber
        }
      ]

  return { ...character, relations }
}

function resolveTargetCharacterId(
  targetName: string,
  registry: CharacterRegistryEntry[]
): string | null {
  const candidates = findCandidateCharacterIds(targetName, registry)
  return candidates.length === 1 ? candidates[0]! : null
}

export function applyGraphRelationsToCharacter(
  character: Character,
  relations: GraphCommitRelation[],
  registry: CharacterRegistryEntry[],
  chapter: Chapter
): Character {
  let next = character
  for (const relation of relations) {
    const targetId = resolveTargetCharacterId(relation.targetName, registry)
    if (!targetId || targetId === character.id) continue
    next = mergeRelation(next, targetId, relation.type, chapter.number)
  }
  return next
}

export function applyProtagonistRelationToCharacter(
  character: Character,
  relation: GraphCommitProtagonistRelation
): Character {
  return {
    ...character,
    protagonistRelation: {
      type: relation.type,
      proximity: relation.proximity,
      label: character.protagonistRelation?.label
    }
  }
}
