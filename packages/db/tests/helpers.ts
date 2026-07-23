import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseService } from '../src/database-service'

export function createTestDatabase(path = ':memory:'): DatabaseService {
  const service = new DatabaseService(path)
  service.connect()
  return service
}

export function createTempDatabaseFile(): { service: DatabaseService; filePath: string; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'novel-assistant-db-'))
  const filePath = join(dir, 'test.db')
  const service = createTestDatabase(filePath)

  return {
    service,
    filePath,
    cleanup: () => {
      service.close()
      rmSync(dir, { recursive: true, force: true })
    }
  }
}
