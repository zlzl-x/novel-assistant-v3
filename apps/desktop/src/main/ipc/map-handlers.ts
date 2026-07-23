import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  type CreateMapNodeInput,
  type CreateMapWorldInput,
  type SaveMapGeneratedCodeInput,
  type UpdateMapNodeInput,
  type UpdateMapWorldInput
} from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import type { StoragePathService } from '../services/storage-path'
import { ipcWrap } from './ipc-utils'

function backupGeneratedCode(storageDir: string, worldId: string, version: number, code: string): void {
  const dir = join(storageDir, 'map', 'views')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(join(dir, `${worldId}.v${version}.html`), code, 'utf-8')
}

export function registerMapHandlers(
  databaseManager: DatabaseManager,
  storagePathService: StoragePathService
): void {
  const maps = () => databaseManager.getService().maps

  ipcMain.handle(IPC_CHANNELS.mapsListWorlds, async (_event, projectId: string) => {
    return ipcWrap(() => maps().findWorldsByProject(projectId))
  })

  ipcMain.handle(IPC_CHANNELS.mapsGetWorld, async (_event, id: string) => {
    return ipcWrap(() => maps().findWorldById(id))
  })

  ipcMain.handle(IPC_CHANNELS.mapsCreateWorld, async (_event, input: CreateMapWorldInput) => {
    return ipcWrap(() => maps().createWorld(input))
  })

  ipcMain.handle(IPC_CHANNELS.mapsUpdateWorld, async (_event, input: UpdateMapWorldInput) => {
    return ipcWrap(() => {
      const { id, ...patch } = input
      return maps().updateWorld(id, patch)
    })
  })

  ipcMain.handle(IPC_CHANNELS.mapsDeleteWorld, async (_event, id: string) => {
    return ipcWrap(() => maps().deleteWorld(id))
  })

  ipcMain.handle(IPC_CHANNELS.mapsListNodes, async (_event, worldId: string) => {
    return ipcWrap(() => maps().findNodesByWorld(worldId))
  })

  ipcMain.handle(IPC_CHANNELS.mapsCreateNode, async (_event, input: CreateMapNodeInput) => {
    return ipcWrap(() => maps().createNode(input))
  })

  ipcMain.handle(IPC_CHANNELS.mapsUpdateNode, async (_event, input: UpdateMapNodeInput) => {
    return ipcWrap(() => {
      const { id, ...patch } = input
      return maps().updateNode(id, patch)
    })
  })

  ipcMain.handle(IPC_CHANNELS.mapsDeleteNode, async (_event, id: string) => {
    return ipcWrap(() => maps().deleteNode(id))
  })

  ipcMain.handle(IPC_CHANNELS.mapsSaveGeneratedCode, async (_event, input: SaveMapGeneratedCodeInput) => {
    return ipcWrap(() => {
      const existing = maps().findWorldById(input.worldId)
      if (!existing) {
        throw new Error('地图世界不存在')
      }

      if (existing.generatedCode) {
        backupGeneratedCode(
          storagePathService.getStorageDirectory(),
          existing.id,
          existing.codeVersion,
          existing.generatedCode
        )
      }

      const nextVersion = existing.codeVersion + 1
      const committedAt = new Date().toISOString()
      const updated = maps().updateWorld(input.worldId, {
        generatedCode: input.code,
        codeGeneratedAt: committedAt,
        codeVersion: nextVersion
      })
      if (!updated) {
        throw new Error('保存地图代码失败')
      }
      return updated
    })
  })
}
