import { createWriteStream, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import archiver from 'archiver'
import { SCHEMA_VERSION } from '@novel-assistant/core'
import type { DatabaseService } from '@novel-assistant/db'

export interface ProjectExportBundle {
  version: number
  schemaVersion: number
  exportedAt: string
  projectId: string
  projectTitle: string
  data: {
    project: unknown
    chapters: unknown[]
    characters: unknown[]
    settingModules: unknown[]
    mapWorlds: unknown[]
    mapNodes: unknown[]
  }
}

export async function exportAllStorage(storagePath: string, destFile: string): Promise<void> {
  await zipDirectory(storagePath, destFile)
}

export async function exportProjectBundle(
  database: DatabaseService,
  storagePath: string,
  projectId: string,
  destFile: string
): Promise<void> {
  const project = database.projects.findById(projectId)
  if (!project) {
    throw new Error('作品不存在')
  }

  const worlds = database.maps.findWorldsByProject(projectId)
  const nodes = worlds.flatMap((world) => database.maps.findNodesByWorld(world.id))
  const bundle: ProjectExportBundle = {
    version: 1,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projectId,
    projectTitle: project.title,
    data: {
      project,
      chapters: database.chapters.findByProject(projectId),
      characters: database.characters.findByProject(projectId),
      settingModules: database.settings.findByProject(projectId),
      mapWorlds: worlds,
      mapNodes: nodes
    }
  }

  await zipProjectExport(bundle, storagePath, worlds.map((world) => world.id), destFile)
}

async function zipProjectExport(
  bundle: ProjectExportBundle,
  storagePath: string,
  worldIds: string[],
  destFile: string
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(destFile)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', reject)
    archive.pipe(output)

    archive.append(JSON.stringify(bundle, null, 2), { name: 'manifest.json' })
    archive.append(JSON.stringify(bundle.data, null, 2), { name: 'project-data.json' })

    const mapViewsDir = join(storagePath, 'map', 'views')
    if (existsSync(mapViewsDir)) {
      for (const worldId of worldIds) {
        const files = readdirSync(mapViewsDir).filter((file) => file.startsWith(`${worldId}.`))
        for (const file of files) {
          archive.file(join(mapViewsDir, file), { name: `map/views/${file}` })
        }
      }
    }

    void archive.finalize()
  })
}

async function zipDirectory(sourceDir: string, destFile: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(destFile)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', () => resolve())
    archive.on('error', reject)
    archive.pipe(output)

    appendDirectory(archive, sourceDir, '')
    void archive.finalize()
  })
}

function appendDirectory(
  archive: archiver.Archiver,
  rootDir: string,
  relativeDir: string
): void {
  const currentDir = join(rootDir, relativeDir)
  for (const entry of readdirSync(currentDir)) {
    const entryPath = join(currentDir, entry)
    const entryRelative = relativeDir ? join(relativeDir, entry) : entry
    const stats = statSync(entryPath)
    if (stats.isDirectory()) {
      appendDirectory(archive, rootDir, entryRelative)
      continue
    }
    archive.file(entryPath, { name: entryRelative.replace(/\\/g, '/') })
  }
}

export function buildExportFileName(baseName: string, extension: string): string {
  const safe = baseName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'export'
  return `${safe}.${extension}`
}

export function defaultProjectExportName(projectTitle: string): string {
  return buildExportFileName(`${projectTitle}-backup`, 'zip')
}

export function defaultAllExportName(): string {
  const stamp = new Date().toISOString().slice(0, 10)
  return buildExportFileName(`novel-assistant-backup-${stamp}`, 'nav3')
}
