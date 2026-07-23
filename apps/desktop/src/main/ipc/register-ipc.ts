import type { DatabaseManager } from '../services/database-manager'
import type { LlmProfileStore } from '../services/llm-profile-store'
import type { LlmService } from '../services/llm-client'
import type { StoragePathService } from '../services/storage-path'
import { registerChapterHandlers } from './chapter-handlers'
import { registerCharacterHandlers } from './character-handlers'
import { registerLlmHandlers } from './llm-handlers'
import { registerProjectHandlers } from './project-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerMapHandlers } from './map-handlers'
import { registerSettingModuleHandlers } from './setting-module-handlers'
import { registerImportHandlers, registerExportHandlers } from './import-export-handlers'
import { registerRecognitionHandlers } from './recognition-handlers'
import { registerStorageHandlers } from './storage-handlers'

export interface IpcHandlerDeps {
  storagePathService: StoragePathService
  databaseManager: DatabaseManager
  llmProfileStore: LlmProfileStore
  llmService: LlmService
  reopenDatabase: () => void
}

export function registerIpcHandlers(deps: IpcHandlerDeps): void {
  registerStorageHandlers({
    storagePathService: deps.storagePathService,
    databaseManager: deps.databaseManager,
    reopenDatabase: deps.reopenDatabase
  })
  registerProjectHandlers(deps.databaseManager)
  registerChapterHandlers(deps.databaseManager)
  registerCharacterHandlers(deps.databaseManager)
  registerRecognitionHandlers(deps.databaseManager)
  registerMapHandlers(deps.databaseManager, deps.storagePathService)
  registerSettingModuleHandlers(deps.databaseManager)
  registerImportHandlers(deps.databaseManager)
  registerExportHandlers(deps.databaseManager, deps.storagePathService)
  registerSettingsHandlers(deps.llmProfileStore)
  registerLlmHandlers(deps.llmService)
}
