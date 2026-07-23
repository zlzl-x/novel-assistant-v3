import type Database from 'better-sqlite3'
import type { Chapter, ChapterMetadata } from '@novel-assistant/core'
import { countWords } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'
import { mapChapterMetadataRow, mapChapterRow } from '../utils/mappers'

export interface CreateChapterInput {
  projectId: string
  number: number
  title?: string
  rawText?: string
}

export interface UpdateChapterInput {
  number?: number
  title?: string
  rawText?: string
  lastCommittedAt?: string | null
}

export class ChapterRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  findByProject(projectId: string): Chapter[] {
    const rows = this.getDb()
      .prepare('SELECT * FROM chapters WHERE project_id = ? ORDER BY number ASC')
      .all(projectId)
    return rows.map((row) => mapChapterRow(row as Record<string, unknown>))
  }

  findMetadataByProject(projectId: string): ChapterMetadata[] {
    const rows = this.getDb()
      .prepare(
        `SELECT id, project_id, number, title, word_count, last_committed_at, created_at, updated_at
         FROM chapters
         WHERE project_id = ?
         ORDER BY number ASC`
      )
      .all(projectId)
    return rows.map((row) => mapChapterMetadataRow(row as Record<string, unknown>))
  }

  findById(id: string): Chapter | null {
    const row = this.getDb().prepare('SELECT * FROM chapters WHERE id = ?').get(id)
    return row ? mapChapterRow(row as Record<string, unknown>) : null
  }

  create(input: CreateChapterInput): Chapter {
    return this.getDb().transaction(() => {
      const id = createId()
      const timestamp = nowIso()
      const rawText = input.rawText ?? ''
      this.getDb()
        .prepare(
          `INSERT INTO chapters (
            id, project_id, number, title, raw_text, word_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.projectId,
          input.number,
          input.title ?? '',
          rawText,
          countWords(rawText),
          timestamp,
          timestamp
        )

      const created = this.findById(id)
      if (!created) {
        throw new Error('创建章节失败')
      }
      return created
    })()
  }

  update(id: string, input: UpdateChapterInput): Chapter | null {
    const existing = this.findById(id)
    if (!existing) {
      return null
    }

    return this.getDb().transaction(() => {
      const rawText = input.rawText ?? existing.rawText
      const updated: Chapter = {
        ...existing,
        number: input.number ?? existing.number,
        title: input.title ?? existing.title,
        rawText,
        wordCount: countWords(rawText),
        lastCommittedAt:
          input.lastCommittedAt === null
            ? undefined
            : (input.lastCommittedAt ?? existing.lastCommittedAt),
        updatedAt: nowIso()
      }

      this.getDb()
        .prepare(
          `UPDATE chapters SET
            number = ?, title = ?, raw_text = ?, word_count = ?,
            last_committed_at = ?, updated_at = ?
          WHERE id = ?`
        )
        .run(
          updated.number,
          updated.title,
          updated.rawText,
          updated.wordCount,
          updated.lastCommittedAt ?? null,
          updated.updatedAt,
          id
        )

      return this.findById(id)
    })()
  }

  delete(id: string): boolean {
    const result = this.getDb().prepare('DELETE FROM chapters WHERE id = ?').run(id)
    return result.changes > 0
  }

  getMaxNumber(projectId: string): number {
    const row = this.getDb()
      .prepare('SELECT MAX(number) AS max_number FROM chapters WHERE project_id = ?')
      .get(projectId) as { max_number: number | null }
    return row.max_number ?? 0
  }

  deleteAfter(projectId: string, chapterNumber: number): number {
    return this.getDb().transaction(() => {
      const result = this.getDb()
        .prepare('DELETE FROM chapters WHERE project_id = ? AND number > ?')
        .run(projectId, chapterNumber)
      return result.changes
    })()
  }

  reorder(projectId: string, orderedChapterIds: string[]): Chapter[] {
    const existing = this.findByProject(projectId)
    if (orderedChapterIds.length !== existing.length) {
      throw new Error('章节排序列表不完整')
    }

    const idSet = new Set(existing.map((chapter) => chapter.id))
    for (const id of orderedChapterIds) {
      if (!idSet.has(id)) {
        throw new Error('存在不属于该作品的章节')
      }
    }

    return this.getDb().transaction(() => {
      const timestamp = nowIso()
      orderedChapterIds.forEach((id, index) => {
        this.getDb()
          .prepare('UPDATE chapters SET number = ?, updated_at = ? WHERE id = ? AND project_id = ?')
          .run(-(index + 1), timestamp, id, projectId)
      })
      orderedChapterIds.forEach((id, index) => {
        this.getDb()
          .prepare('UPDATE chapters SET number = ?, updated_at = ? WHERE id = ? AND project_id = ?')
          .run(index + 1, timestamp, id, projectId)
      })
      return this.findByProject(projectId)
    })()
  }

  insertAfter(projectId: string, afterChapterId: string, title = ''): Chapter {
    const afterChapter = this.findById(afterChapterId)
    if (!afterChapter || afterChapter.projectId !== projectId) {
      throw new Error('章节不存在')
    }

    return this.getDb().transaction(() => {
      const timestamp = nowIso()
      this.getDb()
        .prepare(
          `UPDATE chapters SET number = number + 1, updated_at = ?
           WHERE project_id = ? AND number > ?`
        )
        .run(timestamp, projectId, afterChapter.number)

      const id = createId()
      this.getDb()
        .prepare(
          `INSERT INTO chapters (
            id, project_id, number, title, raw_text, word_count, created_at, updated_at
          ) VALUES (?, ?, ?, ?, '', 0, ?, ?)`
        )
        .run(id, projectId, afterChapter.number + 1, title, timestamp, timestamp)

      const inserted = this.findById(id)
      if (!inserted) {
        throw new Error('插入章节失败')
      }
      return inserted
    })()
  }
}
