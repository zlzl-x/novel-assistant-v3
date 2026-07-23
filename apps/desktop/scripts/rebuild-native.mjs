import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  statSync,
  unlinkSync
} from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = join(desktopRoot, '..', '..')
const force = process.argv.includes('--force') || process.env.REBUILD_NATIVE === '1'

function resolveBetterSqlite3Paths() {
  const packageJsonPath = require.resolve('better-sqlite3/package.json', {
    paths: [repoRoot, desktopRoot]
  })
  const packageRoot = dirname(packageJsonPath)
  const releaseDir = join(packageRoot, 'build', 'Release')
  const binaryPath = join(releaseDir, 'better_sqlite3.node')
  return { releaseDir, binaryPath }
}

function getPackagedBinaryPath() {
  return join(
    desktopRoot,
    'dist',
    'win-unpacked',
    'resources',
    'app.asar.unpacked',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    'better_sqlite3.node'
  )
}

function verifyElectronBinary(binaryPath) {
  if (!existsSync(binaryPath)) {
    return false
  }

  const electronPath = require('electron')
  const testScript = `
    try {
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      db.close();
      process.exit(0);
    } catch {
      process.exit(1);
    }
  `

  const result = spawnSync(electronPath, ['-e', testScript], {
    cwd: repoRoot,
    stdio: 'ignore',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1'
    },
    timeout: 15000
  })

  return result.status === 0
}

function isLockedFileError(error) {
  return error?.code === 'EPERM' || error?.code === 'EBUSY' || error?.code === 'EACCES'
}

function safeCopyBinary(source, destPath) {
  const destDir = dirname(destPath)
  mkdirSync(destDir, { recursive: true })

  if (existsSync(destPath)) {
    try {
      const sourceStat = statSync(source)
      const destStat = statSync(destPath)
      if (
        sourceStat.size === destStat.size &&
        sourceStat.mtimeMs <= destStat.mtimeMs &&
        verifyElectronBinary(destPath)
      ) {
        return 'already-current'
      }
    } catch {
      // Continue with copy attempt.
    }
  }

  const tempPath = join(destDir, `better_sqlite3.node.${process.pid}.tmp`)
  copyFileSync(source, tempPath)

  try {
    if (existsSync(destPath)) {
      unlinkSync(destPath)
    }
    renameSync(tempPath, destPath)
    return 'copied'
  } catch (error) {
    if (existsSync(tempPath)) {
      try {
        unlinkSync(tempPath)
      } catch {
        // Ignore cleanup errors.
      }
    }

    if (isLockedFileError(error) && verifyElectronBinary(destPath)) {
      return 'skipped-locked-ok'
    }

    throw error
  }
}

function copyPackagedBinary(targetPath) {
  const packagedBinary = getPackagedBinaryPath()
  if (!existsSync(packagedBinary)) {
    return false
  }

  const result = safeCopyBinary(packagedBinary, targetPath)
  if (result === 'already-current') {
    console.log('better-sqlite3 binary is already up to date.')
    return true
  }
  if (result === 'skipped-locked-ok') {
    console.warn(
      'better-sqlite3 binary is locked by a running process, but the existing binary works in Electron.'
    )
    return true
  }

  console.log('Restored better-sqlite3 from packaged Electron build output.')
  return true
}

function rebuildWithElectronBuilder() {
  const result = spawnSync('pnpm', ['exec', 'electron-builder', 'install-app-deps'], {
    cwd: desktopRoot,
    stdio: 'inherit',
    shell: true
  })

  return result.status === 0
}

const { releaseDir, binaryPath } = resolveBetterSqlite3Paths()

if (!force && verifyElectronBinary(binaryPath)) {
  console.log('better-sqlite3 is already compatible with Electron; skipping rebuild.')
  process.exit(0)
}

if (rebuildWithElectronBuilder() && existsSync(binaryPath) && verifyElectronBinary(binaryPath)) {
  console.log('better-sqlite3 rebuilt for Electron.')
  process.exit(0)
}

console.warn('Electron rebuild did not produce a working binary; trying packaged fallback...')

if (copyPackagedBinary(binaryPath) && verifyElectronBinary(binaryPath)) {
  process.exit(0)
}

if (!force && existsSync(binaryPath) && verifyElectronBinary(binaryPath)) {
  console.warn('Rebuild failed, but the existing better-sqlite3 binary works in Electron.')
  process.exit(0)
}

console.error(
  [
    'Failed to prepare better-sqlite3 for Electron.',
    'Close any running Electron/dev processes and retry.',
    'Install Visual Studio Build Tools with the "Desktop development with C++" workload,',
    'then run: pnpm --filter @novel-assistant/desktop rebuild:native -- --force'
  ].join('\n')
)
process.exit(1)
