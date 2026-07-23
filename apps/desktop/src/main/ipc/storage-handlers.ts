import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import type { StoragePathService } from '../services/storage-path'
import { ipcWrap } from './ipc-utils'

interface StorageHandlerDeps {
  storagePathService: StoragePathService
  databaseManager: DatabaseManager
  reopenDatabase: () => void
}

export function registerStorageHandlers(deps: StorageHandlerDeps): void {
  ipcMain.handle(IPC_CHANNELS.storageGetPath, async () => {
    return ipcWrap(() => deps.storagePathService.getPath())
  })

  ipcMain.handle(IPC_CHANNELS.storageSetPath, async (_event, path: string) => {
    return ipcWrap(() => {
      deps.databaseManager.close()
      const result = deps.storagePathService.setPath(path)
      deps.reopenDatabase()
      return result
    })
  })

  ipcMain.handle(IPC_CHANNELS.storagePickDirectory, async () => {
    return ipcWrap(async () => {
      const current = deps.storagePathService.getPath()
      const result = await dialog.showOpenDialog({
        title: '选择数据存储目录',
        defaultPath: current.path,
        properties: ['openDirectory', 'createDirectory']
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const selectedPath = result.filePaths[0]
      if (!selectedPath) {
        return null
      }

      deps.databaseManager.close()
      const setResult = deps.storagePathService.setPath(selectedPath)
      deps.reopenDatabase()

      return {
        path: setResult.path,
        isDefault: false
      }
    })
  })
}
