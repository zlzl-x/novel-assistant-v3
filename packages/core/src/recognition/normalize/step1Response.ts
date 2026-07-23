type Confidence = 'high' | 'medium' | 'low'

type NormalizedField = { value: string; excerpt: string; confidence: Confidence }
type NormalizedPanelEntry = { key: string; value: string; excerpt: string }
type NormalizedChapterExtraction = {
  inferredName: string
  mentionCount: number
  fields: Record<string, NormalizedField>
  relations?: Array<{ targetName: string; type: string; excerpt: string }>
  protagonistRelation?: { type: string; proximity: number; excerpt: string }
  panelEntries?: NormalizedPanelEntry[]
}

const KNOWN_EXTRACTION_KEYS = new Set([
  'inferredName',
  'name',
  'characterName',
  'mentionCount',
  'fields',
  'panelEntries',
  'relations',
  'protagonistRelation',
  'attributes',
  'info',
  'properties',
  'profile',
  'traits',
  'data',
  'mentions',
  'chapterExtractions',
  'chapter_extractions',
  'extractions',
  'characters'
])

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return ''
}

function normalizeConfidence(value: unknown): Confidence {
  const normalized = asString(value).toLowerCase()
  if (normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized
  }
  return 'medium'
}

function normalizePositiveInt(value: unknown, fallback = 1): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(asString(value), 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.round(parsed)
}

function normalizeFieldEntry(raw: unknown): NormalizedField | null {
  const entry = asRecord(raw)
  const value = asString(entry.value ?? entry.text ?? entry.content)
  const excerpt = asString(entry.excerpt ?? entry.quote ?? entry.source ?? entry.context ?? value)
  if (!value || !excerpt) return null
  return {
    value,
    excerpt,
    confidence: normalizeConfidence(entry.confidence)
  }
}

function normalizeFields(raw: unknown): Record<string, NormalizedField> {
  const fields: Record<string, NormalizedField> = {}

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = asRecord(item)
      const key = asString(record.key ?? record.name ?? record.field)
      const entry = normalizeFieldEntry(record)
      if (key && entry) fields[key] = entry
    }
    return fields
  }

  for (const [key, value] of Object.entries(asRecord(raw))) {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      fields[key] = { value: trimmed, excerpt: trimmed, confidence: 'medium' }
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value)
      fields[key] = { value: text, excerpt: text, confidence: 'medium' }
      continue
    }
    const entry = normalizeFieldEntry(value)
    if (entry) fields[key] = entry
  }

  return fields
}

function normalizePanelEntries(raw: unknown): NormalizedPanelEntry[] {
  return asArray(raw)
    .map((item) => {
      const record = asRecord(item)
      const key = asString(record.key ?? record.name ?? record.field)
      const value = asString(record.value ?? record.text ?? record.content)
      const excerpt = asString(record.excerpt ?? record.quote ?? record.source ?? value)
      if (!key || !value || !excerpt) return null
      return { key, value, excerpt }
    })
    .filter((item): item is NormalizedPanelEntry => item !== null)
}

function normalizeRelations(
  raw: unknown
): Array<{ targetName: string; type: string; excerpt: string }> {
  return asArray(raw)
    .map((item) => {
      const record = asRecord(item)
      const targetName = asString(record.targetName ?? record.target ?? record.name ?? record.to)
      const type = asString(record.type ?? record.relation ?? record.label)
      const excerpt = asString(record.excerpt ?? record.quote ?? `${targetName}（${type}）`)
      if (!targetName || !type || !excerpt) return null
      return { targetName, type, excerpt }
    })
    .filter((item): item is { targetName: string; type: string; excerpt: string } => item !== null)
}

function normalizeProtagonistRelation(
  raw: unknown
): { type: string; proximity: number; excerpt: string } | undefined {
  const record = asRecord(raw)
  const type = asString(record.type ?? record.relation)
  const excerpt = asString(record.excerpt ?? record.quote ?? type)
  if (!type || !excerpt) return undefined
  const proximity = Math.min(5, Math.max(1, normalizePositiveInt(record.proximity, 3)))
  return { type, proximity, excerpt }
}

function harvestTopLevelFields(record: Record<string, unknown>): Record<string, NormalizedField> {
  const fields: Record<string, NormalizedField> = {}
  for (const [key, value] of Object.entries(record)) {
    if (KNOWN_EXTRACTION_KEYS.has(key)) continue
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) continue
      fields[key] = { value: trimmed, excerpt: trimmed, confidence: 'medium' }
      continue
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      const text = String(value)
      fields[key] = { value: text, excerpt: text, confidence: 'medium' }
      continue
    }
    const entry = normalizeFieldEntry(value)
    if (entry) fields[key] = entry
  }
  return fields
}

function mergeFields(
  ...sources: Array<Record<string, NormalizedField>>
): Record<string, NormalizedField> {
  return Object.assign({}, ...sources)
}

function mergePanelEntries(...sources: Array<NormalizedPanelEntry[]>): NormalizedPanelEntry[] {
  const seen = new Map<string, NormalizedPanelEntry>()
  for (const entries of sources) {
    for (const entry of entries) {
      seen.set(entry.key, entry)
    }
  }
  return [...seen.values()]
}

function collectNestedFieldSources(record: Record<string, unknown>): Record<string, NormalizedField> {
  return mergeFields(
    normalizeFields(record.fields),
    normalizeFields(record.attributes),
    normalizeFields(record.info),
    normalizeFields(record.properties),
    normalizeFields(record.profile),
    normalizeFields(record.traits),
    normalizeFields(record.data)
  )
}

