export { normalizeText, hashText } from './preprocess'
export {
  parseAttributePanelsFromText,
  mergeLocalPanelsIntoStep1Response
} from './preprocess/parseAttributePanels'
export type { ParsedAttributePanel } from './preprocess/parseAttributePanels'
export { buildStep1Messages, buildStep1UserPrompt, STEP1_SYSTEM_PROMPT, assertStep1PayloadIsTextOnly } from './prompts/step1'
export { buildStep2Messages, buildStep2UserPrompt, STEP2_SYSTEM_PROMPT, assertStep2PayloadIsSingleCharacter } from './prompts/step2'
export {
  step1LlmResponseSchema,
  step1ResultSchema,
  extractedFieldSchema,
  characterMentionSchema,
  chapterExtractionSchema
} from './schemas/step1'
export {
  characterExtractionLlmSchema,
  step2ResultSchema,
  protagonistRelationSchema
} from './schemas/step2'
export type { Step1LlmResponse, Step1ResultValidated } from './schemas/step1'
export type { CharacterExtractionLlmResponse } from './schemas/step2'
export { sanitizeStep1LlmResponse, attachChapterId } from './sanitize/step1'
export { sanitizeCharacterExtraction } from './sanitize/step2'
export { RECOGNITION_FIELD_KEY_SET, PANEL_FIELD_KEYS, getCharacterFieldValue, isAllowedFieldKey } from './field-keys'
export {
  localNameScan,
  matchMentionsToRegistry,
  applyLocalMatching,
  findCandidateCharacterIds,
  resolveCharacterIdForLabel,
  getMatchedCharacterIds,
  getChapterExtractionForCharacter,
  countMentionsForCharacter
} from './matchLocal'
export type { CharacterRegistryEntry } from './matchLocal'
export { executeStep1Pipeline, isStep1Blocked } from './pipeline/step1-pipeline'
export { executeStep2Pipeline, mergeStep2IntoPreview } from './pipeline/step2-pipeline'
export type { ExecuteStep2PipelineResult } from './pipeline/step2-pipeline'
export { buildPreviewRows, buildPreviewRowsForAll } from './preview/buildPreviewRows'
export {
  buildPreviewFromStep1,
  buildPreviewRowsFromChapterExtraction,
  toPendingCharacterKey,
  isPendingCharacterKey,
  pendingCharacterNameFromKey,
  PENDING_CHARACTER_PREFIX
} from './preview/buildPreviewFromStep1'
export {
  formatInfoLines,
  formatPreviewRowsAsText,
  parseInfoTextToLines,
  mergeInfoTextIntoPreviewRows
} from './preview/formatInfoText'
export type { InfoLine } from './preview/formatInfoText'
export type { BuildPreviewFromStep1Result } from './preview/buildPreviewFromStep1'
export {
  collectGraphCommitData,
  remapGraphCommitData,
  isGraphCommitKey
} from './preview/collectGraphCommitData'
export type {
  GraphCommitData,
  GraphCommitRelation,
  GraphCommitProtagonistRelation
} from './preview/collectGraphCommitData'
export { isExcludedPreviewFieldKey } from './excludedFieldKeys'
export { previewRoleTierToCharacterRole } from './preview/roleMapping'
export { buildExistingDisplayRows } from './preview/buildExistingRows'
export {
  resolveAmbiguity,
  removeUnresolvedMention,
  isAmbiguityResolved,
  getAmbiguityBySurfaceForm
} from './ambiguity'
export type { ResolveAmbiguityInput } from './ambiguity'
export { canRunStep2, isStep2Ready, isPreviewReady } from './gates'
