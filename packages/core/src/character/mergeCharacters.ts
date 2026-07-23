import type {
  Character,
  CharacterAppearance,
  CharacterRole,
  FieldWithHistory,
  PanelEntry,
  Relation
} from '../models/character'

export interface MergeCharactersInput {
  primary: Character
  secondary: Character
}

const ROLE_RANK: Record<CharacterRole, number> = {
  protagonist: 4,
  major: 3,
  minor: 2,
  mentioned: 1
}

function pickHigherRole(left: CharacterRole, right: CharacterRole): CharacterRole {
  return ROLE_RANK[left] >= ROLE_RANK[right] ? left : right
}

function mergeFieldWithHistory(
  primary: FieldWithHistory<string>,
  secondary: FieldWithHistory<string>
): FieldWithHistory<string> {
  const current = primary.current.trim() ? primary.current : secondary.current
  return {
    current,
    history: [...primary.history, ...secondary.history]
  }
}

function mergeOptionalFieldWithHistory(
  primary: FieldWithHistory<string> | undefined,
  secondary: FieldWithHistory<string> | undefined
): FieldWithHistory<string> | undefined {
  if (!primary && !secondary) return undefined
  if (!primary) return secondary
  if (!secondary) return primary
  return mergeFieldWithHistory(primary, secondary)
}

function mergePanelEntries(left: PanelEntry[], right: PanelEntry[]): PanelEntry[] {
  const map = new Map<string, PanelEntry>()

  for (const entry of [...left, ...right]) {
    const key = entry.key.trim()
    if (!key) continue
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key,
        value: entry.value,
        history: [...entry.history]
      })
      continue
    }
    const preferredValue =
      entry.value.trim().length >= existing.value.trim().length ? entry.value : existing.value
    map.set(key, {
      key,
      value: preferredValue,
      history: [...existing.history, ...entry.history]
    })
  }

  return [...map.values()]
}

function mergeRelations(
  primary: Character,
  secondary: Character
): Relation[] {
  const map = new Map<string, Relation>()

  const addRelation = (relation: Relation): void => {
    if (relation.targetCharacterId === primary.id || relation.targetCharacterId === secondary.id) {
      return
    }
    const existing = map.get(relation.targetCharacterId)
    if (!existing) {
      map.set(relation.targetCharacterId, relation)
      return
    }
    map.set(relation.targetCharacterId, {
      ...existing,
      type: existing.type.trim() ? existing.type : relation.type,
      label: existing.label ?? relation.label,
      strength: Math.max(existing.strength ?? 0, relation.strength ?? 0) || undefined,
      sinceChapter: Math.min(
        existing.sinceChapter ?? Number.POSITIVE_INFINITY,
        relation.sinceChapter ?? Number.POSITIVE_INFINITY
      ),
      notes: [existing.notes, relation.notes].filter(Boolean).join('；') || undefined
    })
  }

  for (const relation of primary.relations) addRelation(relation)
  for (const relation of secondary.relations) addRelation(relation)

  return [...map.values()]
}

function mergeAppearances(left: CharacterAppearance[], right: CharacterAppearance[]): CharacterAppearance[] {
  const map = new Map<string, CharacterAppearance>()

  for (const appearance of [...left, ...right]) {
    const existing = map.get(appearance.chapterId)
    if (!existing) {
      map.set(appearance.chapterId, { ...appearance })
      continue
    }
    map.set(appearance.chapterId, {
      ...existing,
      mentionCount: existing.mentionCount + appearance.mentionCount,
      committedAt:
        existing.committedAt >= appearance.committedAt
          ? existing.committedAt
          : appearance.committedAt,
      excerpt: existing.excerpt ?? appearance.excerpt
    })
  }

  return [...map.values()].sort((a, b) => a.chapterNumber - b.chapterNumber)
}

function collectAliases(primary: Character, secondary: Character): string[] {
  const seen = new Set<string>([primary.name.trim()])
  const aliases: string[] = []

  const addAlias = (value: string): void => {
    const trimmed = value.trim()
    if (!trimmed || seen.has(trimmed)) return
    seen.add(trimmed)
    aliases.push(trimmed)
  }

  for (const alias of primary.aliases) addAlias(alias)
  addAlias(secondary.name)
  for (const alias of secondary.aliases) addAlias(alias)

  return aliases
}

function pickEarlierAppearance(
  left: Character['firstAppearance'],
  right: Character['firstAppearance']
): Character['firstAppearance'] {
  if (!left) return right
  if (!right) return left
  return left.chapterNumber <= right.chapterNumber ? left : right
}

function pickLaterAppearance(
  left: Character['lastAppearance'],
  right: Character['lastAppearance']
): Character['lastAppearance'] {
  if (!left) return right
  if (!right) return left
  return left.chapterNumber >= right.chapterNumber ? left : right
}

/** 将 secondary 合并进 primary，返回合并后的 primary（不修改 secondary） */
export function mergeCharacters(input: MergeCharactersInput): Character {
  const { primary, secondary } = input
  if (primary.id === secondary.id) {
    throw new Error('不能合并同一角色')
  }
  if (primary.projectId !== secondary.projectId) {
    throw new Error('只能合并同一作品内的角色')
  }

  const mergedNotes = [primary.notes.trim(), secondary.notes.trim()]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join('\n')

  const mergedSummary = primary.summary.trim() ? primary.summary : secondary.summary

  return {
    ...primary,
    aliases: collectAliases(primary, secondary),
    disambiguation: primary.disambiguation.trim() ? primary.disambiguation : secondary.disambiguation,
    role: pickHigherRole(primary.role, secondary.role),
    tier: primary.tier ?? secondary.tier,
    isNetworkCenter: Boolean(primary.isNetworkCenter || secondary.isNetworkCenter),
    identity: mergeFieldWithHistory(primary.identity, secondary.identity),
    realm: mergeFieldWithHistory(primary.realm, secondary.realm),
    location: mergeFieldWithHistory(primary.location, secondary.location),
    faction: mergeOptionalFieldWithHistory(primary.faction, secondary.faction),
    summary: mergedSummary,
    notes: mergedNotes,
    status: primary.status ?? secondary.status,
    protagonistRelation: primary.protagonistRelation ?? secondary.protagonistRelation,
    panel: {
      ...primary.panel,
      entries: mergePanelEntries(primary.panel.entries, secondary.panel.entries)
    },
    relations: mergeRelations(primary, secondary),
    firstAppearance: pickEarlierAppearance(primary.firstAppearance, secondary.firstAppearance),
    lastAppearance: pickLaterAppearance(primary.lastAppearance, secondary.lastAppearance),
    mentionCount: primary.mentionCount + secondary.mentionCount,
    appearances: mergeAppearances(primary.appearances, secondary.appearances),
    updatedAt: new Date().toISOString()
  }
}
