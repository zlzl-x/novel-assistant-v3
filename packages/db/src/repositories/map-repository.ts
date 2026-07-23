import type Database from 'better-sqlite3'
import type { MapNode, MapWorld } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'
import { mapMapNodeRow, mapMapWorldRow } from '../utils/mappers'

export interface CreateMapWorldInput {
  projectId: string
  name: string
  description?: string
  stylePreset?: string
}

export interface UpdateMapWorldInput {
  name?: string
  description?: string
  stylePreset?: string | null
  generatedCode?: string | null
  codeGeneratedAt?: string | null
  codeVersion?: number
}

export interface CreateMapNodeInput {
  worldId: string
  parentId?: string | null
  name: string
  type?: MapNode['type']
  summary?: string
  tags?: string[]
  geo?: MapNode['geo']
  source?: MapNode['source']
  sortOrder?: number
}

export interface UpdateMapNodeInput {
  parentId?: string | null
  name?: string
  type?: MapNode['type']
  summary?: string
  tags?: string[]
  geo?: MapNode['geo'] | null
  source?: MapNode['source']
  sortOrder?: number
}

export class MapRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  findWorldsByProject(projectId: string): MapWorld[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM map_worlds WHERE project_id = ? ORDER BY created_at ASC')
      .all(projectId)
    return rows.map((row) => mapMapWorldRow(row as Record<string, unknown>))
  }

  findWorldById(id: string): MapWorld | null {
    const row = this.getDb().prepare('SELECT * FROM map_worlds WHERE id = ?').get(id)
    return row ? mapMapWorldRow(row as Record<string, unknown>) : null
  }

  createWorld(input: CreateMapWorldInput): MapWorld {
    return this.getDb().transaction(() => {
      const id = createId()
      const timestamp = nowIso()
      this.getDb()
        .prepare(
          `INSERT INTO map_worlds (
            id, project_id, name, description, style_preset, code_version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 0, ?, ?)`
        )
        .run(
          id,
          input.projectId,
          input.name,
          input.description ?? '',
          input.stylePreset ?? null,
          timestamp,
          timestamp
        )
      return this.findWorldById(id)!
    })()
  }

  updateWorld(id: string, input: UpdateMapWorldInput): MapWorld | null {
    const existing = this.findWorldById(id)
    if (!existing) return null

    return this.getDb().transaction(() => {
      const updated: MapWorld = {
        ...existing,
        name: input.name ?? existing.name,
        description: input.description ?? existing.description,
        stylePreset: input.stylePreset === null ? undefined : (input.stylePreset ?? existing.stylePreset),
        generatedCode:
          input.generatedCode === null ? undefined : (input.generatedCode ?? existing.generatedCode),
        codeGeneratedAt:
          input.codeGeneratedAt === null
            ? undefined
            : (input.codeGeneratedAt ?? existing.codeGeneratedAt),
        codeVersion: input.codeVersion ?? existing.codeVersion,
        updatedAt: nowIso()
      }

      this.getDb()
        .prepare(
          `UPDATE map_worlds SET
            name = ?, description = ?, style_preset = ?, generated_code = ?,
            code_generated_at = ?, code_version = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.name,
          updated.description,
          updated.stylePreset ?? null,
          updated.generatedCode ?? null,
          updated.codeGeneratedAt ?? null,
          updated.codeVersion,
          updated.updatedAt,
          id
        )

      return this.findWorldById(id)
    })()
  }

  deleteWorld(id: string): boolean {
    const result = this.getDb().prepare('DELETE FROM map_worlds WHERE id = ?').run(id)
    return result.changes > 0
  }

  findNodesByWorld(worldId: string): MapNode[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM map_nodes WHERE world_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(worldId)
    return rows.map((row) => mapMapNodeRow(row as Record<string, unknown>))
  }

  findNodeById(id: string): MapNode | null {
    const row = this.getDb().prepare('SELECT * FROM map_nodes WHERE id = ?').get(id)
    return row ? mapMapNodeRow(row as Record<string, unknown>) : null
  }

  createNode(input: CreateMapNodeInput): MapNode {
    return this.getDb().transaction(() => {
      const id = createId()
      const timestamp = nowIso()
      this.getDb()
        .prepare(
          `INSERT INTO map_nodes (
            id, world_id, parent_id, name, type, summary, tags_json, geo_json,
            source, sort_order, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.worldId,
          input.parentId ?? null,
          input.name,
          input.type ?? 'other',
          input.summary ?? '',
          JSON.stringify(input.tags ?? []),
          input.geo ? JSON.stringify(input.geo) : null,
          input.source ?? 'manual',
          input.sortOrder ?? 0,
          timestamp,
          timestamp
        )
      return this.findNodeById(id)!
    })()
  }

  updateNode(id: string, input: UpdateMapNodeInput): MapNode | null {
    const existing = this.findNodeById(id)
    if (!existing) return null

    return this.getDb().transaction(() => {
      const existingRow = this.getDb()
        .prepare('SELECT sort_order FROM map_nodes WHERE id = ?')
        .get(id) as { sort_order: number }

      const updated: MapNode = {
        ...existing,
        parentId: input.parentId === undefined ? existing.parentId : input.parentId,
        name: input.name ?? existing.name,
        type: input.type ?? existing.type,
        summary: input.summary ?? existing.summary,
        tags: input.tags ?? existing.tags,
        geo: input.geo === null ? undefined : (input.geo ?? existing.geo),
        source: input.source ?? existing.source,
        updatedAt: nowIso()
      }

      this.getDb()
        .prepare(
          `UPDATE map_nodes SET
            parent_id = ?, name = ?, type = ?, summary = ?, tags_json = ?,
            geo_json = ?, source = ?, sort_order = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.parentId,
          updated.name,
          updated.type,
          updated.summary,
          JSON.stringify(updated.tags),
          updated.geo ? JSON.stringify(updated.geo) : null,
          updated.source,
          input.sortOrder ?? existingRow.sort_order,
          updated.updatedAt,
          id
        )

      return this.findNodeById(id)
    })()
  }

  deleteNode(id: string): boolean {
    const result = this.getDb().prepare('DELETE FROM map_nodes WHERE id = ?').run(id)
    return result.changes > 0
  }
}
