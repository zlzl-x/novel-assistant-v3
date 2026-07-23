import { ipcMain } from 'electron'
import {
  IPC_CHANNELS,
  type CreateSettingModuleInput,
  type ReorderSettingModulesInput,
  type UpdateSettingModuleInput
} from '@novel-assistant/core'
import type { DatabaseManager } from '../services/database-manager'
import { ipcWrap } from './ipc-utils'

function assertTitle(title: string | undefined): string {
  const trimmed = title?.trim()
  if (!trimmed) {
    throw new Error('模块标题不能为空')
  }
  return trimmed
}

export function registerSettingModuleHandlers(databaseManager: DatabaseManager): void {
  const settings = () => databaseManager.getService().settings

  ipcMain.handle(IPC_CHANNELS.settingModulesList, async (_event, projectId: string) => {
    return ipcWrap(() => settings().findByProject(projectId))
  })

  ipcMain.handle(IPC_CHANNELS.settingModulesCreate, async (_event, input: CreateSettingModuleInput) => {
    return ipcWrap(() =>
      settings().create({
        ...input,
        title: assertTitle(input.title)
      })
    )
  })

  ipcMain.handle(IPC_CHANNELS.settingModulesUpdate, async (_event, input: UpdateSettingModuleInput) => {
    return ipcWrap(() => {
      const updated = settings().update(input.id, {
        type: input.type,
        title: input.title !== undefined ? assertTitle(input.title) : undefined,
        collapsed: input.collapsed,
        payload: input.payload
      })
      if (!updated) {
        throw new Error('设定模块不存在')
      }
      return updated
    })
  })

  ipcMain.handle(IPC_CHANNELS.settingModulesDelete, async (_event, id: string) => {
    return ipcWrap(() => {
      const deleted = settings().delete(id)
      if (!deleted) {
        throw new Error('设定模块不存在')
      }
      return true
    })
  })

  ipcMain.handle(
    IPC_CHANNELS.settingModulesReorder,
    async (_event, input: ReorderSettingModulesInput) => {
      return ipcWrap(() => settings().reorder(input.projectId, input.orderedModuleIds))
    }
  )
}
