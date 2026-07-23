/** 作品实体，对齐 md/08-data-model.md §2.1 */
export interface Project {
  id: string
  title: string
  protagonistId?: string
  networkMode: 'single' | 'ensemble'
  genre: 'generic'
  createdAt: string
  updatedAt: string
  schemaVersion: number
}

/** 章节实体，对齐 md/08-data-model.md §2.2 */
export interface Chapter {
  id: string
  projectId: string
  number: number
  title: string
  rawText: string
  wordCount: number
  lastCommittedAt?: string
  createdAt: string
  updatedAt: string
}

export type ChapterMetadata = Omit<Chapter, 'rawText'>
