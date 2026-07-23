import { randomUUID } from 'node:crypto'
import { ipcMain } from 'electron'
import {
  applyRecognitionCommit,
  IPC_CHANNELS,
  validateCommitInput,
  type Character,
  type CreateCharacterInput,
  type FieldWithHistory,
  type RecognitionCommitInput
} from '@novel-assistant/core'
import type { UpdateCharacterInput } from '@novel-assistant/db'
import type { DatabaseManager } from '../services/database-manager'
import { ipcWrap } from './ipc-utils'

type HistoryFieldKey = 'identity' | 'realm' | 'location' | 'faction'

function collectNewStandardHistory(
  before: FieldWithHistory<string> | undefined,
  after: FieldWithHistory<string> | undefined,
  fieldKey: HistoryFieldKey,
  chapterId: string,
  chapterNumber: number,
  committedAt: string
): NonNullable<UpdateCharacterInput['appendFieldHistory']> {
  if (!after) return []
  const previousLength = before?.history.length ?? 0
  return after.history.slice(previousLength).map((entry) => ({
    fieldKey,
    value: entry.value,
    chapterId: entry.chapterId ?? chapterId,
    chapterNumber: entry.chapterNumber ?? chapterNumber,
    source: entry.source,
    excerpt: entry.excerpt,
    recognizedAt: entry.recognizedAt ?? committedAt
  }))
}

function characterToUpdateInput(before: Character, after: Character, committedAt: string): UpdateCharacterInput {
  const chapterId = after.lastAppearance?.chapterId ?? after.firstAppearance?.chapterId ?? ''
  const chapterNumber = after.lastAppearance?.chapterNumber ?? after.firstAppearance?.chapterNumber ?? 0

  return {
    name: after.name,
    aliases: after.aliases,
    disambiguation: after.disambiguation,
    role: after.role,
    status: after.status ?? null,
    protagonistRelation: after.protagonistRelation ?? null,
    panel: after.panel,
    mentionCount: after.mentionCount,
    firstAppearance: after.firstAppearance ?? null,
    lastAppearance: after.lastAppearance ?? null,
    identitySnapshot: after.identity,
    realmSnapshot: after.realm,
    locationSnapshot: after.location,
    factionSnapshot: after.faction ?? null,
    appendFieldHistory: [
      ...collectNewStandardHistory(before.identity, after.identity, 'identity', chapterId, chapterNumber, committedAt),
      ...collectNewStandardHistory(before.realm, after.realm, 'realm', chapterId, chapterNumber, committedAt),
      ...collectNewStandardHistory(before.location, after.location, 'location', chapterId, chapterNumber, committedAt),
      ...collectNewStandardHistory(before.faction, after.faction, 'faction', chapterId, chapterNumber, committedAt)
    ]
  }
}

export function registerRecognitionHandlers(databaseManager: DatabaseManager): void {
  ipcMain.handle(IPC_CHANNELS.recognitionCommit, async (_event, input: RecognitionCommitInput) => {
    return ipcWrap(() => {
      const service = databaseManager.getService()
      const chapter = service.chapters.findById(input.chapterId)
      if (!chapter) {
        throw new Error('章节不存在')
      }

      const maxNumber = service.chapters.getMaxNumber(chapter.projectId)
      const isLatestChapter = chapter.number === maxNumber
      const validationError = validateCommitInput({
        isLatestChapter,
        ambiguousCount: input.ambiguousCount,
        acceptedByCharacter: input.acceptedByCharacter,
        appearanceCount: input.appearances.length
      })
      if (validationError) {
        throw new Error(validationError)
      }

      const characters = service.characters.findByProject(chapter.projectId)
      const committedAt = new Date().toISOString()
      const commitId = randomUUID()
      const result = applyRecognitionCommit({
        chapter,
        characters,
        acceptedByCharacter: input.acceptedByCharacter,
        appearances: input.appearances,
        newAliasesByCharacter: input.newAliasesByCharacter,
        relationsByCharacter: input.relationsByCharacter,
        protagonistRelationsByCharacter: input.protagonistRelationsByCharacter,
        modelProfile: input.modelProfile,
        commitId,
        committedAt,
        characterRegistry: characters.map((character) => ({
          id: character.id,
          name: character.name,
          aliases: character.aliases
        }))
      })

      return service.transaction(() => {
        const beforeMap = new Map(characters.map((character) => [character.id, character]))
        const savedCharacters: Character[] = []

        for (const updated of result.updatedCharacters) {
          const before = beforeMap.get(updated.id)
          if (!before) continue
          service.characters.update(updated.id, characterToUpdateInput(before, updated, committedAt))

          if (input.relationsByCharacter?.[updated.id]?.length) {
            service.characters.upsertRelations(
              updated.id,
              updated.relations.map((relation) => ({
                targetCharacterId: relation.targetCharacterId,
                type: relation.type,
                label: relation.label,
                strength: relation.strength,
                sinceChapter: relation.sinceChapter,
                notes: relation.notes
              }))
            )
          }

          const saved = service.characters.findById(updated.id)
          if (saved) savedCharacters.push(saved)
        }

        for (const appearance of input.appearances) {
          service.appearances.append({
            characterId: appearance.characterId,
            chapterId: chapter.id,
            chapterNumber: chapter.number,
            mentionCount: appearance.mentionCount,
            excerpt: appearance.excerpt,
            committedAt
          })
        }

        const commit = service.commits.create({
          chapterId: chapter.id,
          chapterNumber: chapter.number,
          modelProfile: input.modelProfile,
          acceptedFields: result.commit.acceptedFields,
          appearances: result.commit.appearances
        })

        service.chapters.update(chapter.id, { lastCommittedAt: committedAt })

        return {
          commit,
          characters: savedCharacters
        }
      })
    })
  })
}
