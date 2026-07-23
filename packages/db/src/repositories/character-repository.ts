import type Database from 'better-sqlite3'
import type {
  Character,
  CharacterAppearance,
  CharacterRole,
  FieldHistoryEntry,
  FieldWithHistory,
  Relation
} from '@novel-assistant/core'
import { mergeCharacters } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'
import {
  mapCharacterRow,
  type CharacterRow,
  type FieldHistoryRow
} from '../utils/mappers'

export interface CreateCharacterInput {
  projectId: string
  name: string
  aliases?: string[]
  disambiguation?: string
  role?: CharacterRole
  summary?: string
  notes?: string
}

export interface UpdateCharacterInput {
  name?: string
  aliases?: string[]
  disambiguation?: string
  role?: CharacterRole
  tier?: Character['tier'] | null
  isNetworkCenter?: boolean
  identity?: string
  realm?: string
  location?: string
  faction?: string | null
  summary?: string
  notes?: string
  status?: string | null
  protagonistRelation?: Character['protagonistRelation'] | null
  panel?: Character['panel']
  mentionCount?: number
  firstAppearance?: Character['firstAppearance'] | null
  lastAppearance?: Character['lastAppearance'] | null
  appendFieldHistory?: Array<{
    fieldKey: string
    value: string
    chapterId?: string
    chapterNumber?: number
    source: FieldHistoryEntry<string>['source']
    excerpt?: string
    recognizedAt?: string
  }>
  identitySnapshot?: FieldWithHistory<string>
  realmSnapshot?: FieldWithHistory<string>
  locationSnapshot?: FieldWithHistory<string>
  factionSnapshot?: FieldWithHistory<string> | null
}

interface AliasRow {
  character_id: string
  alias: string
}

interface FieldHistoryRowWithCharacter extends FieldHistoryRow {
  character_id: string
}

interface RelationRow {
  source_id: string
  target_id: string
  type: string
  label: string | null
  strength: number | null
  since_chapter: number | null
  notes: string | null
}

interface AppearanceRow {
  character_id: string
  chapter_id: string
  chapter_number: number
  mention_count: number
  committed_at: string
  excerpt: string | null
}

