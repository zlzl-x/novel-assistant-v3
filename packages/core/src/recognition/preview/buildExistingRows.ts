import type { Character } from '../../models/character'
import { getCharacterFieldValue } from '../field-keys'
import { shouldDropRecognitionEntry } from '../sanitize/fieldNormalization'

const STANDARD_FIELD_NAMES = [
  '身份/称号',
  '境界',
  '职业',
  '所在地',
  '势力',
  '状态'
] as const

const STANDARD_FIELD_NAME_SET = new Set<string>(STANDARD_FIELD_NAMES)

export function buildExistingDisplayRows(
  character: Character
): Array<{ name: string; value: string }> {
  const rows: Array<{ name: string; value: string }> = []

  for (const name of STANDARD_FIELD_NAMES) {
    const value = getCharacterFieldValue(character, name)
    if (value) rows.push({ name, value })
  }

  for (const entry of character.panel.entries) {
    const key = entry.key.trim()
    if (!key || !entry.value.trim()) continue
    if (STANDARD_FIELD_NAME_SET.has(key)) continue
    if (shouldDropRecognitionEntry(key, entry.value)) continue
    rows.push({ name: key, value: entry.value })
  }

  return rows
}
