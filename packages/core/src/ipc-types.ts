import type { Chapter, ChapterMetadata, Project } from './models/project'
import type { Character, CharacterRole } from './models/character'
import type { MapNode, MapNodeGeo, MapNodeType, MapWorld } from './models/map'
import type {
  SettingModule,
  SettingModulePayload,
  SettingModuleType
} from './models/setting'
import type {
  ImportChaptersInput,
  ImportParseResult,
  ParsedImportChapter
} from './import/types'
import type { PreviewRow } from './models/preview'
import type { RecognitionCommit } from './models/recognition'

/** IPC 统一响应信封 */
export interface IpcResult<T> {
  success: boolean
  data: T | null
  error: string | null
}

export interface StoragePathInfo {
  path: string
  isDefault: boolean
}

export interface SetStoragePathResult {
  path: string
  reloadRequired: boolean
}

import type {
  LlmCompleteInput,
  LlmCompleteResult,
  LlmProviderId,
  LlmTestConnectionInput,
  LlmTestConnectionResult
} from './llm/types'

export interface LlmProfile {
  id: string
  name: string
  provider?: LlmProviderId
  baseUrl: string
  model: string
  temperature: number
  hasApiKey: boolean
}

export interface LlmProfilesState {
  profiles: LlmProfile[]
  activeProfileId: string | null
}

export interface SaveLlmProfileInput {
  id?: string
  name: string
  provider?: LlmProviderId
  baseUrl: string
  model: string
  temperature: number
}

export interface SaveApiKeyInput {
  profileId: string
  apiKey: string
}

export interface CreateProjectInput {
  title: string
  protagonistId?: string
  networkMode?: Project['networkMode']
}

export interface UpdateProjectInput {
  id: string
  title?: string
  protagonistId?: string | null
  networkMode?: Project['networkMode']
}

export interface SaveChapterInput {
  id?: string
  projectId: string
  number: number
  title?: string
  rawText?: string
  lastCommittedAt?: string | null
}

export interface ReorderChaptersInput {
  projectId: string
  orderedChapterIds: string[]
}

export interface CreateCharacterInput {
  projectId: string
  name: string
  disambiguation?: string
  aliases?: string[]
  role?: CharacterRole
}

export interface UpdateCharacterInput {
  id: string
  name?: string
  aliases?: string[]
  disambiguation?: string
  role?: CharacterRole
  isNetworkCenter?: boolean
  identity?: string
  realm?: string
  location?: string
  faction?: string | null
  summary?: string
  notes?: string
  status?: string | null
  protagonistRelation?: Character['protagonistRelation'] | null
  panel?: Character['panel']
}

export interface SearchCharactersInput {
  projectId: string
  query: string
  limit?: number
}

export interface MergeCharactersInput {
  primaryId: string
  secondaryId: string
}

export interface RecognitionCommitInput {
  chapterId: string
  ambiguousCount: number
  modelProfile?: string
  acceptedByCharacter: Record<string, PreviewRow[]>
  appearances: Array<{ characterId: string; mentionCount: number; excerpt?: string }>
  newAliasesByCharacter?: Record<string, string[]>
  relationsByCharacter?: Record<string, Array<{ targetName: string; type: string }>>
  protagonistRelationsByCharacter?: Record<string, { type: string; proximity: number }>
}

export interface RecognitionCommitResult {
  commit: RecognitionCommit
  characters: Character[]
}

export interface CreateMapWorldInput {
  projectId: string
  name: string
  description?: string
  stylePreset?: string
}

export interface UpdateMapWorldInput {
  id: string
  name?: string
  description?: string
  stylePreset?: string | null
}

export interface SaveMapGeneratedCodeInput {
  worldId: string
  code: string
}

export interface CreateSettingModuleInput {
  projectId: string
  type: SettingModuleType
  title: string
  order?: number
  collapsed?: boolean
  payload?: SettingModulePayload
}

export interface UpdateSettingModuleInput {
  id: string
  type?: SettingModuleType
  title?: string
  collapsed?: boolean
  payload?: SettingModulePayload
}

