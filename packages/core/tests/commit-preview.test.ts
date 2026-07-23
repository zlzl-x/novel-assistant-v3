import { describe, expect, it } from 'vitest'
import type { Character } from '../src/models/character'
import type { Chapter } from '../src/models/project'
import { applyRecognitionCommit, validateCommitInput } from '../src/commit/applyRecognition'
import { buildExistingDisplayRows } from '../src/recognition/preview/buildExistingRows'
import { buildPreviewRows } from '../src/recognition/preview/buildPreviewRows'
import type { CharacterExtraction } from '../src/models/recognition-step2'

const chapter: Chapter = {
  id: 'ch-1',
  projectId: 'proj-1',
  number: 12,
  title: '第十二章',
  rawText: '正文',
  wordCount: 100,
  lastCommittedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
}

function createCharacter(overrides: Partial<Character> = {}): Character {
  const now = '2026-01-01T00:00:00.000Z'
  return {
    id: 'char-1',
    projectId: 'proj-1',
    name: '张三',
    aliases: ['三哥'],
    disambiguation: '青云宗',
    role: 'major',
    identity: { current: '外门弟子', history: [] },
    realm: { current: '筑基', history: [] },
    location: { current: '青云宗', history: [] },
    faction: { current: '青云宗', history: [] },
    summary: '',
    notes: '',
    status: '正常',
    panel: {
      entries: [{ key: '功法/技能', value: '基础剑诀', history: [] }]
    },
    relations: [],
    mentionCount: 5,
    appearances: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('buildExistingDisplayRows', () => {
  it('lists populated standard and panel fields', () => {
    const rows = buildExistingDisplayRows(createCharacter())
    expect(rows.map((row) => row.name)).toEqual(
      expect.arrayContaining(['境界', '所在地', '功法/技能'])
    )
  })

  it('does not duplicate standard panel-backed fields like 职业', () => {
    const rows = buildExistingDisplayRows({
      ...createCharacter(),
      panel: {
        entries: [
          { key: '职业', value: '矿工', history: [] },
          { key: '力量', value: '15', history: [] }
        ]
      }
    })

    expect(rows.filter((row) => row.name === '职业')).toHaveLength(1)
    expect(rows.filter((row) => row.name === '力量')).toHaveLength(1)
  })
})

describe('buildPreviewRows integration cases', () => {
  const character = createCharacter()
  const extraction = (fields: CharacterExtraction['fields'], panelEntries?: CharacterExtraction['panelEntries']): CharacterExtraction => ({
    characterId: 'char-1',
    mentionCount: 3,
    fields,
    panelEntries
  })

  it('new realm change', () => {
    const rows = buildPreviewRows(character, extraction({ 境界: { value: '金丹', excerpt: '突破', confidence: 'high' } }))
    expect(rows[0]?.changed).toBe(true)
  })

  it('unchanged realm skipped', () => {
    expect(buildPreviewRows(character, extraction({ 境界: { value: '筑基', excerpt: '仍是筑基', confidence: 'high' } }))).toHaveLength(0)
  })

  it('new location', () => {
    expect(buildPreviewRows(character, extraction({ 所在地: { value: '万妖岭', excerpt: '抵达', confidence: 'high' } }))[0]?.name).toBe('所在地')
  })

  it('identity change', () => {
    expect(buildPreviewRows(character, extraction({ '身份/称号': { value: '内门弟子', excerpt: '晋升', confidence: 'high' } }))[0]?.name).toBe('身份/称号')
  })

  it('faction change', () => {
    expect(buildPreviewRows(character, extraction({ 势力: { value: '天魔教', excerpt: '投靠', confidence: 'high' } }))[0]?.proposedValue).toBe('天魔教')
  })

  it('panel skill change', () => {
    expect(
      buildPreviewRows(
        character,
        extraction({}, [{ key: '功法/技能', value: '御剑术', excerpt: '习得' }])
      )[0]?.proposedValue
    ).toBe('御剑术')
  })

  it('new panel age field', () => {
    expect(
      buildPreviewRows(
        character,
        extraction({}, [{ key: '年龄/寿命', value: '十八岁', excerpt: '今年十八岁' }])
      )[0]?.existingValue
    ).toBeNull()
  })

  it('skips protagonist relation in preview rows', () => {
    const rows = buildPreviewRows(character, {
      characterId: 'char-1',
      mentionCount: 1,
      fields: {},
      protagonistRelation: { type: '师徒', proximity: 4, excerpt: '拜师' }
    })
    expect(rows).toHaveLength(0)
  })

  it('skips relations in preview rows', () => {
    const rows = buildPreviewRows(character, {
      characterId: 'char-1',
      mentionCount: 1,
      fields: {},
      relations: [{ targetName: '李四', type: '同门', excerpt: '同门' }]
    })
    expect(rows).toHaveLength(0)
  })

  it('multiple changes without excluded status field', () => {
    expect(
      buildPreviewRows(character, extraction({
        境界: { value: '金丹', excerpt: '突破', confidence: 'high' },
        状态: { value: '受伤', excerpt: '负伤', confidence: 'medium' }
      }))
    ).toHaveLength(1)
  })
})

describe('applyRecognitionCommit', () => {
  it('updates checked fields immutably and records commit', () => {
    const character = createCharacter()
    const result = applyRecognitionCommit({
      chapter,
      characters: [character],
      acceptedByCharacter: {
        'char-1': [
          {
            name: '境界',
            existingValue: '筑基',
            proposedValue: '金丹',
            changed: true,
            checked: true,
            excerpt: '突破'
          }
        ]
      },
      appearances: [{ characterId: 'char-1', mentionCount: 3 }],
      commitId: 'commit-1',
      committedAt: '2026-01-02T00:00:00.000Z'
    })

    expect(result.updatedCharacters[0]?.realm.current).toBe('金丹')
    expect(character.realm.current).toBe('筑基')
    expect(result.updatedCharacters[0]?.realm.history).toHaveLength(1)
    expect(result.commit.acceptedFields[0]?.fieldKey).toBe('境界')
    expect(result.updatedCharacters[0]?.appearances).toHaveLength(1)
  })

  it('skips unchecked rows', () => {
    const result = applyRecognitionCommit({
      chapter,
      characters: [createCharacter()],
      acceptedByCharacter: {
        'char-1': [
          {
            name: '境界',
            existingValue: '筑基',
            proposedValue: '金丹',
            changed: true,
            checked: false,
            excerpt: '突破'
          }
        ]
      },
      appearances: [],
      commitId: 'commit-1',
      committedAt: '2026-01-02T00:00:00.000Z'
    })
    expect(result.commit.acceptedFields).toHaveLength(0)
  })

  it('merges aliases', () => {
    const result = applyRecognitionCommit({
      chapter,
      characters: [createCharacter()],
      acceptedByCharacter: {},
      appearances: [{ characterId: 'char-1', mentionCount: 1 }],
      newAliasesByCharacter: { 'char-1': ['小张'] },
      commitId: 'commit-1',
      committedAt: '2026-01-02T00:00:00.000Z'
    })
    expect(result.updatedCharacters[0]?.aliases).toContain('小张')
  })

  it('applies relations for graph commit', () => {
    const source = createCharacter({ id: 'char-1', name: '张三' })
    const target = createCharacter({ id: 'char-2', name: '李四', aliases: [] })
    const result = applyRecognitionCommit({
      chapter,
      characters: [source, target],
      acceptedByCharacter: {},
      appearances: [{ characterId: 'char-1', mentionCount: 1 }],
      relationsByCharacter: {
        'char-1': [{ targetName: '李四', type: '同门' }]
      },
      characterRegistry: [
        { id: 'char-1', name: '张三', aliases: [] },
        { id: 'char-2', name: '李四', aliases: [] }
      ],
      commitId: 'commit-1',
      committedAt: '2026-01-02T00:00:00.000Z'
    })

    expect(result.updatedCharacters[0]?.relations).toEqual([
      { targetCharacterId: 'char-2', type: '同门', sinceChapter: 12 }
    ])
  })
})

describe('validateCommitInput', () => {
  it('rejects non-latest chapter', () => {
    expect(
      validateCommitInput({
        isLatestChapter: false,
        ambiguousCount: 0,
        acceptedByCharacter: { a: [{ name: '境界', existingValue: '', proposedValue: '金丹', changed: true, checked: true }] }
      })
    ).toContain('仅最新章')
  })

  it('rejects empty checked rows and characters', () => {
    expect(
      validateCommitInput({
        isLatestChapter: true,
        ambiguousCount: 0,
        acceptedByCharacter: {},
        previewCharacterCount: 0,
        appearanceCount: 0
      })
    ).toContain('至少确认')
  })

  it('allows appearance-only commits', () => {
    expect(
      validateCommitInput({
        isLatestChapter: true,
        ambiguousCount: 0,
        acceptedByCharacter: {},
        previewCharacterCount: 0,
        appearanceCount: 2
      })
    ).toBeNull()
  })
})
