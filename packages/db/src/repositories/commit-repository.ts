import type Database from 'better-sqlite3'
import type { RecognitionCommit } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'
import { mapCommitRow } from '../utils/mappers'

export interface CreateCommitInput {
  chapterId: string
  chapterNumber: number
  modelProfile?: string
  acceptedFields: RecognitionCommit['acceptedFields']
  appearances: RecognitionCommit['appearances']
}

export class CommitRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  create(input: CreateCommitInput): RecognitionCommit {
    return this.getDb().transaction(() => {
      const id = createId()
      const committedAt = nowIso()

      this.getDb()
        .prepare(
          `INSERT INTO recognition_commits (
            id, chapter_id, chapter_number, committed_at, model_profile, appearances_json
          ) VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(
          id,
          input.chapterId,
          input.chapterNumber,
          committedAt,
          input.modelProfile ?? '',
          JSON.stringify(input.appearances)
        )

      const insertField = this.getDb().prepare(
        `INSERT INTO recognition_commit_fields (
          id, commit_id, character_id, field_key, old_value, new_value
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )

      for (const field of input.acceptedFields) {
        insertField.run(
          createId(),
          id,
          field.characterId,
          field.fieldKey,
          field.oldValue,
          field.newValue
        )
      }

      return this.findById(id)!
    })()
  }

  findByChapter(chapterId: string): RecognitionCommit[] {
    const rows = this.getDb()
      .prepare(
        'SELECT * FROM recognition_commits WHERE chapter_id = ? ORDER BY committed_at ASC'
      )
      .all(chapterId)

    return rows.map((row) => this.hydrateCommit(row as Record<string, unknown>))
  }

  findById(id: string): RecognitionCommit | null {
    const row = this.getDb().prepare('SELECT * FROM recognition_commits WHERE id = ?').get(id)
    return row ? this.hydrateCommit(row as Record<string, unknown>) : null
  }

  private hydrateCommit(row: Record<string, unknown>): RecognitionCommit {
    const fields = this.getDb()
      .prepare(
        `SELECT character_id, field_key, old_value, new_value
         FROM recognition_commit_fields WHERE commit_id = ?`
      )
      .all(row.id as string)
      .map((item) => {
        const field = item as {
          character_id: string
          field_key: string
          old_value: string
          new_value: string
        }
        return {
          characterId: field.character_id,
          fieldKey: field.field_key,
          oldValue: field.old_value,
          newValue: field.new_value
        }
      })

    const appearances = JSON.parse(
      (row.appearances_json as string | undefined) ?? '[]'
    ) as RecognitionCommit['appearances']

    return mapCommitRow(row, fields, appearances)
  }
}
