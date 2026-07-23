import { describe, expect, it } from 'vitest'
import type { Character } from '../src/models/character'
import type { CharacterExtraction } from '../src/models/recognition-step2'
import { buildPreviewRows, mergePreviewRowsByName } from '../src/recognition/preview/buildPreviewRows'
import { sanitizeCharacterExtraction } from '../src/recognition/sanitize/step2'
import { assertStep2PayloadIsSingleCharacter, buildStep2Messages } from '../src/recognition/prompts/step2'
import { executeStep2Pipeline, mergeStep2IntoPreview } from '../src/recognition/pipeline/step2-pipeline'
import { canRunStep2 } from '../src/recognition/gates'

function createCharacter(overrides: Partial<Character> = {}): Character {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? 'char-1',
    projectId: 'proj-1',
    name: overrides.name ?? '张三',
    aliases: overrides.aliases ?? ['三哥'],
    disambiguation: '',
    role: overrides.role ?? 'major',
    identity: { current: '青云宗弟子', history: [] },
    realm: { current: '筑基', history: [] },
    location: { current: '青云宗', history: [] },
    faction: { current: '青云宗', history: [] },
    summary: '',
    notes: '',
    status: '正常',
    protagonistRelation: overrides.protagonistRelation,
    panel: {
      entries: [
        { key: '功法/技能', value: '基础剑诀', history: [] },
        { key: '法宝/装备', value: '青锋剑', history: [] }
      ]
    },
    relations: [],
    mentionCount: 0,
    appearances: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

function createExtraction(overrides: Partial<CharacterExtraction> = {}): CharacterExtraction {
  return {
    characterId: 'char-1',
    mentionCount: 3,
    fields: {},
    ...overrides
  }
}

describe('buildPreviewRows', () => {
  const character = createCharacter()

  it('returns changed realm row', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          境界: { value: '金丹', excerpt: '如今已是金丹修士', confidence: 'high' }
        }
      })
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: '境界',
      existingValue: '筑基',
      proposedValue: '金丹',
      changed: true,
      checked: true
    })
  })

  it('skips unchanged fields', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          境界: { value: '筑基', excerpt: '仍是筑基', confidence: 'high' }
        }
      })
    )
    expect(rows).toHaveLength(0)
  })

  it('includes new location field', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          所在地: { value: '万妖岭', excerpt: '来到万妖岭', confidence: 'high' }
        }
      })
    )
    expect(rows[0]?.name).toBe('所在地')
    expect(rows[0]?.existingValue).toBe('青云宗')
    expect(rows[0]?.proposedValue).toBe('万妖岭')
  })

  it('includes identity change', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          '身份/称号': { value: '内门弟子', excerpt: '晋升内门', confidence: 'medium' }
        }
      })
    )
    expect(rows[0]?.name).toBe('身份/称号')
  })

  it('includes faction change', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          势力: { value: '天魔教', excerpt: '投靠天魔教', confidence: 'high' }
        }
      })
    )
    expect(rows[0]?.proposedValue).toBe('天魔教')
  })

  it('includes panel entry change', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        panelEntries: [{ key: '功法/技能', value: '御剑术', excerpt: '习得御剑术' }]
      })
    )
    expect(rows[0]?.name).toBe('功法/技能')
    expect(rows[0]?.existingValue).toBe('基础剑诀')
  })

  it('includes new panel entry', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        panelEntries: [{ key: '年龄/寿命', value: '十八岁', excerpt: '今年十八岁' }]
      })
    )
    expect(rows[0]?.name).toBe('年龄/寿命')
    expect(rows[0]?.existingValue).toBeNull()
  })

  it('skips relations in preview rows', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        relations: [{ targetName: '李四', type: '同门', excerpt: '与李四同门' }]
      })
    )
    expect(rows).toHaveLength(0)
  })

  it('skips protagonist relation rows in preview', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        relations: [{ targetName: '主角', type: '师徒', excerpt: '拜师主角' }]
      })
    )
    expect(rows).toHaveLength(0)
  })

  it('merges multiple changed fields excluding status', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          境界: { value: '金丹', excerpt: '突破', confidence: 'high' },
          状态: { value: '受伤', excerpt: '身受重伤', confidence: 'medium' }
        }
      })
    )
    expect(rows).toHaveLength(1)
  })

  it('defaults checked to true for changed rows', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          境界: { value: '金丹', excerpt: '突破', confidence: 'high' }
        }
      })
    )
    expect(rows.every((row) => row.checked)).toBe(true)
  })

  it('can include unchanged fields for recognition preview', () => {
    const rows = buildPreviewRows(
      character,
      createExtraction({
        fields: {
          境界: { value: '筑基', excerpt: '仍是筑基', confidence: 'high' },
          职业: { value: '矿工', excerpt: '职业：矿工', confidence: 'high' }
        }
      }),
      { onlyChanged: false }
    )
    expect(rows.some((row) => row.name === '境界')).toBe(true)
    expect(rows.some((row) => row.name === '职业')).toBe(true)
  })
})

