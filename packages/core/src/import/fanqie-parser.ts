import { splitChapters } from './split-chapters'
import type { ParsedImportChapter } from './types'

const FANQIE_MARKERS = /fanqie|番茄|fqnovel|changdunovel/i

export function isFanqieExport(content: string, fileName?: string): boolean {
  if (fileName && /\.(html?|htm)$/i.test(fileName)) {
    return true
  }
  return FANQIE_MARKERS.test(content.slice(0, 800))
}

export function parseFanqieHtml(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
  const withBreaks = withoutScripts
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h\d>/gi, '\n')
  const stripped = withBreaks.replace(/<[^>]+>/g, '')
  return decodeHtmlEntities(stripped)
    .replace(/\u00a0/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function normalizeFanqieText(text: string): string {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const firstChapterIndex = lines.findIndex((line) => /^第[0-9一二三四五六七八九十百千零两]+章/.test(line.trim()))
  const trimmed =
    firstChapterIndex > 0 ? lines.slice(firstChapterIndex).join('\n') : lines.join('\n')
  return trimmed.trim()
}

export function parseFanqieContent(content: string, fileName?: string): ParsedImportChapter[] {
  const isHtml = Boolean(fileName && /\.(html?|htm)$/i.test(fileName)) || /<html[\s>]/i.test(content)
  const plainText = isHtml ? parseFanqieHtml(content) : normalizeFanqieText(content)
  return splitChapters(plainText, { includePreamble: false })
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}
