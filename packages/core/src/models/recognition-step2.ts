import type { ExtractedField } from './recognition'

export interface CharacterExtraction {
  characterId: string
  mentionCount: number
  proposedNewAliases?: string[]
  fields: Record<string, ExtractedField>
  relations?: Array<{
    targetName: string
    type: string
    excerpt: string
  }>
  protagonistRelation?: {
    type: string
    proximity: number
    excerpt: string
  }
  panelEntries?: Array<{
    key: string
    value: string
    excerpt: string
  }>
}