function normalizeMention(raw: unknown): {
  surfaceForm: string
  inferredName?: string
  mentionCount: number
  excerpts: string[]
  isNickname: boolean
  fields: Record<string, NormalizedField>
  panelEntries: NormalizedPanelEntry[]
} | null {
  const record = asRecord(raw)
  const surfaceForm = asString(record.surfaceForm ?? record.name ?? record.text)
  const inferredName = asString(record.inferredName ?? record.canonicalName ?? surfaceForm) || undefined
  const excerpts = asArray(record.excerpts ?? record.excerpt)
    .map((item) => asString(item))
    .filter(Boolean)
  if (!surfaceForm || excerpts.length === 0) return null

  return {
    surfaceForm,
    inferredName,
    mentionCount: normalizePositiveInt(record.mentionCount, excerpts.length),
    excerpts,
    isNickname: Boolean(record.isNickname),
    fields: collectNestedFieldSources(record),
    panelEntries: mergePanelEntries(
      normalizePanelEntries(record.panelEntries),
      normalizePanelEntries(record.attributes),
      normalizePanelEntries(record.entries)
    )
  }
}

function normalizeChapterExtraction(raw: unknown): NormalizedChapterExtraction | null {
  const record = asRecord(raw)
  const inferredName = asString(record.inferredName ?? record.name ?? record.characterName)
  if (!inferredName) return null

  const fields = mergeFields(collectNestedFieldSources(record), harvestTopLevelFields(record))
  const panelEntries = mergePanelEntries(
    normalizePanelEntries(record.panelEntries),
    normalizePanelEntries(record.entries),
    normalizePanelEntries(record.attributes)
  )
  const relations = normalizeRelations(record.relations)
  const protagonistRelation = normalizeProtagonistRelation(record.protagonistRelation)

  return {
    inferredName,
    mentionCount: normalizePositiveInt(record.mentionCount, 1),
    fields,
    ...(relations.length > 0 ? { relations } : {}),
    ...(protagonistRelation ? { protagonistRelation } : {}),
    ...(panelEntries.length > 0 ? { panelEntries } : {})
  }
}

function canonicalNameForLabel(
  label: string,
  mentions: ReturnType<typeof normalizeMention>[]
): string {
  const trimmed = label.trim()
  for (const mention of mentions) {
    if (!mention) continue
    if (mention.surfaceForm === trimmed || mention.inferredName === trimmed) {
      return mention.inferredName ?? mention.surfaceForm
    }
  }
  return trimmed
}

function mergeChapterExtractions(
  left: NormalizedChapterExtraction,
  right: NormalizedChapterExtraction
): NormalizedChapterExtraction {
  return {
    inferredName: left.inferredName,
    mentionCount: Math.max(left.mentionCount, right.mentionCount),
    fields: mergeFields(left.fields, right.fields),
    panelEntries: mergePanelEntries(left.panelEntries ?? [], right.panelEntries ?? []),
    relations: [...(left.relations ?? []), ...(right.relations ?? [])],
    protagonistRelation: right.protagonistRelation ?? left.protagonistRelation
  }
}

function upsertExtraction(
  map: Map<string, NormalizedChapterExtraction>,
  extraction: NormalizedChapterExtraction
): void {
  const existing = map.get(extraction.inferredName)
  if (!existing) {
    map.set(extraction.inferredName, extraction)
    return
  }
  map.set(extraction.inferredName, mergeChapterExtractions(existing, extraction))
}

/** 容错 LLM 常见 JSON 结构偏差，再交给 zod 校验 */
export function normalizeStep1LlmPayload(raw: unknown): unknown {
  const record = asRecord(raw)
  const mentions = asArray(record.mentions)
    .map((item) => normalizeMention(item))
    .filter((item): item is NonNullable<typeof item> => item !== null)

  const extractionMap = new Map<string, NormalizedChapterExtraction>()
  const rawExtractions = asArray(
    record.chapterExtractions ?? record.chapter_extractions ?? record.extractions ?? record.characters
  )

  for (const item of rawExtractions) {
    const extraction = normalizeChapterExtraction(item)
    if (!extraction) continue
    const canonical = canonicalNameForLabel(extraction.inferredName, mentions)
    upsertExtraction(extractionMap, { ...extraction, inferredName: canonical })
  }

  for (const mention of mentions) {
    const canonical = mention.inferredName ?? mention.surfaceForm
    const fromMention: NormalizedChapterExtraction = {
      inferredName: canonical,
      mentionCount: mention.mentionCount,
      fields: mention.fields,
      panelEntries: mention.panelEntries.length > 0 ? mention.panelEntries : undefined
    }
    if (Object.keys(fromMention.fields).length > 0 || fromMention.panelEntries?.length) {
      upsertExtraction(extractionMap, fromMention)
    }
  }

  for (const mention of mentions) {
    const canonical = mention.inferredName ?? mention.surfaceForm
    if (!extractionMap.has(canonical)) {
      extractionMap.set(canonical, {
        inferredName: canonical,
        mentionCount: mention.mentionCount,
        fields: {}
      })
    }
  }

  return {
    mentions: mentions.map(({ fields: _fields, panelEntries: _panelEntries, ...mention }) => mention),
    chapterExtractions: [...extractionMap.values()]
  }
}
