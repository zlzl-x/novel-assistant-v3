export type { Project, Chapter, ChapterMetadata } from './models/project'
export type {
  Character,
  CharacterRole,
  CharacterTier,
  CharacterPanel,
  CharacterAppearance,
  ChapterRef,
  FieldWithHistory,
  FieldHistoryEntry,
  FieldSource,
  PanelEntry,
  ProtagonistRelation,
  Relation
} from './models/character'
export type {
  RecognitionPreview,
  RecognitionCommit,
  Step1Result,
  Step2Result,
  CharacterMention,
  MatchedMention,
  ChapterExtraction,
  AmbiguousName,
  ExtractedField,
  PreviewRoleTier,
  CharacterPreviewMeta
} from './models/recognition'
export type { CharacterExtraction } from './models/recognition-step2'
export type {
  RecognitionDebugEntry,
  RecognitionDebugSink,
  RecognitionDebugStage
} from './models/recognition-debug'
export type { MapDebugEntry, MapDebugSink, MapDebugStage } from './models/map-debug'
export type { PreviewRow, CharacterPreviewRows } from './models/preview'
export type { MapWorld, MapNode, MapNodeType, MapNodeGeo } from './models/map'
export type {
  SettingModule,
  SettingModuleType,
  SettingModulePayload,
  TablePayload,
  RichTextPayload,
  ChecklistPayload
} from './models/setting'
export {
  RECOGNITION_FIELD_KEYS,
  PROXIMITY_MIN,
  PROXIMITY_MAX,
  SCHEMA_VERSION
} from './constants'
export { countWords } from './utils/text'
export { extractJsonContent } from './utils/json'
export { extractHtmlContent } from './utils/html'
export type {
  LlmProviderId,
  LlmChatRole,
  LlmChatMessage,
  LlmErrorCode,
  LlmCompleteInput,
  LlmCompleteResult,
  LlmThinkingMode,
  LlmTestConnectionInput,
  LlmTestConnectionResult
} from './llm/types'
export { LlmError } from './llm/types'
export {
  normalizeText,
  hashText,
  buildStep1Messages,
  buildStep1UserPrompt,
  STEP1_SYSTEM_PROMPT,
  assertStep1PayloadIsTextOnly,
  step1LlmResponseSchema,
  step1ResultSchema,
  sanitizeStep1LlmResponse,
  attachChapterId,
  localNameScan,
  matchMentionsToRegistry,
  applyLocalMatching,
  findCandidateCharacterIds,
  resolveCharacterIdForLabel,
  executeStep1Pipeline,
  isStep1Blocked,
  buildStep2Messages,
  STEP2_SYSTEM_PROMPT,
  assertStep2PayloadIsSingleCharacter,
  characterExtractionLlmSchema,
  sanitizeCharacterExtraction,
  executeStep2Pipeline,
  mergeStep2IntoPreview,
  buildPreviewRows,
  buildPreviewRowsForAll,
  buildPreviewFromStep1,
  buildPreviewRowsFromChapterExtraction,
  toPendingCharacterKey,
  isPendingCharacterKey,
  pendingCharacterNameFromKey,
  PENDING_CHARACTER_PREFIX,
  formatInfoLines,
  formatPreviewRowsAsText,
  parseInfoTextToLines,
  mergeInfoTextIntoPreviewRows,
  getMatchedCharacterIds,
  getChapterExtractionForCharacter,
  countMentionsForCharacter,
  canRunStep2,
  isStep2Ready,
  isPreviewReady,
  previewRoleTierToCharacterRole,
  buildExistingDisplayRows,
  collectGraphCommitData,
  remapGraphCommitData,
  resolveAmbiguity,
  removeUnresolvedMention,
  isAmbiguityResolved,
  getAmbiguityBySurfaceForm
} from './recognition'
export type { Step1LlmResponse, Step1ResultValidated, CharacterRegistryEntry, CharacterExtractionLlmResponse, ExecuteStep2PipelineResult, ResolveAmbiguityInput, BuildPreviewFromStep1Result, InfoLine, GraphCommitData, GraphCommitRelation, GraphCommitProtagonistRelation } from './recognition'
export {
  applyRecognitionCommit,
  validateCommitInput,
  applyPreviewRowToCharacter
} from './commit'
export type {
  ApplyRecognitionCommitInput,
  ApplyRecognitionCommitResult,
  CommitAppearanceInput
} from './commit'
export {
  toVisNetwork,
  formatNodeLabel,
  filterCharactersForDisplay,
  getProtagonistNodePosition,
  AGGREGATE_NODE_ID,
  BASE_RADIUS
} from './graph'
export type {
  VisNetworkNode,
  VisNetworkEdge,
  ToVisNetworkInput,
  VisNetworkGraph
} from './graph'
export {
  SETTING_TEMPLATES,
  getSettingTemplate,
  createBlankPayload,
  defaultTitleForType,
  moduleMatchesSearch
} from './settings'
export type {
  SettingTemplateId,
  SettingTemplate,
  SettingTemplateModuleDef
} from './settings'
export {
  splitChapters,
  CHAPTER_LINE_PATTERN,
  isFanqieExport,
  parseFanqieHtml,
  normalizeFanqieText,
  parseFanqieContent
} from './import'
export type {
  ImportSourceFormat,
  ParsedImportChapter,
  ImportParseResult,
  ImportChaptersInput,
  SplitChapterOptions
} from './import'
export {
  generateMapCode,
  prepareMapCodeFromLlm,
  buildMapCodegenMessages,
  buildMapLayoutMessages,
  buildMapRegionExtractMessages,
  normalizeRegionList,
  extractRegionsFromDescriptionHeuristic,
  sanitizeMapHtml,
  injectMapBridge,
  isMapPlaceClickMessage,
  MAP_CODEGEN_SYSTEM_PROMPT,
  mapLayoutSchema,
  normalizeMapLayout,
  renderMapLayout,
  buildFallbackMapHtml,
  buildFallbackMapLayout,
  buildTessellatedMapHtml,
  isBoxDominantMapHtml,
  isTruncatedMapHtml,
  repairTruncatedMapHtml
} from './map'
export type {
  GenerateMapCodeInput,
  GenerateMapCodeResult,
  SanitizeMapHtmlResult,
  MapPlaceClickMessage,
  MapHighlightMessage,
  MapLayout,
  MapRegionLayout,
  MapPathLayout
} from './map'
export type { RecognitionFieldKey } from './constants'
export type {
  IpcResult,
  StoragePathInfo,
  SetStoragePathResult,
  LlmProfile,
  LlmProfilesState,
  SaveLlmProfileInput,
  SaveApiKeyInput,
  CreateProjectInput,
  UpdateProjectInput,
  SaveChapterInput,
  ReorderChaptersInput,
  CreateCharacterInput,
  UpdateCharacterInput,
  SearchCharactersInput,
  RecognitionCommitInput,
  RecognitionCommitResult,
  CreateMapWorldInput,
  UpdateMapWorldInput,
  CreateMapNodeInput,
  UpdateMapNodeInput,
  SaveMapGeneratedCodeInput,
  CreateSettingModuleInput,
  UpdateSettingModuleInput,
  ReorderSettingModulesInput,
  ExportProjectInput,
  ExportProjectResult,
  ExportAllResult,
  MergeCharactersInput,
  NovelApi
} from './ipc-types'
export { mergeCharacters } from './character/mergeCharacters'
export { IPC_CHANNELS } from './ipc-types'
