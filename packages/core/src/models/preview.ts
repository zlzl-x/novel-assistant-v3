export interface PreviewRow {
  name: string
  existingValue: string | null
  proposedValue: string
  changed: boolean
  checked: boolean
  excerpt?: string
}

export interface CharacterPreviewRows {
  characterId: string
  characterName: string
  mentionCount: number
  rows: PreviewRow[]
}