export interface ReorderSettingModulesInput {
  projectId: string
  orderedModuleIds: string[]
}

export type { ImportChaptersInput, ImportParseResult, ParsedImportChapter }

export interface ExportProjectInput {
  projectId: string
  savePath?: string
}

export interface ExportProjectResult {
  filePath: string
}

export interface ExportAllResult {
  filePath: string
}

export interface CreateMapNodeInput {
  worldId: string
  parentId?: string | null
  name: string
  type?: MapNodeType
  summary?: string
  tags?: string[]
  geo?: MapNodeGeo
  source?: MapNode['source']
}

export interface UpdateMapNodeInput {
  id: string
  parentId?: string | null
  name?: string
  type?: MapNodeType
  summary?: string
  tags?: string[]
  geo?: MapNodeGeo | null
  source?: MapNode['source']
}

export type { Project, Chapter, ChapterMetadata, Character, MapWorld, MapNode, SettingModule }

/** Preload 暴露给渲染进程的 API 类型 */
export interface NovelApi {
  storage: {
    getPath: () => Promise<IpcResult<StoragePathInfo>>
    setPath: (path: string) => Promise<IpcResult<SetStoragePathResult>>
    pickDirectory: () => Promise<IpcResult<StoragePathInfo | null>>
  }
  projects: {
    list: () => Promise<IpcResult<Project[]>>
    create: (input: CreateProjectInput) => Promise<IpcResult<Project>>
    update: (input: UpdateProjectInput) => Promise<IpcResult<Project>>
    delete: (id: string) => Promise<IpcResult<boolean>>
  }
  chapters: {
    list: (projectId: string) => Promise<IpcResult<Chapter[]>>
    listMetadata: (projectId: string) => Promise<IpcResult<ChapterMetadata[]>>
    get: (id: string) => Promise<IpcResult<Chapter | null>>
    save: (input: SaveChapterInput) => Promise<IpcResult<Chapter>>
    delete: (id: string) => Promise<IpcResult<boolean>>
    deleteAfter: (projectId: string, chapterNumber: number) => Promise<IpcResult<number>>
    reorder: (input: ReorderChaptersInput) => Promise<IpcResult<Chapter[]>>
    insertAfter: (projectId: string, afterChapterId: string, title?: string) => Promise<IpcResult<Chapter>>
  }
  characters: {
    list: (projectId: string) => Promise<IpcResult<Character[]>>
    get: (id: string) => Promise<IpcResult<Character | null>>
    create: (input: CreateCharacterInput) => Promise<IpcResult<Character>>
    update: (input: UpdateCharacterInput) => Promise<IpcResult<Character>>
    delete: (id: string) => Promise<IpcResult<boolean>>
    search: (input: SearchCharactersInput) => Promise<IpcResult<Character[]>>
    merge: (input: MergeCharactersInput) => Promise<IpcResult<Character>>
  }
  recognition: {
    commit: (input: RecognitionCommitInput) => Promise<IpcResult<RecognitionCommitResult>>
  }
  import: {
    pickAndParse: () => Promise<IpcResult<ImportParseResult | null>>
    importChapters: (input: ImportChaptersInput) => Promise<IpcResult<Chapter[]>>
  }
  export: {
    project: (input: ExportProjectInput) => Promise<IpcResult<ExportProjectResult>>
    all: () => Promise<IpcResult<ExportAllResult>>
  }
  settingModules: {
    list: (projectId: string) => Promise<IpcResult<SettingModule[]>>
    create: (input: CreateSettingModuleInput) => Promise<IpcResult<SettingModule>>
    update: (input: UpdateSettingModuleInput) => Promise<IpcResult<SettingModule>>
    delete: (id: string) => Promise<IpcResult<boolean>>
    reorder: (input: ReorderSettingModulesInput) => Promise<IpcResult<SettingModule[]>>
  }
  maps: {
    listWorlds: (projectId: string) => Promise<IpcResult<MapWorld[]>>
    getWorld: (id: string) => Promise<IpcResult<MapWorld | null>>
    createWorld: (input: CreateMapWorldInput) => Promise<IpcResult<MapWorld>>
    updateWorld: (input: UpdateMapWorldInput) => Promise<IpcResult<MapWorld>>
    deleteWorld: (id: string) => Promise<IpcResult<boolean>>
    listNodes: (worldId: string) => Promise<IpcResult<MapNode[]>>
    createNode: (input: CreateMapNodeInput) => Promise<IpcResult<MapNode>>
    updateNode: (input: UpdateMapNodeInput) => Promise<IpcResult<MapNode>>
    deleteNode: (id: string) => Promise<IpcResult<boolean>>
    saveGeneratedCode: (input: SaveMapGeneratedCodeInput) => Promise<IpcResult<MapWorld>>
  }
  settings: {
    getLlmProfiles: () => Promise<IpcResult<LlmProfilesState>>
    saveLlmProfile: (input: SaveLlmProfileInput) => Promise<IpcResult<LlmProfile>>
    saveApiKey: (input: SaveApiKeyInput) => Promise<IpcResult<boolean>>
    deleteLlmProfile: (profileId: string) => Promise<IpcResult<LlmProfilesState>>
    setActiveLlmProfile: (profileId: string) => Promise<IpcResult<LlmProfilesState>>
  }
  llm: {
    complete: (input: LlmCompleteInput) => Promise<IpcResult<LlmCompleteResult>>
    testConnection: (input?: LlmTestConnectionInput) => Promise<IpcResult<LlmTestConnectionResult>>
    abort: (requestId: string) => Promise<IpcResult<boolean>>
  }
}

