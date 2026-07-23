import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS, type ImportChaptersInput } from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import type { StoragePathService } from '../services/storage-path'
import { parseImportFile } from '../services/import-service'
import {
  defaultAllExportName,
  defaultProjectExportName,
  exportAllStorage,
  exportProjectBundle
} from '../services/export-service'
import { ipcWrap } from './ipc-utils'

export function registerImportHandlers(databaseManager: DatabaseManager): void {
  ipcMain.handle(IPC_CHANNELS.importPickAndParse, async () => {
    return ipcWrap(async () => {
      const result = await dialog.showOpenDialog({
        title: '导入文稿',
        properties: ['openFile'],
        filters: [
          { name: '文稿', extensions: ['txt', 'docx', 'html', 'htm'] }
        ]
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      const filePath = result.filePaths[0]
      if (!filePath) {
        return null
      }

      return parseImportFile(filePath)
    })
  })

  ipcMain.handle(IPC_CHANNELS.importChapters, async (_event, input: ImportChaptersInput) => {
    return ipcWrap(() => {
      if (!input.chapters.length) {
        throw new Error('没有可导入的章节')
      }

      const service = databaseManager.getService()
      if (input.mode === 'merge') {
        if (!input.mergeChapterId) {
          throw new Error('请选择要合并到的章节')
        }
        const existing = service.chapters.findById(input.mergeChapterId)
        if (!existing) {
          throw new Error('章节不存在')
        }
        const mergedText = [existing.rawText, ...input.chapters.map((chapter) => chapter.rawText)]
          .filter(Boolean)
          .join('\n\n')
        const updated = service.chapters.update(existing.id, { rawText: mergedText })
        if (!updated) {
          throw new Error('合并章节失败')
        }
        return [updated]
      }

      const existingChapters = service.chapters.findByProject(input.projectId)
      let nextNumber = existingChapters.reduce((max, chapter) => Math.max(max, chapter.number), 0)

      return input.chapters.map((chapter) => {
        nextNumber += 1
        return service.chapters.create({
          projectId: input.projectId,
          number: nextNumber,
          title: chapter.title || `第${nextNumber}章`,
          rawText: chapter.rawText
        })
      })
    })
  })
}

export function registerExportHandlers(
  databaseManager: DatabaseManager,
  storagePathService: StoragePathService
): void {
  ipcMain.handle(
    IPC_CHANNELS.exportProject,
    async (_event, input: { projectId: string; savePath?: string }) => {
      return ipcWrap(async () => {
        const service = databaseManager.getService()
        const project = service.projects.findById(input.projectId)
        if (!project) {
          throw new Error('作品不存在')
        }

        let destPath = input.savePath
        if (!destPath) {
          const result = await dialog.showSaveDialog({
            title: '导出作品备份',
            defaultPath: defaultProjectExportName(project.title),
            filters: [{ name: 'ZIP 备份', extensions: ['zip'] }]
          })
          if (result.canceled || !result.filePath) {
            throw new Error('已取消导出')
          }
          destPath = result.filePath
        }

        await exportProjectBundle(
          service,
          storagePathService.getStorageDirectory(),
          input.projectId,
          destPath
        )

        return { filePath: destPath }
      })
    }
  )

  ipcMain.handle(IPC_CHANNELS.exportAll, async () => {
    return ipcWrap(async () => {
      const result = await dialog.showSaveDialog({
        title: '导出全部数据',
        defaultPath: defaultAllExportName(),
        filters: [{ name: 'NAV3 备份', extensions: ['nav3'] }]
      })

      if (result.canceled || !result.filePath) {
        throw new Error('已取消导出')
      }

      await exportAllStorage(storagePathService.getStorageDirectory(), result.filePath)
      return { filePath: result.filePath }
    })
  })
}
