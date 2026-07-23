import { app } from 'electron'
import { join } from 'node:path'
import {
  ensureStorageDirectory,
  getDatabasePath,
  getDefaultStoragePath,
  isDirectoryWritable,
  readPreferencesFile,
  writePreferencesFile,
  type UserPreferences
} from './storage-path-utils'

export class StoragePathService {
  private storagePath: string
  private readonly defaultPath: string
  private readonly bootstrapPreferencesPath: string

  constructor() {
    this.defaultPath = getDefaultStoragePath(app.getPath('documents'))
    this.bootstrapPreferencesPath = join(app.getPath('userData'), 'user-preferences.json')
    this.storagePath = this.loadInitialPath()
    ensureStorageDirectory(this.storagePath)
    this.persistPreferences(this.storagePath)
  }

  getPath(): { path: string; isDefault: boolean } {
    return {
      path: this.storagePath,
      isDefault: this.storagePath === this.defaultPath
    }
  }

  getDatabaseFilePath(): string {
    return getDatabasePath(this.storagePath)
  }

  getStorageDirectory(): string {
    return this.storagePath
  }

  setPath(nextPath: string): { path: string; reloadRequired: boolean } {
    const normalized = nextPath.trim()
    if (!normalized) {
      throw new Error('存储目录不能为空')
    }
    if (!isDirectoryWritable(normalized)) {
      throw new Error('目录不可写，请选择其他位置')
    }

    const changed = normalized !== this.storagePath
    this.storagePath = normalized
    ensureStorageDirectory(this.storagePath)
    this.persistPreferences(this.storagePath)

    return {
      path: this.storagePath,
      reloadRequired: changed
    }
  }

  private loadInitialPath(): string {
    const bootstrap = readPreferencesFile(this.bootstrapPreferencesPath)
    if (bootstrap && isDirectoryWritable(bootstrap.storagePath)) {
      return bootstrap.storagePath
    }

    const defaultWritable = isDirectoryWritable(this.defaultPath)
    if (defaultWritable) {
      return this.defaultPath
    }

    const fallback = app.getPath('userData')
    ensureStorageDirectory(fallback)
    return fallback
  }

  private persistPreferences(storagePath: string): void {
    const preferences: UserPreferences = { storagePath }
    writePreferencesFile(this.bootstrapPreferencesPath, preferences)
    writePreferencesFile(join(storagePath, 'user-preferences.json'), preferences)
  }
}
