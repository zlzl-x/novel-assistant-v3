import type Database from 'better-sqlite3'
import type { SettingModule, SettingModulePayload } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'
import { mapSettingModuleRow } from '../utils/mappers'

export interface CreateSettingModuleInput {
  projectId: string
  type: SettingModule['type']
  title: string
  order?: number
  collapsed?: boolean
  payload?: SettingModulePayload
}

export interface UpdateSettingModuleInput {
  type?: SettingModule['type']
  title?: string
  collapsed?: boolean
  payload?: SettingModulePayload
}

export class SettingRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  findByProject(projectId: string): SettingModule[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM setting_modules WHERE project_id = ? ORDER BY sort_order ASC')
      .all(projectId)
    return rows.map((row) => mapSettingModuleRow(row as Record<string, unknown>))
  }

  findById(id: string): SettingModule | null {
    const row = this.getDb().prepare('SELECT * FROM setting_modules WHERE id = ?').get(id)
    return row ? mapSettingModuleRow(row as Record<string, unknown>) : null
  }

  create(input: CreateSettingModuleInput): SettingModule {
    return this.getDb().transaction(() => {
      const id = createId()
      const timestamp = nowIso()
      const order = input.order ?? this.getNextOrder(input.projectId)

      this.getDb()
        .prepare(
          `INSERT INTO setting_modules (
            id, project_id, type, title, sort_order, collapsed, payload_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.projectId,
          input.type,
          input.title,
          order,
          input.collapsed ? 1 : 0,
          JSON.stringify(input.payload ?? {}),
          timestamp,
          timestamp
        )

      return this.findById(id)!
    })()
  }

  update(id: string, input: UpdateSettingModuleInput): SettingModule | null {
    const existing = this.findById(id)
    if (!existing) return null

    return this.getDb().transaction(() => {
      const updated: SettingModule = {
        ...existing,
        type: input.type ?? existing.type,
        title: input.title ?? existing.title,
        collapsed: input.collapsed ?? existing.collapsed,
        payload: input.payload ?? existing.payload,
        updatedAt: nowIso()
      }

      this.getDb()
        .prepare(
          `UPDATE setting_modules SET
            type = ?, title = ?, collapsed = ?, payload_json = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.type,
          updated.title,
          updated.collapsed ? 1 : 0,
          JSON.stringify(updated.payload),
          updated.updatedAt,
          id
        )

      return this.findById(id)
    })()
  }

  delete(id: string): boolean {
    const result = this.getDb().prepare('DELETE FROM setting_modules WHERE id = ?').run(id)
    return result.changes > 0
  }

  reorder(projectId: string, orderedIds: string[]): SettingModule[] {
    return this.getDb().transaction(() => {
      const update = this.getDb().prepare(
        'UPDATE setting_modules SET sort_order = ?, updated_at = ? WHERE id = ? AND project_id = ?'
      )
      const timestamp = nowIso()

      orderedIds.forEach((moduleId, index) => {
        update.run(index, timestamp, moduleId, projectId)
      })

      return this.findByProject(projectId)
    })()
  }

  private getNextOrder(projectId: string): number {
    const row = this.getDb()
      .prepare('SELECT MAX(sort_order) AS max_order FROM setting_modules WHERE project_id = ?')
      .get(projectId) as { max_order: number | null }
    return (row.max_order ?? -1) + 1
  }
}
