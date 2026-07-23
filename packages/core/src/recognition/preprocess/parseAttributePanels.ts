import type { ChapterExtraction } from '../../models/recognition'

export interface ParsedAttributePanel {
  inferredName: string
  fields: ChapterExtraction['fields']
  panelEntries: NonNullable<ChapterExtraction['panelEntries']>
}

const PANEL_TRIGGER =
  /属性面板|人物属性|角色面板|人物信息|角色信息|角色卡|人物卡|状态栏|属性栏|调出.*面板|展开.*面板/i

const SKIP_KEYS = new Set(['人物', '角色', '姓名', '名字'])
const SKIP_ENTRY_KEYS = new Set(['状态', '关系'])

function isKeyValueLine(line: string): { key: string; value: string } | null {
  const match = line.trim().match(/^([^：:]{1,16})[：:]\s*(.+)$/)
  if (!match) return null
  const key = match[1]!.trim()
  const value = match[2]!.trim()
  if (!key || !value || SKIP_KEYS.has(key)) return null
  return { key, value }
}

function buildExcerpt(lines: string[], index: number): string {
  const start = Math.max(0, index - 1)
  const end = Math.min(lines.length, index + 2)
  return lines.slice(start, end).join(' ').trim().slice(0, 120)
}

function createPanelEntry(
  key: string,
  value: string,
  excerpt: string
): { key: string; value: string; excerpt: string } {
  return { key, value, excerpt }
}

function flushPanel(
  name: string,
  entries: Array<{ key: string; value: string; excerpt: string }>,
  result: Map<string, ParsedAttributePanel>
): void {
  if (!name || entries.length === 0) return

  const fields: ChapterExtraction['fields'] = {}
  const panelEntries: NonNullable<ChapterExtraction['panelEntries']> = []

  for (const entry of entries) {
    panelEntries.push(createPanelEntry(entry.key, entry.value, entry.excerpt))
  }

  const existing = result.get(name)
  if (!existing) {
    result.set(name, { inferredName: name, fields, panelEntries })
    return
  }

  result.set(name, {
    inferredName: name,
    fields: { ...existing.fields, ...fields },
    panelEntries: [...existing.panelEntries, ...panelEntries]
  })
}

/** LLM 漏提时，从正文本地补抓「面板/信息卡」类键值块（题材不限，不限于游戏属性） */
export function parseAttributePanelsFromText(text: string): ParsedAttributePanel[] {
  const lines = text.split(/\r?\n/)
  const result = new Map<string, ParsedAttributePanel>()

  let panelActive = false
  let currentName = ''
  let currentEntries: Array<{ key: string; value: string; excerpt: string }> = []

  function commitCurrent(): void {
    if (currentName && currentEntries.length > 0) {
      flushPanel(currentName, currentEntries, result)
    }
    currentEntries = []
  }

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]!
    const line = rawLine.trim()
    if (!line) {
      continue
    }

    if (PANEL_TRIGGER.test(line)) {
      panelActive = true
      continue
    }

    const personMatch = line.match(/^(?:人物|角色|姓名)[：:]\s*(.+)$/)
    if (personMatch) {
      commitCurrent()
      panelActive = true
      currentName = personMatch[1]!.trim()
      continue
    }

    const kv = isKeyValueLine(line)
    if (!kv) {
      if (panelActive && currentEntries.length > 0 && !PANEL_TRIGGER.test(line)) {
        commitCurrent()
        panelActive = false
        currentName = ''
      }
      continue
    }

    if (kv.key === '人物' || kv.key === '角色') {
      commitCurrent()
      panelActive = true
      currentName = kv.value
      continue
    }

    if (SKIP_ENTRY_KEYS.has(kv.key)) {
      continue
    }

    const excerpt = buildExcerpt(lines, index)
    const shouldCapture = panelActive || PANEL_TRIGGER.test(excerpt)

    if (shouldCapture) {
      if (!currentName && panelActive) {
        const prevLines = lines.slice(Math.max(0, index - 3), index).join(' ')
        const nameInContext = prevLines.match(/(?:人物|角色)[：:]\s*([^\s，。；]+)/)
        if (nameInContext) currentName = nameInContext[1]!
      }
      currentEntries.push({ key: kv.key, value: kv.value, excerpt })
      panelActive = true
    }
  }

  commitCurrent()
  return [...result.values()]
}

export function mergeLocalPanelsIntoStep1Response<
  T extends { chapterExtractions: ChapterExtraction[] }
>(response: T, localPanels: ParsedAttributePanel[]): T {
  if (localPanels.length === 0) return response

  const extractionMap = new Map<string, ChapterExtraction>()
  for (const extraction of response.chapterExtractions) {
    extractionMap.set(extraction.inferredName, extraction)
  }

  for (const panel of localPanels) {
    const existing = extractionMap.get(panel.inferredName)
    if (!existing) {
      extractionMap.set(panel.inferredName, {
        inferredName: panel.inferredName,
        mentionCount: 1,
        fields: panel.fields,
        panelEntries: panel.panelEntries
      })
      continue
    }

    extractionMap.set(panel.inferredName, {
      ...existing,
      mentionCount: Math.max(existing.mentionCount, 1),
      fields: { ...existing.fields, ...panel.fields },
      panelEntries: [...(existing.panelEntries ?? []), ...panel.panelEntries]
    })
  }

  return {
    ...response,
    chapterExtractions: [...extractionMap.values()]
  }
}
