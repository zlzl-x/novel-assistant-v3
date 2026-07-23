import type { ChapterExtraction } from '../../models/recognition'

const SKIP_INLINE_KEYS = new Set(['人物', '角色', '姓名', '名字', '状态', '关系', '第', '章', '节'])

function extractLeadingName(line: string): string | null {
  const match = line.match(/^([\u4e00-\u9fa5·]{2,4})/)
  if (!match) return null
  const chunk = match[1]!
  if (chunk.length > 3) return chunk.slice(0, 2)
  if (chunk.length > 2) return chunk.slice(0, 2)
  return chunk
}

function isKeyValueLine(line: string): boolean {
  return /^[^：:\s]{1,8}[：:]/.test(line.trim())
}

function parseKeyValueLine(line: string): { key: string; value: string } | null {
  const match = line.trim().match(/^([^：:\s]{1,8})[：:]\s*(.+)$/)
  if (!match) return null
  const key = match[1]!.trim()
  const value = match[2]!.trim()
  if (!key || !value) return null
  return { key, value }
}

function rememberName(recentNames: string[], name: string): string[] {
  const trimmed = name.trim()
  if (trimmed.length < 2 || trimmed.length > 4) return recentNames
  if (!/^[\u4e00-\u9fa5·]+$/.test(trimmed)) return recentNames
  return [trimmed, ...recentNames.filter((item) => item !== trimmed)].slice(0, 3)
}

/** 从叙述正文中补抓「键：值」事实，关联最近出现的人名 */
export function extractInlineFactsFromText(text: string): ChapterExtraction[] {
  const lines = text.split(/\r?\n/)
  const result = new Map<string, ChapterExtraction>()
  let recentNames: string[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const personMatch = line.match(/^(?:人物|角色|姓名)[：:]\s*(.+)$/)
    if (personMatch) {
      recentNames = rememberName(recentNames, personMatch[1]!.trim())
      continue
    }

    const keyValue = parseKeyValueLine(line)
    if (keyValue) {
      if (SKIP_INLINE_KEYS.has(keyValue.key)) continue
      const targetName = recentNames[0]
      if (!targetName) continue

      const existing = result.get(targetName) ?? {
        inferredName: targetName,
        mentionCount: 1,
        fields: {},
        panelEntries: []
      }

      const panelEntries = [...(existing.panelEntries ?? [])]
      const duplicate = panelEntries.some(
        (item) => item.key === keyValue.key && item.value === keyValue.value
      )
      if (!duplicate) {
        panelEntries.push({
          key: keyValue.key,
          value: keyValue.value,
          excerpt: line.slice(0, 120)
        })
      }

      result.set(targetName, {
        ...existing,
        panelEntries
      })
      continue
    }

    const leadingName = extractLeadingName(line)
    if (leadingName) {
      recentNames = rememberName(recentNames, leadingName)
    }
  }

  return [...result.values()].filter((item) => (item.panelEntries?.length ?? 0) > 0)
}

export function mergeInlineFactsIntoStep1Response<
  T extends { chapterExtractions: ChapterExtraction[] }
>(response: T, inlineFacts: ChapterExtraction[]): T {
  if (inlineFacts.length === 0) return response

  const extractionMap = new Map<string, ChapterExtraction>()
  for (const extraction of response.chapterExtractions) {
    extractionMap.set(extraction.inferredName, extraction)
  }

  for (const fact of inlineFacts) {
    const existing = extractionMap.get(fact.inferredName)
    if (!existing) {
      extractionMap.set(fact.inferredName, fact)
      continue
    }

    extractionMap.set(fact.inferredName, {
      ...existing,
      mentionCount: Math.max(existing.mentionCount, fact.mentionCount),
      panelEntries: [...(existing.panelEntries ?? []), ...(fact.panelEntries ?? [])]
    })
  }

  return {
    ...response,
    chapterExtractions: [...extractionMap.values()]
  }
}
