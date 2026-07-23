import type { ParsedImportChapter } from './types'

/** 常见中文章节标题行，如「第1章」「第十二章 开端」 */
export const CHAPTER_LINE_PATTERN =
  /^第[0-9一二三四五六七八九十百千零两]+章.*$|^Chapter\s+\d+.*$/i

export interface SplitChapterOptions {
  linePattern?: RegExp
  includePreamble?: boolean
  fallbackTitle?: string
}

export function splitChapters(text: string, options: SplitChapterOptions = {}): ParsedImportChapter[] {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return []

  const pattern = options.linePattern ?? CHAPTER_LINE_PATTERN
  const lines = normalized.split('\n')
  const splits: Array<{ lineIndex: number; title: string }> = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]?.trim() ?? ''
    if (pattern.test(line)) {
      splits.push({ lineIndex: index, title: line })
    }
  }

  if (splits.length === 0) {
    return [
      {
        title: options.fallbackTitle ?? '导入全文',
        rawText: normalized
      }
    ]
  }

  const chapters: ParsedImportChapter[] = []

  if (options.includePreamble && splits[0] && splits[0].lineIndex > 0) {
    const preamble = lines.slice(0, splits[0].lineIndex).join('\n').trim()
    if (preamble) {
      chapters.push({ title: '前言', rawText: preamble })
    }
  }

  for (let index = 0; index < splits.length; index += 1) {
    const current = splits[index]!
    const next = splits[index + 1]
    const start = current.lineIndex + 1
    const end = next ? next.lineIndex : lines.length
    chapters.push({
      title: current.title,
      rawText: lines.slice(start, end).join('\n').trim()
    })
  }

  return chapters
}
