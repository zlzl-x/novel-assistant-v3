import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type NovelApi } from '@na/ipc'

const novelApi: NovelApi = {
  storage: {
    getPath: () => ipcRenderer.invoke(IPC_CHANNELS.storageGetPath),
    setPath: (path: string) => ipcRenderer.invoke(IPC_CHANNELS.storageSetPath, path),
    pickDirectory: () => ipcRenderer.invoke(IPC_CHANNELS.storagePickDirectory)
  },
  projects: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.projectsList),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.projectsCreate, input),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.projectsUpdate, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.projectsDelete, id)
  },
  chapters: {
    list: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.chaptersList, projectId),
    listMetadata: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.chaptersListMetadata, projectId),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.chaptersGet, id),
    save: (input) => ipcRenderer.invoke(IPC_CHANNELS.chaptersSave, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.chaptersDelete, id),
    deleteAfter: (projectId, chapterNumber) =>
      ipcRenderer.invoke(IPC_CHANNELS.chaptersDeleteAfter, projectId, chapterNumber),
    reorder: (input) => ipcRenderer.invoke(IPC_CHANNELS.chaptersReorder, input),
    insertAfter: (projectId, afterChapterId, title) =>
      ipcRenderer.invoke(IPC_CHANNELS.chaptersInsertAfter, projectId, afterChapterId, title)
  },
  characters: {
    list: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.charactersList, projectId),
    get: (id) => ipcRenderer.invoke(IPC_CHANNELS.charactersGet, id),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.charactersCreate, input),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.charactersUpdate, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.charactersDelete, id),
    search: (input) => ipcRenderer.invoke(IPC_CHANNELS.charactersSearch, input),
    merge: (input) => ipcRenderer.invoke(IPC_CHANNELS.charactersMerge, input)
  },
  recognition: {
    commit: (input) => ipcRenderer.invoke(IPC_CHANNELS.recognitionCommit, input)
  },
  settingModules: {
    list: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.settingModulesList, projectId),
    create: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingModulesCreate, input),
    update: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingModulesUpdate, input),
    delete: (id) => ipcRenderer.invoke(IPC_CHANNELS.settingModulesDelete, id),
    reorder: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingModulesReorder, input)
  },
  import: {
    pickAndParse: () => ipcRenderer.invoke(IPC_CHANNELS.importPickAndParse),
    importChapters: (input) => ipcRenderer.invoke(IPC_CHANNELS.importChapters, input)
  },
  export: {
    project: (input) => ipcRenderer.invoke(IPC_CHANNELS.exportProject, input),
    all: () => ipcRenderer.invoke(IPC_CHANNELS.exportAll)
  },
  maps: {
    listWorlds: (projectId) => ipcRenderer.invoke(IPC_CHANNELS.mapsListWorlds, projectId),
    getWorld: (id) => ipcRenderer.invoke(IPC_CHANNELS.mapsGetWorld, id),
    createWorld: (input) => ipcRenderer.invoke(IPC_CHANNELS.mapsCreateWorld, input),
    updateWorld: (input) => ipcRenderer.invoke(IPC_CHANNELS.mapsUpdateWorld, input),
    deleteWorld: (id) => ipcRenderer.invoke(IPC_CHANNELS.mapsDeleteWorld, id),
    listNodes: (worldId) => ipcRenderer.invoke(IPC_CHANNELS.mapsListNodes, worldId),
    createNode: (input) => ipcRenderer.invoke(IPC_CHANNELS.mapsCreateNode, input),
    updateNode: (input) => ipcRenderer.invoke(IPC_CHANNELS.mapsUpdateNode, input),
    deleteNode: (id) => ipcRenderer.invoke(IPC_CHANNELS.mapsDeleteNode, id),
    saveGeneratedCode: (input) => ipcRenderer.invoke(IPC_CHANNELS.mapsSaveGeneratedCode, input)
  },
  settings: {
    getLlmProfiles: () => ipcRenderer.invoke(IPC_CHANNELS.settingsGetLlmProfiles),
    saveLlmProfile: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingsSaveLlmProfile, input),
    saveApiKey: (input) => ipcRenderer.invoke(IPC_CHANNELS.settingsSaveApiKey, input),
    deleteLlmProfile: (profileId) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsDeleteLlmProfile, profileId),
    setActiveLlmProfile: (profileId) =>
      ipcRenderer.invoke(IPC_CHANNELS.settingsSetActiveLlmProfile, profileId)
  },
  llm: {
    complete: (input) => ipcRenderer.invoke(IPC_CHANNELS.llmComplete, input),
    testConnection: (input) => ipcRenderer.invoke(IPC_CHANNELS.llmTestConnection, input),
    abort: (requestId) => ipcRenderer.invoke(IPC_CHANNELS.llmAbort, requestId)
  }
}

contextBridge.exposeInMainWorld('novelApi', novelApi)
