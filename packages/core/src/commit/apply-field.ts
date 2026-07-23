import type { Character } from '../models/character'
import type { Chapter } from '../models/project'
import type { PreviewRow } from '../models/preview'
import { PROXIMITY_MAX, PROXIMITY_MIN } from '../constants'
import { shouldDropRecognitionEntry } from '../recognition/sanitize/fieldNormalization'

function clampProximity(value: string): number {
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return PROXIMITY_MIN
  return Math.min(PROXIMITY_MAX, Math.max(PROXIMITY_MIN, Math.round(parsed)))
}

function appendHistory<T>(
  field: { current: T; history: Character['identity']['history'] },
  value: T,
  chapter: Chapter,
  committedAt: string,
  excerpt?: string
) {
  return {
    current: value,
    history: [
      ...field.history,
      {
        value,
        chapterId: chapter.id,
        chapterNumber: chapter.number,
        source: 'recognition' as const,
        recognizedAt: committedAt,
        excerpt
      }
    ]
  }
}

export function applyPreviewRowToCharacter(
  character: Character,
  row: PreviewRow,
  chapter: Chapter,
  committedAt: string
): Character {
  if (shouldDropRecognitionEntry(row.name, row.proposedValue, row.excerpt)) {
    return character
  }

  switch (row.name) {
    case '身份/称号':
      return {
        ...character,
        identity: appendHistory(character.identity, row.proposedValue, chapter, committedAt, row.excerpt)
      }
    case '境界':
      return {
        ...character,
        realm: appendHistory(character.realm, row.proposedValue, chapter, committedAt, row.excerpt)
      }
    case '所在地':
      return {
        ...character,
        location: appendHistory(character.location, row.proposedValue, chapter, committedAt, row.excerpt)
      }
    case '势力':
      return {
        ...character,
        faction: appendHistory(
          character.faction ?? { current: '', history: [] },
          row.proposedValue,
          chapter,
          committedAt,
          row.excerpt
        )
      }
    case '状态':
      return { ...character, status: row.proposedValue }
    case '与主角关系':
      return {
        ...character,
        protagonistRelation: {
          type: row.proposedValue,
          proximity: character.protagonistRelation?.proximity ?? PROXIMITY_MIN,
          label: character.protagonistRelation?.label
        }
      }
    case '与主角关系远近':
      return {
        ...character,
        protagonistRelation: {
          type: character.protagonistRelation?.type ?? '',
          proximity: clampProximity(row.proposedValue),
          label: character.protagonistRelation?.label
        }
      }
  }

  const panelIndex = character.panel.entries.findIndex((entry) => entry.key === row.name)
  if (panelIndex >= 0) {
    const entries = character.panel.entries.map((entry, index) =>
      index === panelIndex
        ? {
            ...entry,
            value: row.proposedValue,
            history: [
              ...entry.history,
              {
                value: row.proposedValue,
                chapterId: chapter.id,
                source: 'recognition' as const,
                excerpt: row.excerpt
              }
            ]
          }
        : entry
    )
    return { ...character, panel: { ...character.panel, entries } }
  }

  return {
    ...character,
    panel: {
      ...character.panel,
      entries: [
        ...character.panel.entries,
        {
          key: row.name,
          value: row.proposedValue,
          history: [
            {
              value: row.proposedValue,
              chapterId: chapter.id,
              source: 'recognition' as const,
              excerpt: row.excerpt
            }
          ]
        }
      ]
    }
  }
}
