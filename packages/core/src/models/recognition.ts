/** 识别流水线类型，对齐 md/06-text-recognition-pipeline.md */

import type { CharacterExtraction } from './recognition-step2'

export interface ExtractedField {
  value: string
  excerpt: string
  confidence: 'high' | 'medium' | 'low'
}

export interface CharacterMention {
  surfaceForm: string
  inferredName?: string
  mentionCount: number
  excerpts: string[]
  isNickname: boolean
}

export interface MatchedMention extends CharacterMention {
  matchedCharacterId: string | null
  confidence: 'high' | 'medium' | 'low'
}

export interface ChapterExtraction {
  inferredName: string
  mentionCount: number
  fields: Record<string, ExtractedField>
  relations?: Array<{ targetName: string; type: string; excerpt: string }>
  protagonistRelation?: { type: string; proximity: number; excerpt: string }
  panelEntries?: Array<{ key: string; value: string; excerpt: string }>
}

export interface AmbiguousName {
  surfaceForm: string
  candidateCharacterIds: string[]
  excerpt: string
}

export interface Step1Result {
  chapterId: string
  mentions: CharacterMention[]
  chapterExtractions: ChapterExtraction[]
  unresolvedMentions: string[]
  ambiguousNames: AmbiguousName[]
}

export interface Step2Result {
  chapterId: string
  characters: CharacterExtraction[]
}

/** 预览中的角色定位：主角 / 配角 / 路人 */
export type PreviewRoleTier = 'protagonist' | 'supporting' | 'extra'

export interface CharacterPreviewMeta {
  name: string
  mentionCount: number
  roleTier: PreviewRoleTier
  isPending: boolean
  /** 本章识别到的关系条数，入库后写入关系网 */
  relationCount?: number
}

/** 内存暂存，不入库，对齐 md/08 §2.3 */
export interface RecognitionPreview {
  chapterId: string
  textHash: string
  step1: Step1Result
  step2?: Step2Result
  previewRowsByCharacter?: Record<string, import('./preview').PreviewRow[]>
  characterPreviewMeta?: Record<string, CharacterPreviewMeta>
  /** 用户勾选的主角，key 为 characterId 或 pending::姓名 */
  protagonistPreviewKey?: string | null
  isLatestChapter: boolean
  generatedAt: string
  /** Step1 存在同名歧义时阻断 Step2 */
  blocked?: boolean
  /** Step2 失败的角色及原因（部分失败时保留，便于排查） */
  step2Failures?: Array<{ characterId: string; characterName: string; error: string }>
}

export interface RecognitionCommit {
  id: string
  chapterId: string
  chapterNumber: number
  committedAt: string
  acceptedFields: Array<{
    characterId: string
    fieldKey: string
    oldValue: string
    newValue: string
  }>
  appearances: Array<{
    characterId: string
    mentionCount: number
  }>
  modelProfile: string
}
