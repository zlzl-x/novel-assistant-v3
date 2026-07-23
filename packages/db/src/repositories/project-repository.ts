import type Database from 'better-sqlite3'
import type { Project } from '@novel-assistant/core'
import { SCHEMA_VERSION } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'
import { mapProjectRow } from '../utils/mappers'

export interface CreateProjectInput {
  title: string
  protagonistId?: string
  networkMode?: Project['networkMode']
  genre?: Project['genre']
}

export interface UpdateProjectInput {
  title?: string
  protagonistId?: string | null
  networkMode?: Project['networkMode']
  genre?: Project['genre']
  schemaVersion?: number
}

export class ProjectRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  findAll(): Project[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
      .all()
    return rows.map((row) => mapProjectRow(row as Record<string, unknown>))
  }

  findById(id: string): Project | null {
    const row = this.getDb().prepare('SELECT * FROM projects WHERE id = ?').get(id)
    return row ? mapProjectRow(row as Record<string, unknown>) : null
  }

  create(input: CreateProjectInput): Project {
    return this.getDb().transaction(() => {
      const id = createId()
      const timestamp = nowIso()
      this.getDb()
        .prepare(
          `INSERT INTO projects (
            id, title, protagonist_id, network_mode, genre, schema_version, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.title,
          input.protagonistId ?? null,
          input.networkMode ?? 'single',
          input.genre ?? 'generic',
          SCHEMA_VERSION,
          timestamp,
          timestamp
        )

      return this.findById(id)!
    })()
  }

  update(id: string, input: UpdateProjectInput): Project | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    return this.getDb().transaction(() => {
      const updated: Project = {
        ...existing,
        title: input.title ?? existing.title,
        protagonistId:
          input.protagonistId === null ? undefined : (input.protagonistId ?? existing.protagonistId),
        networkMode: input.networkMode ?? existing.networkMode,
        genre: input.genre ?? existing.genre,
        schemaVersion: input.schemaVersion ?? existing.schemaVersion,
        updatedAt: nowIso()
      }

      this.getDb()
        .prepare(
          `UPDATE projects SET
            title = ?, protagonist_id = ?, network_mode = ?, genre = ?,
            schema_version = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.title,
          updated.protagonistId ?? null,
          updated.networkMode,
          updated.genre,
          updated.schemaVersion,
          updated.updatedAt,
          id
        )

      return this.findById(id)
    })()
  }

  delete(id: string): boolean {
    const result = this.getDb().prepare('DELETE FROM projects WHERE id = ?').run(id)
    return result.changes > 0
  }
}
