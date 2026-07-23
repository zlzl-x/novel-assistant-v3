import type { PreviewRow } from '../../models/preview'
import { isExcludedPreviewFieldKey } from '../excludedFieldKeys'
import { shouldDropRecognitionEntry } from '../sanitize/fieldNormalization'
export interface InfoLine {
  name: string
  value: string
}

const LINE_SPLIT = /\r?\n/

/** 将信息行格式化为「键：值」纯文本 */
export function formatInfoLines(lines: InfoLine[]): string {
  return lines
    .filter((line) => line.name.trim() && line.value.trim())
    .filter((line) => !shouldDropRecognitionEntry(line.name, line.value))
    .map((line) => `${line.name.trim()}：${line.value.trim()}`)
    .join('\n')
}

export function formatPreviewRowsAsText(rows: PreviewRow[], mode: 'existing' | 'proposed'): string {
  const lines = rows
    .map((row) => ({
      name: row.name,
      value: mode === 'existing' ? (row.existingValue ?? '') : row.proposedValue
    }))
    .filter((line) => line.name.trim() && line.value.trim())
  return formatInfoLines(lines)
}

export function parseInfoTextToLines(text: string): InfoLine[] {
  const lines: InfoLine[] = []
  for (const rawLine of text.split(LINE_SPLIT)) {
    const line = rawLine.trim()
    if (!line) continue
    const colonIndex = line.search(/[：:]/)
    if (colonIndex <= 0) continue
    const name = line.slice(0, colonIndex).trim()
    const value = line.slice(colonIndex + 1).trim()
    if (!name || !value) continue
    if (shouldDropRecognitionEntry(name, value, line)) continue
    lines.push({ name, value })
  }
  return lines
}

/** 将编辑后的纯文本同步回 PreviewRow，保留 excerpt 与勾选状态 */
export function mergeInfoTextIntoPreviewRows(text: string, previousRows: PreviewRow[]): PreviewRow[] {
  const parsed = parseInfoTextToLines(text)
  const previousByName = new Map(previousRows.map((row) => [row.name, row]))

  return parsed
    .filter((line) => !isExcludedPreviewFieldKey(line.name))
    .filter((line) => !shouldDropRecognitionEntry(line.name, line.value))
    .map((line) => {
    const existing = previousByName.get(line.name)
    const existingValue = existing?.existingValue ?? null
    return {
      name: line.name,
      existingValue,
      proposedValue: line.value,
      changed: (existingValue ?? '') !== line.value,
      checked: true,
      excerpt: existing?.excerpt
    }
  })
}
