import { DatabaseService } from '@novel-assistant/db'

export class DatabaseManager {
  private static instance: DatabaseManager | null = null
  private service: DatabaseService | null = null
  private dbPath: string | null = null

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager()
    }
    return DatabaseManager.instance
  }

  open(dbPath: string): void {
    if (this.service && this.dbPath === dbPath) {
      return
    }

    this.close()
    this.service = new DatabaseService(dbPath)
    this.service.connect()
    this.dbPath = dbPath
  }

  close(): void {
    this.service?.close()
    this.service = null
    this.dbPath = null
  }

  getService(): DatabaseService {
    if (!this.service) {
      throw new Error('数据库尚未打开')
    }
    return this.service
  }

  getDbPath(): string | null {
    return this.dbPath
  }
}