export class CharacterRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  findByProject(projectId: string): Character[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM characters WHERE project_id = ? ORDER BY updated_at DESC')
      .all(projectId) as CharacterRow[]

    return this.hydrateCharacters(rows)
  }

  findById(id: string): Character | null {
    const row = this.getDb().prepare('SELECT * FROM characters WHERE id = ?').get(id) as
      | CharacterRow
      | undefined
    return row ? this.hydrateCharacter(row) : null
  }

  findByName(projectId: string, name: string): Character[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM characters WHERE project_id = ? AND name = ? ORDER BY created_at ASC')
      .all(projectId, name) as CharacterRow[]

    return this.hydrateCharacters(rows)
  }

  search(projectId: string, query: string, limit = 50): Character[] {
    const pattern = `%${query}%`
    const rows = this.getDb()
      .prepare(
        `SELECT DISTINCT c.*
         FROM characters c
         LEFT JOIN character_aliases a ON a.character_id = c.id
         WHERE c.project_id = ?
           AND (c.name LIKE ? OR a.alias LIKE ? OR c.disambiguation LIKE ?)
         ORDER BY c.updated_at DESC
         LIMIT ?`
      )
      .all(projectId, pattern, pattern, pattern, limit) as CharacterRow[]

    return this.hydrateCharacters(rows)
  }

  create(input: CreateCharacterInput): Character {
    return this.getDb().transaction(() => {
      const id = createId()
      const timestamp = nowIso()
      this.getDb()
        .prepare(
          `INSERT INTO characters (
            id, project_id, name, disambiguation, role, summary, notes,
            panel_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.projectId,
          input.name,
          input.disambiguation ?? '',
          input.role ?? 'mentioned',
          input.summary ?? '',
          input.notes ?? '',
          JSON.stringify({ entries: [] }),
          timestamp,
          timestamp
        )

      this.replaceAliases(id, input.aliases ?? [])
      const created = this.findById(id)
      if (!created) {
        throw new Error('创建角色失败')
      }
      return created
    })()
  }

  update(id: string, input: UpdateCharacterInput): Character | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    return this.getDb().transaction(() => {
      const updated: Character = {
        ...existing,
        name: input.name ?? existing.name,
        aliases: input.aliases ?? existing.aliases,
        disambiguation: input.disambiguation ?? existing.disambiguation,
        role: input.role ?? existing.role,
        tier: input.tier === null ? undefined : (input.tier ?? existing.tier),
        isNetworkCenter: input.isNetworkCenter ?? existing.isNetworkCenter,
        identity: input.identitySnapshot
          ?? (input.identity !== undefined
            ? { current: input.identity, history: existing.identity.history }
            : existing.identity),
        realm: input.realmSnapshot
          ?? (input.realm !== undefined
            ? { current: input.realm, history: existing.realm.history }
            : existing.realm),
        location: input.locationSnapshot
          ?? (input.location !== undefined
            ? { current: input.location, history: existing.location.history }
            : existing.location),
        faction:
          input.factionSnapshot === null
            ? undefined
            : input.factionSnapshot
              ?? (input.faction !== undefined
                ? input.faction
                  ? { current: input.faction, history: existing.faction?.history ?? [] }
                  : undefined
                : existing.faction),
        summary: input.summary ?? existing.summary,
        notes: input.notes ?? existing.notes,
        status: input.status === null ? undefined : (input.status ?? existing.status),
        protagonistRelation:
          input.protagonistRelation === null
            ? undefined
            : (input.protagonistRelation ?? existing.protagonistRelation),
        panel: input.panel ?? existing.panel,
        mentionCount: input.mentionCount ?? existing.mentionCount,
        firstAppearance:
          input.firstAppearance === null ? undefined : (input.firstAppearance ?? existing.firstAppearance),
        lastAppearance:
          input.lastAppearance === null ? undefined : (input.lastAppearance ?? existing.lastAppearance),
        updatedAt: nowIso()
      }

      this.getDb()
        .prepare(
          `UPDATE characters SET
            name = ?, disambiguation = ?, role = ?, tier = ?, is_network_center = ?,
            identity_current = ?, realm_current = ?, location_current = ?, faction_current = ?,
            summary = ?, notes = ?, status = ?, protagonist_relation_json = ?, panel_json = ?,
            first_appearance_chapter_id = ?, first_appearance_chapter_number = ?,
            last_appearance_chapter_id = ?, last_appearance_chapter_number = ?,
            mention_count = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.name,
          updated.disambiguation,
          updated.role,
          updated.tier ?? null,
          updated.isNetworkCenter ? 1 : 0,
          updated.identity.current,
          updated.realm.current,
          updated.location.current,
          updated.faction?.current ?? null,
          updated.summary,
          updated.notes,
          updated.status ?? null,
          updated.protagonistRelation ? JSON.stringify(updated.protagonistRelation) : null,
          JSON.stringify(updated.panel),
          updated.firstAppearance?.chapterId ?? null,
          updated.firstAppearance?.chapterNumber ?? null,
          updated.lastAppearance?.chapterId ?? null,
          updated.lastAppearance?.chapterNumber ?? null,
          updated.mentionCount,
          updated.updatedAt,
          id
        )

      if (input.aliases) {
        this.replaceAliases(id, input.aliases)
      }

      if (input.appendFieldHistory) {
        const insert = this.getDb().prepare(
          `INSERT INTO character_field_history (
            id, character_id, field_key, value, chapter_id, chapter_number,
            source, excerpt, recognized_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        for (const entry of input.appendFieldHistory) {
          insert.run(
            createId(),
            id,
            entry.fieldKey,
            entry.value,
            entry.chapterId ?? null,
            entry.chapterNumber ?? null,
            entry.source,
            entry.excerpt ?? null,
            entry.recognizedAt ?? null,
            nowIso()
          )
        }
      }

      return this.findById(id)
    })()
  }

  delete(id: string): boolean {
    const result = this.getDb().prepare('DELETE FROM characters WHERE id = ?').run(id)
    return result.changes > 0
  }

  merge(primaryId: string, secondaryId: string): Character {
    return this.getDb().transaction(() => {
      const primary = this.findById(primaryId)
      const secondary = this.findById(secondaryId)
      if (!primary || !secondary) {
        throw new Error('角色不存在')
      }

      const merged = mergeCharacters({ primary, secondary })

      this.reconcileRelationsInDb(primaryId, secondaryId)
      this.reconcileAppearancesInDb(primaryId, secondaryId)
      this.getDb()
        .prepare('UPDATE character_field_history SET character_id = ? WHERE character_id = ?')
        .run(primaryId, secondaryId)

      this.update(primaryId, {
        name: merged.name,
        aliases: merged.aliases,
        disambiguation: merged.disambiguation,
        role: merged.role,
        tier: merged.tier ?? null,
        isNetworkCenter: merged.isNetworkCenter,
        identitySnapshot: merged.identity,
        realmSnapshot: merged.realm,
        locationSnapshot: merged.location,
        factionSnapshot: merged.faction ?? null,
        summary: merged.summary,
        notes: merged.notes,
        status: merged.status ?? null,
        protagonistRelation: merged.protagonistRelation ?? null,
        panel: merged.panel,
        mentionCount: merged.mentionCount,
        firstAppearance: merged.firstAppearance ?? null,
        lastAppearance: merged.lastAppearance ?? null
      })

      for (const relation of merged.relations) {
        this.upsertRelations(primaryId, [relation])
      }

      this.delete(secondaryId)

      const result = this.findById(primaryId)
      if (!result) {
        throw new Error('合并角色失败')
      }
      return result
    })()
  }

  private reconcileRelationsInDb(primaryId: string, secondaryId: string): void {
    const db = this.getDb()
    db.prepare(
      `DELETE FROM character_relations
       WHERE (source_id = ? AND target_id = ?) OR (source_id = ? AND target_id = ?)`
    ).run(primaryId, secondaryId, secondaryId, primaryId)

    db.prepare(
      `UPDATE character_relations
       SET target_id = ?
       WHERE target_id = ? AND source_id != ?`
    ).run(primaryId, secondaryId, primaryId)

    const outgoing = db
      .prepare('SELECT id, target_id FROM character_relations WHERE source_id = ?')
      .all(secondaryId) as Array<{ id: string; target_id: string }>

    for (const relation of outgoing) {
      const duplicate = db
        .prepare('SELECT id FROM character_relations WHERE source_id = ? AND target_id = ?')
        .get(primaryId, relation.target_id) as { id: string } | undefined

      if (duplicate) {
        db.prepare('DELETE FROM character_relations WHERE id = ?').run(relation.id)
        continue
      }

      db.prepare('UPDATE character_relations SET source_id = ? WHERE id = ?').run(primaryId, relation.id)
    }
  }

  private reconcileAppearancesInDb(primaryId: string, secondaryId: string): void {
    const db = this.getDb()
    const secondaryRows = db
      .prepare(
        `SELECT id, chapter_id, chapter_number, mention_count, committed_at, excerpt
         FROM character_appearances
         WHERE character_id = ?`
      )
      .all(secondaryId) as Array<{
      id: string
      chapter_id: string
      chapter_number: number
      mention_count: number
      committed_at: string
      excerpt: string | null
    }>

    for (const row of secondaryRows) {
      const existing = db
        .prepare(
          'SELECT id, mention_count, committed_at, excerpt FROM character_appearances WHERE character_id = ? AND chapter_id = ?'
        )
        .get(primaryId, row.chapter_id) as
        | { id: string; mention_count: number; committed_at: string; excerpt: string | null }
        | undefined

      if (existing) {
        const committedAt =
          existing.committed_at >= row.committed_at ? existing.committed_at : row.committed_at
        db.prepare(
          `UPDATE character_appearances
           SET mention_count = ?, committed_at = ?, excerpt = COALESCE(?, excerpt)
           WHERE id = ?`
        ).run(existing.mention_count + row.mention_count, committedAt, row.excerpt, existing.id)
        db.prepare('DELETE FROM character_appearances WHERE id = ?').run(row.id)
        continue
      }

      db.prepare('UPDATE character_appearances SET character_id = ? WHERE id = ?').run(primaryId, row.id)
    }
  }

  private hydrateCharacter(row: CharacterRow): Character {
    const aliases = this.getDb()
      .prepare('SELECT alias FROM character_aliases WHERE character_id = ? ORDER BY alias ASC')
      .all(row.id)
      .map((item) => (item as { alias: string }).alias)

    const historyRows = this.getDb()
      .prepare(
        `SELECT field_key, value, chapter_id, chapter_number, source, excerpt, recognized_at, created_at
         FROM character_field_history
         WHERE character_id = ?
         ORDER BY created_at ASC`
      )
      .all(row.id) as FieldHistoryRow[]

    const relations = this.getDb()
      .prepare(
        `SELECT target_id, type, label, strength, since_chapter, notes
         FROM character_relations WHERE source_id = ?`
      )
      .all(row.id)
      .map((item) => this.mapRelationRow(item as RelationRow))

    const appearances = this.getDb()
      .prepare(
        `SELECT chapter_id, chapter_number, mention_count, committed_at, excerpt
         FROM character_appearances
         WHERE character_id = ?
         ORDER BY chapter_number ASC`
      )
      .all(row.id)
      .map((item) => this.mapAppearanceRow(item as AppearanceRow))

    return mapCharacterRow(row, aliases, relations, historyRows, appearances)
  }

  private hydrateCharacters(rows: CharacterRow[]): Character[] {
    if (rows.length === 0) {
      return []
    }

    const ids = rows.map((row) => row.id)
    const placeholders = ids.map(() => '?').join(', ')
    const aliasesByCharacter = new Map<string, string[]>()
    const historyByCharacter = new Map<string, FieldHistoryRow[]>()
    const relationsByCharacter = new Map<string, Relation[]>()
    const appearancesByCharacter = new Map<string, CharacterAppearance[]>()

    const aliasRows = this.getDb()
      .prepare(
        `SELECT character_id, alias
         FROM character_aliases
         WHERE character_id IN (${placeholders})
         ORDER BY character_id ASC, alias ASC`
      )
      .all(...ids) as AliasRow[]
    for (const row of aliasRows) {
      aliasesByCharacter.set(row.character_id, [
        ...(aliasesByCharacter.get(row.character_id) ?? []),
        row.alias
      ])
    }

    const historyRows = this.getDb()
      .prepare(
        `SELECT character_id, field_key, value, chapter_id, chapter_number, source, excerpt, recognized_at, created_at
         FROM character_field_history
         WHERE character_id IN (${placeholders})
         ORDER BY character_id ASC, created_at ASC`
      )
      .all(...ids) as FieldHistoryRowWithCharacter[]
    for (const row of historyRows) {
      historyByCharacter.set(row.character_id, [
        ...(historyByCharacter.get(row.character_id) ?? []),
        row
      ])
    }

    const relationRows = this.getDb()
      .prepare(
        `SELECT source_id, target_id, type, label, strength, since_chapter, notes
         FROM character_relations
         WHERE source_id IN (${placeholders})
         ORDER BY source_id ASC, since_chapter ASC`
      )
      .all(...ids) as RelationRow[]
    for (const row of relationRows) {
      relationsByCharacter.set(row.source_id, [
        ...(relationsByCharacter.get(row.source_id) ?? []),
        this.mapRelationRow(row)
      ])
    }

    const appearanceRows = this.getDb()
      .prepare(
        `SELECT character_id, chapter_id, chapter_number, mention_count, committed_at, excerpt
         FROM character_appearances
         WHERE character_id IN (${placeholders})
         ORDER BY character_id ASC, chapter_number ASC`
      )
      .all(...ids) as AppearanceRow[]
    for (const row of appearanceRows) {
      appearancesByCharacter.set(row.character_id, [
        ...(appearancesByCharacter.get(row.character_id) ?? []),
        this.mapAppearanceRow(row)
      ])
    }

    return rows.map((row) =>
      mapCharacterRow(
        row,
        aliasesByCharacter.get(row.id) ?? [],
        relationsByCharacter.get(row.id) ?? [],
        historyByCharacter.get(row.id) ?? [],
        appearancesByCharacter.get(row.id) ?? []
      )
    )
  }

  private mapRelationRow(relation: RelationRow): Relation {
    return {
      targetCharacterId: relation.target_id,
      type: relation.type,
      label: relation.label ?? undefined,
      strength: relation.strength ?? undefined,
      sinceChapter: relation.since_chapter ?? undefined,
      notes: relation.notes ?? undefined
    }
  }

  private mapAppearanceRow(appearance: AppearanceRow): CharacterAppearance {
    return {
      chapterId: appearance.chapter_id,
      chapterNumber: appearance.chapter_number,
      mentionCount: appearance.mention_count,
      committedAt: appearance.committed_at,
      excerpt: appearance.excerpt ?? undefined
    }
  }

  private replaceAliases(characterId: string, aliases: string[]): void {
    this.getDb().prepare('DELETE FROM character_aliases WHERE character_id = ?').run(characterId)
    const insert = this.getDb().prepare(
      'INSERT INTO character_aliases (character_id, alias) VALUES (?, ?)'
    )
    for (const alias of aliases) {
      insert.run(characterId, alias)
    }
  }

  upsertRelations(
    sourceId: string,
    relations: Array<{
      targetCharacterId: string
      type: string
      label?: string
      strength?: number
      sinceChapter?: number
      notes?: string
    }>
  ): void {
    if (relations.length === 0) return

    const findExisting = this.getDb().prepare(
      'SELECT id FROM character_relations WHERE source_id = ? AND target_id = ?'
    )
    const update = this.getDb().prepare(
      `UPDATE character_relations SET
        type = ?, label = ?, strength = ?, since_chapter = ?, notes = ?, updated_at = ?
      WHERE id = ?`
    )
    const insert = this.getDb().prepare(
      `INSERT INTO character_relations (
        id, source_id, target_id, type, label, strength, since_chapter, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )

    for (const relation of relations) {
      const timestamp = nowIso()
      const existing = findExisting.get(sourceId, relation.targetCharacterId) as
        | { id: string }
        | undefined

      if (existing) {
        update.run(
          relation.type,
          relation.label ?? null,
          relation.strength ?? null,
          relation.sinceChapter ?? null,
          relation.notes ?? null,
          timestamp,
          existing.id
        )
        continue
      }

      insert.run(
        createId(),
        sourceId,
        relation.targetCharacterId,
        relation.type,
        relation.label ?? null,
        relation.strength ?? null,
        relation.sinceChapter ?? null,
        relation.notes ?? null,
        timestamp,
        timestamp
      )
    }
  }
}
