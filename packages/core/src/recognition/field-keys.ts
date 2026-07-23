import type { Character } from '../models/character'
import { RECOGNITION_FIELD_KEYS } from '../constants'

export const PANEL_FIELD_KEYS = ['功法/技能', '法宝/装备', '年龄/寿命'] as const

export type PanelFieldKey = (typeof PANEL_FIELD_KEYS)[number]

export const RECOGNITION_FIELD_KEY_SET = new Set<string>([
  ...RECOGNITION_FIELD_KEYS,
  ...PANEL_FIELD_KEYS
])

export function getCharacterFieldValue(character: Character, fieldName: string): string | null {
  switch (fieldName) {
    case '身份/称号':
      return character.identity.current || null
    case '境界':
      return character.realm.current || null
    case '所在地':
      return character.location.current || null
    case '势力':
      return character.faction?.current || null
    case '状态':
      return character.status || null
    case '与主角关系':
      return character.protagonistRelation?.type || null
    case '与主角关系远近':
      return character.protagonistRelation
        ? String(character.protagonistRelation.proximity)
        : null
    default: {
      const panelEntry = character.panel.entries.find((entry) => entry.key === fieldName)
      return panelEntry?.value || null
    }
  }
}

export function isAllowedFieldKey(fieldName: string, panelKeys: string[] = []): boolean {
  return RECOGNITION_FIELD_KEY_SET.has(fieldName) || panelKeys.includes(fieldName)
}
