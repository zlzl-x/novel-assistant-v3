import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  type CreateCharacterInput,
  type MergeCharactersInput,
  type SearchCharactersInput,
  type UpdateCharacterInput
} from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import { ipcWrap } from './ipc-utils'

function assertName(name: string | undefined): string {
  const trimmed = name?.trim()
  if (!trimmed) {
    throw new Error('角色名不能为空')
  }
  return trimmed
}

function assertDisambiguationOnConflict(
  projectId: string,
  name: string,
  disambiguation: string | undefined,
  excludeId: string | undefined,
  databaseManager: DatabaseManager
): void {
  const duplicates = databaseManager
    .getService()
    .characters.findByName(projectId, name)
    .filter((character) => character.id !== excludeId)
  if (duplicates.length > 0 && !disambiguation?.trim()) {
    throw new Error(`已存在同名角色「${name}」，请填写区分标识`)
  }
}

function enforceUniqueProtagonist(
  projectId: string,
  protagonistId: string,
  databaseManager: DatabaseManager
): void {
  const characters = databaseManager.getService().characters.findByProject(projectId)
  for (const character of characters) {
    if (character.id !== protagonistId && character.role === 'protagonist') {
      databaseManager.getService().characters.update(character.id, { role: 'major' })
    }
  }
}

export function registerCharacterHandlers(databaseManager: DatabaseManager): void {
  ipcMain.handle(IPC_CHANNELS.charactersList, async (_event, projectId: string) => {
    return ipcWrap(() => databaseManager.getService().characters.findByProject(projectId))
  })

  ipcMain.handle(IPC_CHANNELS.charactersGet, async (_event, id: string) => {
    return ipcWrap(() => databaseManager.getService().characters.findById(id))
  })

  ipcMain.handle(IPC_CHANNELS.charactersSearch, async (_event, input: SearchCharactersInput) => {
    return ipcWrap(() =>
      databaseManager
        .getService()
        .characters.search(input.projectId, input.query.trim(), input.limit ?? 50)
    )
  })

  ipcMain.handle(IPC_CHANNELS.charactersCreate, async (_event, input: CreateCharacterInput) => {
    return ipcWrap(() => {
      const name = assertName(input.name)
      assertDisambiguationOnConflict(input.projectId, name, input.disambiguation, undefined, databaseManager)
      const created = databaseManager.getService().characters.create({ ...input, name })
      if (created.role === 'protagonist') {
        enforceUniqueProtagonist(input.projectId, created.id, databaseManager)
      }
      return databaseManager.getService().characters.findById(created.id)!
    })
  })

  ipcMain.handle(IPC_CHANNELS.charactersUpdate, async (_event, input: UpdateCharacterInput) => {
    return ipcWrap(() => {
      const existing = databaseManager.getService().characters.findById(input.id)
      if (!existing) {
        throw new Error('角色不存在')
      }

      const name = input.name !== undefined ? assertName(input.name) : existing.name
      assertDisambiguationOnConflict(
        existing.projectId,
        name,
        input.disambiguation ?? existing.disambiguation,
        input.id,
        databaseManager
      )

      if (input.role === 'protagonist') {
        enforceUniqueProtagonist(existing.projectId, input.id, databaseManager)
      }

      const updated = databaseManager.getService().characters.update(input.id, {
        ...input,
        name
      })
      if (!updated) {
        throw new Error('更新角色失败')
      }
      return updated
    })
  })

  ipcMain.handle(IPC_CHANNELS.charactersDelete, async (_event, id: string) => {
    return ipcWrap(() => {
      const existing = databaseManager.getService().characters.findById(id)
      if (!existing) {
        throw new Error('角色不存在')
      }

      const deleted = databaseManager.getService().characters.delete(id)
      if (!deleted) {
        throw new Error('删除角色失败')
      }

      const project = databaseManager.getService().projects.findById(existing.projectId)
      if (project?.protagonistId === id) {
        databaseManager.getService().projects.update(existing.projectId, { protagonistId: null })
      }

      return true
    })
  })

  ipcMain.handle(IPC_CHANNELS.charactersMerge, async (_event, input: MergeCharactersInput) => {
    return ipcWrap(() => {
      const primary = databaseManager.getService().characters.findById(input.primaryId)
      const secondary = databaseManager.getService().characters.findById(input.secondaryId)
      if (!primary || !secondary) {
        throw new Error('角色不存在')
      }
      if (primary.projectId !== secondary.projectId) {
        throw new Error('只能合并同一作品内的角色')
      }

      const merged = databaseManager.getService().characters.merge(input.primaryId, input.secondaryId)

      const project = databaseManager.getService().projects.findById(primary.projectId)
      if (project?.protagonistId === input.secondaryId) {
        databaseManager.getService().projects.update(primary.projectId, {
          protagonistId: merged.id
        })
        if (merged.role !== 'protagonist') {
          databaseManager.getService().characters.update(merged.id, { role: 'protagonist' })
        }
        enforceUniqueProtagonist(primary.projectId, merged.id, databaseManager)
      }

      return databaseManager.getService().characters.findById(merged.id)!
    })
  })
}
