import type { Character, Relation } from '../models/character'
import { PROXIMITY_MAX, PROXIMITY_MIN } from '../constants'

export interface SyntheticProtagonistEdge {
  targetCharacterId: string
  type: string
  strength: number
  synthetic: true
}

function clampProximity(value?: number): number {
  if (value === undefined || Number.isNaN(value)) return 3
  return Math.min(PROXIMITY_MAX, Math.max(PROXIMITY_MIN, Math.round(value)))
}

/** 若角色仅有 protagonistRelation、无边指向主角，补一条合成边（只读迁移，不写库） */
export function migrateProtagonistRelationToEdges(
  character: Character,
  protagonistId: string | null | undefined
): SyntheticProtagonistEdge | null {
  if (!protagonistId || character.id === protagonistId) return null
  if (!character.protagonistRelation?.type.trim()) return null

  const hasProtagonistEdge = character.relations.some(
    (relation) => relation.targetCharacterId === protagonistId
  )
  if (hasProtagonistEdge) return null

  return {
    targetCharacterId: protagonistId,
    type: character.protagonistRelation.type.trim(),
    strength: clampProximity(character.protagonistRelation.proximity),
    synthetic: true
  }
}

export function getLayoutProximityForProtagonist(
  character: Character,
  protagonistId: string | null | undefined
): number {
  if (protagonistId) {
    const edge = character.relations.find(
      (relation) => relation.targetCharacterId === protagonistId
    )
    if (edge?.strength !== undefined) {
      return clampProximity(edge.strength)
    }
  }

  return clampProximity(character.protagonistRelation?.proximity)
}

export function collectRelationsForDisplay(
  character: Character,
  protagonistId: string | null | undefined
): Relation[] {
  const synthetic = migrateProtagonistRelationToEdges(character, protagonistId)
  if (!synthetic) return character.relations

  return [
    ...character.relations,
    {
      targetCharacterId: synthetic.targetCharacterId,
      type: synthetic.type,
      strength: synthetic.strength
    }
  ]
}
