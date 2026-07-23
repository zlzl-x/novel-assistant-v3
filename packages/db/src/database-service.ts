import Database from 'better-sqlite3'
import { MigrationRunner } from './migration-runner'
import { ProjectRepository } from './repositories/project-repository'
import { ChapterRepository } from './repositories/chapter-repository'
import { CharacterRepository } from './repositories/character-repository'
import { AppearanceRepository } from './repositories/appearance-repository'
import { CommitRepository } from './repositories/commit-repository'
import { MapRepository } from './repositories/map-repository'
import { SettingRepository } from './repositories/setting-repository'

export class DatabaseService {
  private db: Database.Database | null = null
  readonly projects: ProjectRepository
  readonly chapters: ChapterRepository
  readonly characters: CharacterRepository
  readonly appearances: AppearanceRepository
  readonly commits: CommitRepository
  readonly maps: MapRepository
  readonly settings: SettingRepository

  constructor(private readonly dbPath: string) {
    this.projects = new ProjectRepository(() => this.getDatabase())
    this.chapters = new ChapterRepository(() => this.getDatabase())
    this.characters = new CharacterRepository(() => this.getDatabase())
    this.appearances = new AppearanceRepository(() => this.getDatabase())
    this.commits = new CommitRepository(() => this.getDatabase())
    this.maps = new MapRepository(() => this.getDatabase())
    this.settings = new SettingRepository(() => this.getDatabase())
  }

  get path(): string {
    return this.dbPath
  }

  connect(): void {
    if (this.db) {
      return
    }

    this.db = new Database(this.dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    new MigrationRunner(this.db).run()
  }

  getDatabase(): Database.Database {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.')
    }
    return this.db
  }

  getSchemaVersion(): number {
    return new MigrationRunner(this.getDatabase()).getCurrentVersion()
  }

  transaction<T>(fn: () => T): T {
    return this.getDatabase().transaction(fn)()
  }

  close(): void {
    this.db?.close()
    this.db = null
  }
}
