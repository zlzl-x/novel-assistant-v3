import { ipcMain } from 'electron'
import { IPC_CHANNELS, type ReorderChaptersInput, type SaveChapterInput } from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import { ipcWrap } from './ipc-utils'

export function registerChapterHandlers(databaseManager: DatabaseManager): void {
  ipcMain.handle(IPC_CHANNELS.chaptersList, async (_event, projectId: string) => {
    return ipcWrap(() => databaseManager.getService().chapters.findByProject(projectId))
  })

  ipcMain.handle(IPC_CHANNELS.chaptersListMetadata, async (_event, projectId: string) => {
    return ipcWrap(() => databaseManager.getService().chapters.findMetadataByProject(projectId))
  })

  ipcMain.handle(IPC_CHANNELS.chaptersGet, async (_event, id: string) => {
    return ipcWrap(() => databaseManager.getService().chapters.findById(id))
  })

  ipcMain.handle(IPC_CHANNELS.chaptersSave, async (_event, input: SaveChapterInput) => {
    return ipcWrap(() => {
      const chapters = databaseManager.getService().chapters
      if (input.id) {
        const updated = chapters.update(input.id, {
          number: input.number,
          title: input.title,
          rawText: input.rawText,
          lastCommittedAt: input.lastCommittedAt
        })
        if (!updated) {
          throw new Error('章节不存在')
        }
        return updated
      }

      return chapters.create({
        projectId: input.projectId,
        number: input.number,
        title: input.title,
        rawText: input.rawText
      })
    })
  })

  ipcMain.handle(IPC_CHANNELS.chaptersDelete, async (_event, id: string) => {
    return ipcWrap(() => databaseManager.getService().chapters.delete(id))
  })

  ipcMain.handle(IPC_CHANNELS.chaptersDeleteAfter, async (_event, projectId: string, chapterNumber: number) => {
    return ipcWrap(() => databaseManager.getService().chapters.deleteAfter(projectId, chapterNumber))
  })

  ipcMain.handle(IPC_CHANNELS.chaptersReorder, async (_event, input: ReorderChaptersInput) => {
    return ipcWrap(() =>
      databaseManager.getService().chapters.reorder(input.projectId, input.orderedChapterIds)
    )
  })

  ipcMain.handle(
    IPC_CHANNELS.chaptersInsertAfter,
    async (_event, projectId: string, afterChapterId: string, title?: string) => {
      return ipcWrap(() =>
        databaseManager.getService().chapters.insertAfter(projectId, afterChapterId, title)
      )
    }
  )
}