describe('sanitizeCharacterExtraction', () => {
  it('falls back to value when excerpt is missing', () => {
    const result = sanitizeCharacterExtraction(createCharacter(), 'char-1', 1, {
      fields: {
        境界: { value: '金丹', excerpt: '', confidence: 'high' }
      }
    })
    expect(result.fields.境界?.value).toBe('金丹')
    expect(result.fields.境界?.excerpt).toBe('金丹')
  })

  it('keeps flexible custom field keys and drops appearance', () => {
    const result = sanitizeCharacterExtraction(createCharacter(), 'char-1', 1, {
      fields: {
        职业: { value: '矿工', excerpt: '职业：矿工', confidence: 'high' },
        外貌: { value: '青衫', excerpt: '青衫少年', confidence: 'medium' },
        力量: { value: '15', excerpt: '力量：15', confidence: 'high' }
      }
    })
    expect(result.fields.职业?.value).toBe('矿工')
    expect(result.fields.外貌).toBeUndefined()
    expect(result.panelEntries?.some((entry) => entry.key === '力量' && entry.value === '15')).toBe(true)
  })
})

describe('executeStep2Pipeline integration', () => {
  it('sends single-character payload per call', async () => {
    const characterA = createCharacter({ id: 'char-a', name: '张三' })
    const characterB = createCharacter({ id: 'char-b', name: '李四', aliases: [] })
    const payloads: string[] = []

    const result = await executeStep2Pipeline({
      chapterId: 'ch-1',
      step1: {
        chapterId: 'ch-1',
        mentions: [],
        chapterExtractions: [
          { inferredName: '张三', mentionCount: 2, fields: {} },
          { inferredName: '李四', mentionCount: 1, fields: {} }
        ],
        unresolvedMentions: [],
        ambiguousNames: []
      },
      characters: [characterA, characterB],
      registry: [
        { id: 'char-a', name: '张三', aliases: [] },
        { id: 'char-b', name: '李四', aliases: [] }
      ],
      completeJson: async (messages) => {
        const user = messages.find((message) => message.role === 'user')?.content ?? ''
        payloads.push(user)
        const id = user.includes('char-a') ? 'char-a' : 'char-b'
        assertStep2PayloadIsSingleCharacter(messages, id)
        expect(user.includes('char-b') && user.includes('char-a')).toBe(false)
        return {
          fields: {
            境界: { value: '金丹', excerpt: '突破', confidence: 'high' },
            '身份/称号': { value: '内门弟子', excerpt: '晋升', confidence: 'high' },
            所在地: { value: '万妖岭', excerpt: '抵达', confidence: 'high' },
            势力: { value: '青云宗', excerpt: '归属', confidence: 'high' }
          },
          relations: [
            { targetName: '李四', type: '同门', excerpt: '同门' },
            { targetName: '主角', type: '盟友', excerpt: '并肩' }
          ],
          panelEntries: [
            { key: '功法/技能', value: '御剑术', excerpt: '习得' },
            { key: '法宝/装备', value: '灵剑', excerpt: '获得' },
            { key: '年龄/寿命', value: '二十', excerpt: '今年二十' }
          ]
        }
      }
    })

    expect(payloads).toHaveLength(2)
    expect(result.step2.characters).toHaveLength(2)
    expect(result.step2.characters[0]?.fields.境界?.excerpt).toBeTruthy()
  })
})

describe('mergeStep2IntoPreview', () => {
  it('merges step2 rows onto step1 rows instead of replacing them', () => {
    const merged = mergeStep2IntoPreview(
      {
        previewRowsByCharacter: {
          'char-1': [
            {
              name: '职业',
              existingValue: null,
              proposedValue: '矿工',
              changed: true,
              checked: true,
              excerpt: '职业：矿工'
            },
            {
              name: '外貌',
              existingValue: null,
              proposedValue: '青衫',
              changed: true,
              checked: true,
              excerpt: '青衫少年'
            }
          ]
        }
      },
      {
        step2: { chapterId: 'ch-1', characters: [] },
        previewRowsByCharacter: {
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
        }
      }
    )

    const rows = merged.previewRowsByCharacter?.['char-1'] ?? []
    expect(rows.some((row) => row.name === '职业')).toBe(true)
    expect(rows.some((row) => row.name === '外貌')).toBe(false)
    expect(rows.some((row) => row.name === '境界')).toBe(true)
  })
})

describe('mergePreviewRowsByName', () => {
  it('overlays changed rows but keeps step1 rows for unchanged fields', () => {
    const merged = mergePreviewRowsByName(
      [
        {
          name: '职业',
          existingValue: null,
          proposedValue: '矿工',
          changed: true,
          checked: true,
          excerpt: '职业：矿工'
        }
      ],
      [
        {
          name: '职业',
          existingValue: '矿工',
          proposedValue: '矿工',
          changed: false,
          checked: false,
          excerpt: '职业：矿工'
        },
        {
          name: '境界',
          existingValue: '筑基',
          proposedValue: '金丹',
          changed: true,
          checked: true,
          excerpt: '突破'
        }
      ]
    )
    expect(merged).toHaveLength(2)
    expect(merged.find((row) => row.name === '职业')?.checked).toBe(true)
    expect(merged.find((row) => row.name === '境界')?.proposedValue).toBe('金丹')
  })
})

describe('canRunStep2', () => {
  it('blocks when ambiguous names exist', () => {
    const allowed = canRunStep2(
      {
        blocked: true,
        step1: {
          chapterId: 'ch-1',
          mentions: [],
          chapterExtractions: [],
          unresolvedMentions: [],
          ambiguousNames: [{ surfaceForm: '张三', candidateCharacterIds: ['a', 'b'], excerpt: 'x' }]
        }
      },
      [{ id: 'a', name: '张三', aliases: [] }]
    )
    expect(allowed).toBe(false)
  })
})
