import type Database from 'better-sqlite3'
import type { CharacterAppearance } from '@novel-assistant/core'
import { createId, nowIso } from '../utils/ids'

export interface AppendAppearanceInput {
  characterId: string
  chapterId: string
  chapterNumber: number
  mentionCount: number
  excerpt?: string
  committedAt?: string
}

export class AppearanceRepository {
  constructor(private readonly getDb: () => Database.Database) {}

  append(input: AppendAppearanceInput): CharacterAppearance {
    return this.getDb().transaction(() => {
      const committedAt = input.committedAt ?? nowIso()
      const existing = this.getDb()
        .prepare(
          'SELECT id FROM character_appearances WHERE character_id = ? AND chapter_id = ?'
        )
        .get(input.characterId, input.chapterId) as { id: string } | undefined

      if (existing) {
        this.getDb()
          .prepare(
            `UPDATE character_appearances SET
              chapter_number = ?, mention_count = ?, committed_at = ?, excerpt = ?
            WHERE id = ?`
          )
          .run(
            input.chapterNumber,
            input.mentionCount,
            committedAt,
            input.excerpt ?? null,
            existing.id
          )
      } else {
        this.getDb()
          .prepare(
            `INSERT INTO character_appearances (
              id, character_id, chapter_id, chapter_number, mention_count, committed_at, excerpt
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            createId(),
            input.characterId,
            input.chapterId,
            input.chapterNumber,
            input.mentionCount,
            committedAt,
            input.excerpt ?? null
          )
      }

      const row = this.getDb()
        .prepare(
          `SELECT chapter_id, chapter_number, mention_count, committed_at, excerpt
           FROM character_appearances
           WHERE character_id = ? AND chapter_id = ?`
        )
        .get(input.characterId, input.chapterId) as {
        chapter_id: string
        chapter_number: number
        mention_count: number
        committed_at: string
        excerpt: string | null
      }

      return {
        chapterId: row.chapter_id,
        chapterNumber: row.chapter_number,
        mentionCount: row.mention_count,
        committedAt: row.committed_at,
        excerpt: row.excerpt ?? undefined
      }
    })()
  }

  findByCharacter(characterId: string): CharacterAppearance[] {
    const rows = this.getDb()
      .prepare(
        `SELECT chapter_id, chapter_number, mention_count, committed_at, excerpt
         FROM character_appearances
         WHERE character_id = ?
         ORDER BY chapter_number ASC`
      )
      .all(characterId) as Array<{
      chapter_id: string
      chapter_number: number
      mention_count: number
      committed_at: string
      excerpt: string | null
    }>

    return rows.map((row) => ({
      chapterId: row.chapter_id,
      chapterNumber: row.chapter_number,
      mentionCount: row.mention_count,
      committedAt: row.committed_at,
      excerpt: row.excerpt ?? undefined
    }))
  }

  findByChapter(chapterId: string): Array<CharacterAppearance & { characterId: string }> {
    const rows = this.getDb()
      .prepare(
        `SELECT character_id, chapter_id, chapter_number, mention_count, committed_at, excerpt
         FROM character_appearances
         WHERE chapter_id = ?
         ORDER BY chapter_number ASC`
      )
      .all(chapterId) as Array<{
      character_id: string
      chapter_id: string
      chapter_number: number
      mention_count: number
      committed_at: string
      excerpt: string | null
    }>

    return rows.map((row) => ({
      characterId: row.character_id,
      chapterId: row.chapter_id,
      chapterNumber: row.chapter_number,
      mentionCount: row.mention_count,
      committedAt: row.committed_at,
      excerpt: row.excerpt ?? undefined
    }))
  }
}
