import type Database from 'better-sqlite3'
import initialMigration from './migrations/001_initial.sql?raw'

interface MigrationDefinition {
  version: number
  sql: string
}

const MIGRATIONS: MigrationDefinition[] = [{ version: 1, sql: initialMigration }]

export class MigrationRunner {
  constructor(private readonly db: Database.Database) {}

  run(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
    `)

    const applied = new Set(
      this.db
        .prepare('SELECT version FROM schema_migrations ORDER BY version')
        .all()
        .map((row) => (row as { version: number }).version)
    )

    for (const migration of MIGRATIONS) {
      if (applied.has(migration.version)) {
        continue
      }

      this.db.transaction(() => {
        this.db.exec(migration.sql)
        this.db
          .prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)')
          .run(migration.version, new Date().toISOString())
      })()
    }
  }

  getCurrentVersion(): number {
    const row = this.db
      .prepare('SELECT MAX(version) AS version FROM schema_migrations')
      .get() as { version: number | null }
    return row.version ?? 0
  }
}
