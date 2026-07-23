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

function normalizeConfidence(value: unknown): 'high' | 'medium' | 'low' {
  const confidence = asString(value)
  if (confidence === 'high' || confidence === 'medium' || confidence === 'low') {
    return confidence
  }
  return 'medium'
}

function normalizeFields(fields: unknown): Record<string, unknown> {
  const record = asRecord(fields)
  const result: Record<string, unknown> = {}

  for (const [key, raw] of Object.entries(record)) {
    const field = asRecord(raw)
    const value = asString(field.value)
    if (!value) continue
    const excerpt = asString(field.excerpt) || value
    result[key] = {
      value,
      excerpt,
      confidence: normalizeConfidence(field.confidence)
    }
  }

  return result
}

function normalizePanelEntries(entries: unknown): unknown[] {
  return asArray<Record<string, unknown>>(entries)
    .map((entry) => {
      const key = asString(entry.key)
      const value = asString(entry.value)
      if (!key || !value) return null
      return {
        key,
        value,
        excerpt: asString(entry.excerpt) || value
      }
    })
    .filter((entry): entry is { key: string; value: string; excerpt: string } => entry !== null)
}

function normalizeRelations(relations: unknown): unknown[] {
  return asArray<Record<string, unknown>>(relations)
    .map((relation) => {
      const targetName = asString(relation.targetName)
      const type = asString(relation.type)
      if (!targetName || !type) return null
      return {
        targetName,
        type,
        excerpt: asString(relation.excerpt) || `${targetName}：${type}`
      }
    })
    .filter(
      (relation): relation is { targetName: string; type: string; excerpt: string } =>
        relation !== null
    )
}

/** 容错 Step2 LLM 常见结构偏差，再交给 zod 校验 */
export function normalizeStep2LlmPayload(raw: unknown): unknown {
  const record = asRecord(raw)
  const fields = record.fields ?? record.attributes ?? record.info ?? record.properties
  const panelEntries = record.panelEntries ?? record.entries ?? record.attributes
  const protagonistRelation = asRecord(record.protagonistRelation ?? record.relationToProtagonist)
  const proximity = Number(protagonistRelation.proximity)
  const relationType = asString(protagonistRelation.type)
  const relationExcerpt = asString(protagonistRelation.excerpt) || relationType

  return {
    mentionCount: record.mentionCount,
    proposedNewAliases: record.proposedNewAliases ?? record.aliases,
    fields: normalizeFields(fields ?? {}),
    relations: normalizeRelations(record.relations ?? []),
    protagonistRelation:
      relationType && relationExcerpt
        ? {
            type: relationType,
            proximity: Number.isFinite(proximity)
              ? Math.min(5, Math.max(1, Math.round(proximity)))
              : 3,
            excerpt: relationExcerpt
          }
        : undefined,
    panelEntries: normalizePanelEntries(panelEntries ?? [])
  }
}

export function summarizeStep2ParseError(raw: unknown): string {
  const record = asRecord(raw)
  const keys = Object.keys(record)
  return keys.length > 0 ? `返回字段：${keys.join('、')}` : '返回内容为空'
}
