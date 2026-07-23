import type {
  Character,
  CharacterPanel,
  FieldHistoryEntry,
  FieldWithHistory,
  MapNode,
  MapWorld,
  Project,
  Chapter,
  ChapterMetadata,
  ProtagonistRelation,
  Relation,
  SettingModule,
  RecognitionCommit
} from '@novel-assistant/core'

export interface CharacterRow {
  id: string
  project_id: string
  name: string
  disambiguation: string
  role: Character['role']
  tier: Character['tier'] | null
  is_network_center: number
  identity_current: string
  realm_current: string
  location_current: string
  faction_current: string | null
  summary: string
  notes: string
  status: string | null
  protagonist_relation_json: string | null
  panel_json: string
  first_appearance_chapter_id: string | null
  first_appearance_chapter_number: number | null
  last_appearance_chapter_id: string | null
  last_appearance_chapter_number: number | null
  mention_count: number
  created_at: string
  updated_at: string
}

export interface FieldHistoryRow {
  field_key: string
  value: string
  chapter_id: string | null
  chapter_number: number | null
  source: FieldHistoryEntry<string>['source']
  excerpt: string | null
  recognized_at: string | null
  created_at: string
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function buildFieldWithHistory(
  current: string,
  fieldKey: string,
  historyRows: FieldHistoryRow[]
): FieldWithHistory<string> {
  return {
    current,
    history: historyRows
      .filter((row) => row.field_key === fieldKey)
      .map((row) => ({
        value: row.value,
        chapterId: row.chapter_id ?? undefined,
        chapterNumber: row.chapter_number ?? undefined,
        source: row.source,
        recognizedAt: row.recognized_at ?? undefined,
        excerpt: row.excerpt ?? undefined
      }))
  }
}

export function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    title: row.title as string,
    protagonistId: (row.protagonist_id as string | null) ?? undefined,
    networkMode: row.network_mode as Project['networkMode'],
    genre: row.genre as Project['genre'],
    schemaVersion: row.schema_version as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function mapChapterRow(row: Record<string, unknown>): Chapter {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    number: row.number as number,
    title: row.title as string,
    rawText: row.raw_text as string,
    wordCount: row.word_count as number,
    lastCommittedAt: (row.last_committed_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function mapChapterMetadataRow(row: Record<string, unknown>): ChapterMetadata {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    number: row.number as number,
    title: row.title as string,
    wordCount: row.word_count as number,
    lastCommittedAt: (row.last_committed_at as string | null) ?? undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function mapCharacterRow(
  row: CharacterRow,
  aliases: string[],
  relations: Relation[],
  historyRows: FieldHistoryRow[],
  appearances: Character['appearances']
): Character {
  const protagonistRelation = parseJson<ProtagonistRelation | null>(
    row.protagonist_relation_json,
    null
  )

  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    aliases,
    disambiguation: row.disambiguation,
    role: row.role,
    tier: row.tier ?? undefined,
    isNetworkCenter: row.is_network_center === 1,
    identity: buildFieldWithHistory(row.identity_current, 'identity', historyRows),
    realm: buildFieldWithHistory(row.realm_current, 'realm', historyRows),
    location: buildFieldWithHistory(row.location_current, 'location', historyRows),
    faction: row.faction_current
      ? buildFieldWithHistory(row.faction_current, 'faction', historyRows)
      : undefined,
    summary: row.summary,
    notes: row.notes,
    status: row.status ?? undefined,
    protagonistRelation: protagonistRelation ?? undefined,
    panel: parseJson<CharacterPanel>(row.panel_json, { entries: [] }),
    relations,
    firstAppearance:
      row.first_appearance_chapter_id && row.first_appearance_chapter_number
        ? {
            chapterId: row.first_appearance_chapter_id,
            chapterNumber: row.first_appearance_chapter_number
          }
        : undefined,
    lastAppearance:
      row.last_appearance_chapter_id && row.last_appearance_chapter_number
        ? {
            chapterId: row.last_appearance_chapter_id,
            chapterNumber: row.last_appearance_chapter_number
          }
        : undefined,
    mentionCount: row.mention_count,
    appearances,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

export function mapMapWorldRow(row: Record<string, unknown>): MapWorld {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    name: row.name as string,
    description: row.description as string,
    stylePreset: (row.style_preset as string | null) ?? undefined,
    generatedCode: (row.generated_code as string | null) ?? undefined,
    codeGeneratedAt: (row.code_generated_at as string | null) ?? undefined,
    codeVersion: row.code_version as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function mapMapNodeRow(row: Record<string, unknown>): MapNode {
  return {
    id: row.id as string,
    worldId: row.world_id as string,
    parentId: (row.parent_id as string | null) ?? null,
    name: row.name as string,
    type: row.type as MapNode['type'],
    summary: row.summary as string,
    tags: parseJson<string[]>(row.tags_json as string, []),
    geo: parseJson(row.geo_json as string | null, undefined),
    source: row.source as MapNode['source'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function mapSettingModuleRow(row: Record<string, unknown>): SettingModule {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    type: row.type as SettingModule['type'],
    title: row.title as string,
    order: row.sort_order as number,
    collapsed: (row.collapsed as number) === 1,
    payload: parseJson(row.payload_json as string, {}),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  }
}

export function mapCommitRow(
  row: Record<string, unknown>,
  fields: RecognitionCommit['acceptedFields'],
  appearances: RecognitionCommit['appearances']
): RecognitionCommit {
  return {
    id: row.id as string,
    chapterId: row.chapter_id as string,
    chapterNumber: row.chapter_number as number,
    committedAt: row.committed_at as string,
    modelProfile: row.model_profile as string,
    acceptedFields: fields,
    appearances
  }
}
