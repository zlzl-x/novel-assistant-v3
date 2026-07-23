import { ipcMain } from 'electron'
import { IPC_CHANNELS, type LlmCompleteInput, type LlmTestConnectionInput } from '@novel-assistant/core'
import type { LlmService } from '../services/llm-client'
import { ipcWrap } from './ipc-utils'

export function registerLlmHandlers(llmService: LlmService): void {
  ipcMain.handle(IPC_CHANNELS.llmComplete, async (_event, input: LlmCompleteInput) => {
    return ipcWrap(() => llmService.complete(input))
  })

  ipcMain.handle(IPC_CHANNELS.llmTestConnection, async (_event, input?: LlmTestConnectionInput) => {
    return ipcWrap(() => llmService.testConnection(input?.profileId))
  })

  ipcMain.handle(IPC_CHANNELS.llmAbort, async (_event, requestId: string) => {
    return ipcWrap(() => llmService.abort(requestId))
  })
}