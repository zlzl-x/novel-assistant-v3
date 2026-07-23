import { ipcMain } from 'electron'
import { IPC_CHANNELS, type SaveApiKeyInput, type SaveLlmProfileInput } from '@novel-assistant/core'
import type { LlmProfileStore } from '../services/llm-profile-store'
import { ipcWrap } from './ipc-utils'

export function registerSettingsHandlers(llmProfileStore: LlmProfileStore): void {
  ipcMain.handle(IPC_CHANNELS.settingsGetLlmProfiles, async () => {
    return ipcWrap(() => llmProfileStore.getProfiles())
  })

  ipcMain.handle(IPC_CHANNELS.settingsSaveLlmProfile, async (_event, input: SaveLlmProfileInput) => {
    return ipcWrap(() => llmProfileStore.saveProfile(input))
  })

  ipcMain.handle(IPC_CHANNELS.settingsSaveApiKey, async (_event, input: SaveApiKeyInput) => {
    return ipcWrap(() => llmProfileStore.saveApiKey(input.profileId, input.apiKey))
  })

  ipcMain.handle(IPC_CHANNELS.settingsDeleteLlmProfile, async (_event, profileId: string) => {
    return ipcWrap(() => llmProfileStore.deleteProfile(profileId))
  })

  ipcMain.handle(IPC_CHANNELS.settingsSetActiveLlmProfile, async (_event, profileId: string) => {
    return ipcWrap(() => llmProfileStore.setActiveProfile(profileId))
  })
}
