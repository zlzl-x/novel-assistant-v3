import { describe, expect, it } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  getDatabasePath,
  getDefaultStoragePath,
  isDirectoryWritable,
  readPreferencesFile,
  writePreferencesFile
} from '../src/main/services/storage-path-utils'

describe('storage-path-utils', () => {
  it('builds default and database paths', () => {
    expect(getDefaultStoragePath('/docs')).toBe(join('/docs', 'NovelAssistantV3'))
    expect(getDatabasePath('/data')).toBe(join('/data', 'novel-assistant.db'))
  })

  it('checks directory writable and persists preferences', () => {
    const dir = mkdtempSync(join(tmpdir(), 'novel-storage-'))
    try {
      expect(isDirectoryWritable(dir)).toBe(true)

      const preferencesPath = join(dir, 'user-preferences.json')
      writePreferencesFile(preferencesPath, { storagePath: dir })
      expect(readPreferencesFile(preferencesPath)?.storagePath).toBe(dir)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
