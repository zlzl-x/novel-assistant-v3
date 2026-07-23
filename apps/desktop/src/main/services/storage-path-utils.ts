import { accessSync, constants, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface UserPreferences {
  storagePath: string
}

export function getDefaultStoragePath(documentsPath: string): string {
  return join(documentsPath, 'NovelAssistantV3')
}

export function getDatabasePath(storagePath: string): string {
  return join(storagePath, 'novel-assistant.db')
}

export function isDirectoryWritable(directoryPath: string): boolean {
  try {
    if (!existsSync(directoryPath)) {
      mkdirSync(directoryPath, { recursive: true })
    }
    accessSync(directoryPath, constants.W_OK | constants.R_OK)
    const probeFile = join(directoryPath, `.write-probe-${Date.now()}`)
    writeFileSync(probeFile, 'ok', 'utf-8')
    rmSync(probeFile, { force: true })
    return true
  } catch {
    return false
  }
}

export function readPreferencesFile(preferencesPath: string): UserPreferences | null {
  if (!existsSync(preferencesPath)) {
    return null
  }
  try {
    const parsed = JSON.parse(readFileSync(preferencesPath, 'utf-8')) as UserPreferences
    if (typeof parsed.storagePath === 'string' && parsed.storagePath.length > 0) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function writePreferencesFile(preferencesPath: string, preferences: UserPreferences): void {
  writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2), 'utf-8')
}

export function ensureStorageDirectory(storagePath: string): void {
  if (!existsSync(storagePath)) {
    mkdirSync(storagePath, { recursive: true })
  }
}
