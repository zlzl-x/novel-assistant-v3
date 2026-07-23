import type { Character } from '../../models/character'
import type { CharacterExtraction } from '../../models/recognition-step2'
import type { PreviewRow } from '../../models/preview'
import { isExcludedPreviewFieldKey } from '../excludedFieldKeys'
import { shouldDropRecognitionEntry } from '../sanitize/fieldNormalization'
import { getCharacterFieldValue } from '../field-keys'
import { normalizeFieldKey } from '../sanitize/fieldNormalization'

function collectProposedRows(extraction: CharacterExtraction): Array<{
  name: string
  proposedValue: string
  excerpt?: string
}> {
  const rows: Array<{ name: string; proposedValue: string; excerpt?: string }> = []

  for (const [name, field] of Object.entries(extraction.fields)) {
    if (isExcludedPreviewFieldKey(name)) continue
    if (shouldDropRecognitionEntry(name, field.value, field.excerpt)) continue
    rows.push({ name, proposedValue: field.value, excerpt: field.excerpt })
  }

  for (const entry of extraction.panelEntries ?? []) {
    if (isExcludedPreviewFieldKey(entry.key)) continue
    if (shouldDropRecognitionEntry(entry.key, entry.value, entry.excerpt)) continue
    rows.push({ name: entry.key, proposedValue: entry.value, excerpt: entry.excerpt })
  }

  return rows
}

export function buildPreviewRows(
  character: Character,
  extraction: CharacterExtraction,
  options?: { onlyChanged?: boolean }
): PreviewRow[] {
  const onlyChanged = options?.onlyChanged ?? true
  const proposedRows = collectProposedRows(extraction)
  const merged = new Map<string, PreviewRow>()

  for (const row of proposedRows) {
    const existingValue = getCharacterFieldValue(character, row.name)
    const changed = (existingValue ?? '') !== row.proposedValue
    if (onlyChanged && !changed) continue

    merged.set(row.name, {
      name: row.name,
      existingValue,
      proposedValue: row.proposedValue,
      changed,
      checked: changed,
      excerpt: row.excerpt
    })
  }

  return [...merged.values()]
}

export function mergePreviewRowsByName(
  baseRows: PreviewRow[] = [],
  overlayRows: PreviewRow[] = []
): PreviewRow[] {
  const byName = new Map<string, PreviewRow>()

  for (const row of baseRows) {
    const canonical = normalizeFieldKey(row.name)
    if (!canonical || isExcludedPreviewFieldKey(canonical)) continue
    byName.set(canonical, { ...row, name: canonical })
  }

  for (const row of overlayRows) {
    const canonical = normalizeFieldKey(row.name)
    if (!canonical || isExcludedPreviewFieldKey(canonical)) continue
    const normalizedRow = { ...row, name: canonical }
    const existing = byName.get(canonical)
    if (existing && !row.changed) continue
    byName.set(canonical, normalizedRow)
  }

  return [...byName.values()]
}

export function buildPreviewRowsForAll(
  characters: Character[],
  extractions: CharacterExtraction[],
  options?: { onlyChanged?: boolean }
): Record<string, PreviewRow[]> {
  const byId = new Map(characters.map((character) => [character.id, character]))
  const result: Record<string, PreviewRow[]> = {}

  for (const extraction of extractions) {
    const character = byId.get(extraction.characterId)
    if (!character) continue
    result[extraction.characterId] = buildPreviewRows(character, extraction, options)
  }

  return result
}
