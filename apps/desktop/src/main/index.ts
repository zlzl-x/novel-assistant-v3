import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc/register-ipc'
import { DatabaseManager } from './services/database-manager'
import { LlmService } from './services/llm-client'
import { LlmProfileStore } from './services/llm-profile-store'
import { StoragePathService } from './services/storage-path'

const storagePathService = new StoragePathService()
const databaseManager = DatabaseManager.getInstance()
const llmProfileStore = new LlmProfileStore(() => storagePathService.getStorageDirectory())
const llmService = new LlmService(llmProfileStore)

function reopenDatabase(): void {
  databaseManager.open(storagePathService.getDatabaseFilePath())
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  reopenDatabase()
  registerIpcHandlers({
    storagePathService,
    databaseManager,
    llmProfileStore,
    llmService,
    reopenDatabase
  })
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  databaseManager.close()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
