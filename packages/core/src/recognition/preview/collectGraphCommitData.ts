import type { Step1Result, Step2Result } from '../../models/recognition'
import { resolveCharacterIdForLabel, type CharacterRegistryEntry } from '../matchLocal'
import { isPendingCharacterKey, toPendingCharacterKey } from './buildPreviewFromStep1'

export interface GraphCommitRelation {
  targetName: string
  type: string
}

export interface GraphCommitProtagonistRelation {
  type: string
  proximity: number
}

export interface GraphCommitData {
  relationsByCharacter: Record<string, GraphCommitRelation[]>
  protagonistRelationsByCharacter: Record<string, GraphCommitProtagonistRelation>
}

function remapKey(key: string, keyRemap: Map<string, string>): string {
  return keyRemap.get(key) ?? key
}

function dedupeRelations(relations: GraphCommitRelation[]): GraphCommitRelation[] {
  const seen = new Map<string, GraphCommitRelation>()
  for (const relation of relations) {
    const targetName = relation.targetName.trim()
    const type = relation.type.trim()
    if (!targetName || !type) continue
    seen.set(`${targetName}::${type}`, { targetName, type })
  }
  return [...seen.values()]
}

function mergeRelationLists(
  base: GraphCommitRelation[],
  overlay: GraphCommitRelation[]
): GraphCommitRelation[] {
  return dedupeRelations([...base, ...overlay])
}

function relationsFromStep1Extraction(
  extraction: Step1Result['chapterExtractions'][number],
  protagonistName?: string | null
): GraphCommitRelation[] {
  const relations = (extraction.relations ?? []).map((relation) => ({
    targetName: relation.targetName,
    type: relation.type
  }))

  if (extraction.protagonistRelation?.type.trim() && protagonistName) {
    relations.push({
      targetName: protagonistName,
      type: extraction.protagonistRelation.type.trim()
    })
  }

  return dedupeRelations(relations)
}

/** 从 Step1 + Step2 提取关系网入库数据（预览中不展示，确认后写入关系图） */
export function collectGraphCommitData(
  step1: Step1Result,
  registry: CharacterRegistryEntry[],
  keyRemap: Map<string, string> = new Map(),
  step2?: Step2Result,
  protagonistName?: string | null
): GraphCommitData {
  const relationsByCharacter: Record<string, GraphCommitRelation[]> = {}
  const protagonistRelationsByCharacter: Record<string, GraphCommitProtagonistRelation> = {}

  const step2ByCharacterId = new Map(
    (step2?.characters ?? []).map((extraction) => [extraction.characterId, extraction])
  )

  for (const extraction of step1.chapterExtractions) {
    const matchedId = resolveCharacterIdForLabel(extraction.inferredName, registry)
    const key = remapKey(matchedId ?? toPendingCharacterKey(extraction.inferredName), keyRemap)

    const step1Relations = relationsFromStep1Extraction(extraction, protagonistName)
    const step2Extraction = matchedId ? step2ByCharacterId.get(matchedId) : undefined
    const step2Relations = (step2Extraction?.relations ?? []).map((relation) => ({
      targetName: relation.targetName,
      type: relation.type
    }))

    const relations = mergeRelationLists(step1Relations, step2Relations)
    if (relations.length > 0) {
      relationsByCharacter[key] = relations
    }

    if (extraction.protagonistRelation?.type.trim() && !protagonistName) {
      protagonistRelationsByCharacter[key] = {
        type: extraction.protagonistRelation.type.trim(),
        proximity: extraction.protagonistRelation.proximity
      }
    }
  }

  for (const extraction of step2?.characters ?? []) {
    const key = remapKey(extraction.characterId, keyRemap)
    const step2Relations = (extraction.relations ?? []).map((relation) => ({
      targetName: relation.targetName,
      type: relation.type
    }))
    if (step2Relations.length === 0) continue
    relationsByCharacter[key] = mergeRelationLists(
      relationsByCharacter[key] ?? [],
      step2Relations
    )
  }

  return { relationsByCharacter, protagonistRelationsByCharacter }
}

export function remapGraphCommitData(
  data: GraphCommitData,
  keyRemap: Map<string, string>
): GraphCommitData {
  const relationsByCharacter: Record<string, GraphCommitRelation[]> = {}
  const protagonistRelationsByCharacter: Record<string, GraphCommitProtagonistRelation> = {}

  for (const [key, relations] of Object.entries(data.relationsByCharacter)) {
    relationsByCharacter[remapKey(key, keyRemap)] = relations
  }
  for (const [key, relation] of Object.entries(data.protagonistRelationsByCharacter)) {
    protagonistRelationsByCharacter[remapKey(key, keyRemap)] = relation
  }

  return { relationsByCharacter, protagonistRelationsByCharacter }
}

export function isGraphCommitKey(key: string): boolean {
  return !isPendingCharacterKey(key)
}
