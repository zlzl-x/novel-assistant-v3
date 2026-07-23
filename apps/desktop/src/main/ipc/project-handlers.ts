import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@novel-assistant/core'
import type { CreateProjectInput, UpdateProjectInput } from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import { ipcWrap } from './ipc-utils'

export function registerProjectHandlers(databaseManager: DatabaseManager): void {
  ipcMain.handle(IPC_CHANNELS.projectsList, async () => {
    return ipcWrap(() => databaseManager.getService().projects.findAll())
  })

  ipcMain.handle(IPC_CHANNELS.projectsCreate, async (_event, input: CreateProjectInput) => {
    return ipcWrap(() => databaseManager.getService().projects.create(input))
  })

  ipcMain.handle(IPC_CHANNELS.projectsUpdate, async (_event, input: UpdateProjectInput) => {
    return ipcWrap(() => {
      const updated = databaseManager.getService().projects.update(input.id, input)
      if (!updated) {
        throw new Error('作品不存在')
      }
      return updated
    })
  })

  ipcMain.handle(IPC_CHANNELS.projectsDelete, async (_event, id: string) => {
    return ipcWrap(() => databaseManager.getService().projects.delete(id))
  })
}
