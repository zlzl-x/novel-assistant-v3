/** 角色相关类型，对齐 md/04-character-system.md §2 */

export type CharacterRole = 'protagonist' | 'major' | 'minor' | 'mentioned'
export type CharacterTier = 'core' | 'supporting' | 'background'
export type FieldSource = 'manual' | 'recognition' | 'import'

export interface FieldHistoryEntry<T> {
  value: T
  chapterId?: string
  chapterNumber?: number
  source: FieldSource
  recognizedAt?: string
  excerpt?: string
}

export interface FieldWithHistory<T> {
  current: T
  history: FieldHistoryEntry<T>[]
}

export interface PanelEntry {
  key: string
  value: string
  history: Array<{
    value: string
    chapterId?: string
    source: 'manual' | 'recognition'
    excerpt?: string
  }>
}

export interface CharacterPanel {
  templateId?: string
  entries: PanelEntry[]
}

export interface ProtagonistRelation {
  type: string
  proximity: number
  label?: string
}

export interface Relation {
  targetCharacterId: string
  type: string
  label?: string
  strength?: number
  sinceChapter?: number
  notes?: string
}

export interface ChapterRef {
  chapterId: string
  chapterNumber: number
  chapterTitle?: string
}

export interface CharacterAppearance {
  chapterId: string
  chapterNumber: number
  chapterTitle?: string
  mentionCount: number
  committedAt: string
  excerpt?: string
}

export interface Character {
  id: string
  projectId: string
  name: string
  aliases: string[]
  disambiguation: string
  role: CharacterRole
  tier?: CharacterTier
  isNetworkCenter?: boolean
  identity: FieldWithHistory<string>
  realm: FieldWithHistory<string>
  location: FieldWithHistory<string>
  faction?: FieldWithHistory<string>
  summary: string
  notes: string
  status?: string
  protagonistRelation?: ProtagonistRelation
  panel: CharacterPanel
  relations: Relation[]
  firstAppearance?: ChapterRef
  lastAppearance?: ChapterRef
  mentionCount: number
  appearances: CharacterAppearance[]
  createdAt: string
  updatedAt: string
}
