import { describe, expect, it } from 'vitest'
import type { Character } from '../src/models/character'
import { mergeCharacters } from '../src/character/mergeCharacters'

function createCharacter(overrides: Partial<Character> = {}): Character {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'char-1',
    projectId: 'proj-1',
    name: '吴缺',
    aliases: [],
    disambiguation: '',
    role: 'major',
    identity: { current: '流民', history: [] },
    realm: { current: '4', history: [] },
    location: { current: '火晶岩矿脉', history: [] },
    faction: undefined,
    summary: '',
    notes: '',
    panel: {
      entries: [{ key: '职业', value: '矿工', history: [] }]
    },
    relations: [],
    mentionCount: 3,
    appearances: [
      {
        chapterId: 'ch-1',
        chapterNumber: 1,
        mentionCount: 2,
        committedAt: now
      }
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('mergeCharacters', () => {
  it('keeps primary name and adds secondary name as alias', () => {
    const primary = createCharacter({ id: 'a', name: '吴缺' })
    const secondary = createCharacter({
      id: 'b',
      name: '吴监事',
      aliases: ['吴管事'],
      role: 'minor',
      mentionCount: 2
    })

    const merged = mergeCharacters({ primary, secondary })
    expect(merged.name).toBe('吴缺')
    expect(merged.aliases).toEqual(expect.arrayContaining(['吴监事', '吴管事']))
    expect(merged.mentionCount).toBe(5)
  })

  it('merges appearances for the same chapter', () => {
    const primary = createCharacter({
      id: 'a',
      appearances: [
        {
          chapterId: 'ch-1',
          chapterNumber: 1,
          mentionCount: 2,
          committedAt: '2026-01-01T00:00:00.000Z'
        }
      ]
    })
    const secondary = createCharacter({
      id: 'b',
      name: '吴监事',
      appearances: [
        {
          chapterId: 'ch-1',
          chapterNumber: 1,
          mentionCount: 3,
          committedAt: '2026-01-02T00:00:00.000Z'
        }
      ]
    })

    const merged = mergeCharacters({ primary, secondary })
    expect(merged.appearances).toHaveLength(1)
    expect(merged.appearances[0]?.mentionCount).toBe(5)
  })

  it('rejects merging different projects', () => {
    const primary = createCharacter({ id: 'a', projectId: 'p1' })
    const secondary = createCharacter({ id: 'b', projectId: 'p2', name: '吴监事' })
    expect(() => mergeCharacters({ primary, secondary })).toThrow('同一作品')
  })
})
