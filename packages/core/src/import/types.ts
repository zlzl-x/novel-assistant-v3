export type ImportSourceFormat = 'txt' | 'docx' | 'fanqie'

export interface ParsedImportChapter {
  title: string
  rawText: string
}

export interface ImportParseResult {
  format: ImportSourceFormat
  fileName: string
  chapters: ParsedImportChapter[]
  warnings: string[]
}

export interface ImportChaptersInput {
  projectId: string
  chapters: ParsedImportChapter[]
  mode: 'create' | 'merge'
  mergeChapterId?: string
}