export const IPC_CHANNELS = {
  storageGetPath: 'storage:getPath',
  storageSetPath: 'storage:setPath',
  storagePickDirectory: 'storage:pickDirectory',
  projectsList: 'projects:list',
  projectsCreate: 'projects:create',
  projectsUpdate: 'projects:update',
  projectsDelete: 'projects:delete',
  chaptersList: 'chapters:list',
  chaptersListMetadata: 'chapters:listMetadata',
  chaptersGet: 'chapters:get',
  chaptersSave: 'chapters:save',
  chaptersDelete: 'chapters:delete',
  chaptersDeleteAfter: 'chapters:deleteAfter',
  chaptersReorder: 'chapters:reorder',
  chaptersInsertAfter: 'chapters:insertAfter',
  charactersList: 'characters:list',
  charactersGet: 'characters:get',
  charactersCreate: 'characters:create',
  charactersUpdate: 'characters:update',
  charactersDelete: 'characters:delete',
  charactersSearch: 'characters:search',
  charactersMerge: 'characters:merge',
  recognitionCommit: 'recognition:commit',
  mapsListWorlds: 'maps:listWorlds',
  mapsGetWorld: 'maps:getWorld',
  mapsCreateWorld: 'maps:createWorld',
  mapsUpdateWorld: 'maps:updateWorld',
  mapsDeleteWorld: 'maps:deleteWorld',
  mapsListNodes: 'maps:listNodes',
  mapsCreateNode: 'maps:createNode',
  mapsUpdateNode: 'maps:updateNode',
  mapsDeleteNode: 'maps:deleteNode',
  mapsSaveGeneratedCode: 'maps:saveGeneratedCode',
  settingModulesList: 'settingModules:list',
  settingModulesCreate: 'settingModules:create',
  settingModulesUpdate: 'settingModules:update',
  settingModulesDelete: 'settingModules:delete',
  settingModulesReorder: 'settingModules:reorder',
  importPickAndParse: 'import:pickAndParse',
  importChapters: 'import:importChapters',
  exportProject: 'export:project',
  exportAll: 'export:all',
  settingsGetLlmProfiles: 'settings:getLlmProfiles',
  settingsSaveLlmProfile: 'settings:saveLlmProfile',
  settingsSaveApiKey: 'settings:saveApiKey',
  settingsDeleteLlmProfile: 'settings:deleteLlmProfile',
  settingsSetActiveLlmProfile: 'settings:setActiveLlmProfile',
  llmComplete: 'llm:complete',
  llmTestConnection: 'llm:testConnection',
  llmAbort: 'llm:abort'
} as const
