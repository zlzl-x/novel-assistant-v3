import { describe, expect, it } from 'vitest'
import type { Step1Result } from '../src/models/recognition'
import {
  buildPreviewFromStep1,
  buildPreviewRowsFromChapterExtraction,
  isPendingCharacterKey,
  toPendingCharacterKey
} from '../src/recognition/preview/buildPreviewFromStep1'
import { previewRoleTierToCharacterRole } from '../src/recognition/preview/roleMapping'
import { isPreviewReady } from '../src/recognition/gates'

const step1: Step1Result = {
  chapterId: 'ch-1',
  mentions: [],
  unresolvedMentions: ['张三', '李四'],
  ambiguousNames: [],
  chapterExtractions: [
    {
      inferredName: '张三',
      mentionCount: 8,
      fields: {
        境界: { value: '金丹', excerpt: '如今已是金丹修士', confidence: 'high' }
      },
      panelEntries: [{ key: '外貌', value: '青衫', excerpt: '青衫少年' }]
    },
    {
      inferredName: '李四',
      mentionCount: 2,
      fields: {
        身份: { value: '掌柜', excerpt: '李四是掌柜', confidence: 'medium' }
      }
    }
  ]
}

describe('buildPreviewFromStep1', () => {
  it('creates pending preview rows for unresolved characters', () => {
    const result = buildPreviewFromStep1(step1, [])

    const zhangKey = toPendingCharacterKey('张三')
    expect(isPendingCharacterKey(zhangKey)).toBe(true)
    expect(result.characterPreviewMeta[zhangKey]?.isPending).toBe(true)
    expect(result.previewRowsByCharacter[zhangKey]?.length).toBe(1)
    expect(result.protagonistPreviewKey).toBe(zhangKey)
    expect(result.characterPreviewMeta[zhangKey]?.roleTier).toBe('protagonist')
  })

  it('maps matched characters to real ids', () => {
    const result = buildPreviewFromStep1(step1, [
      { id: 'char-zhang', name: '张三', aliases: [] }
    ])

    expect(result.characterPreviewMeta['char-zhang']?.isPending).toBe(false)
    expect(result.previewRowsByCharacter['char-zhang']?.[0]?.proposedValue).toBe('金丹')
    expect(result.previewRowsByCharacter[toPendingCharacterKey('李四')]).toBeDefined()
  })

  it('merges extractions mapped to the same character id', () => {
    const result = buildPreviewFromStep1(
      {
        chapterId: 'ch-1',
        mentions: [],
        unresolvedMentions: [],
        ambiguousNames: [],
        chapterExtractions: [
          {
            inferredName: '张三',
            mentionCount: 2,
            fields: {
              境界: { value: '金丹', excerpt: '金丹修士', confidence: 'high' }
            }
          },
          {
            inferredName: '三哥',
            mentionCount: 1,
            fields: {
              职业: { value: '矿工', excerpt: '职业：矿工', confidence: 'high' }
            }
          }
        ]
      },
      [{ id: 'char-zhang', name: '张三', aliases: ['三哥'] }]
    )

    const rows = result.previewRowsByCharacter['char-zhang'] ?? []
    expect(rows.some((row) => row.name === '境界')).toBe(true)
    expect(rows.some((row) => row.name === '职业')).toBe(true)
  })
})

describe('buildPreviewRowsFromChapterExtraction', () => {
  it('normalizes field keys and drops appearance', () => {
    const rows = buildPreviewRowsFromChapterExtraction(step1.chapterExtractions[0]!)
    expect(rows.some((row) => row.name === '外貌')).toBe(false)
    expect(rows.some((row) => row.name === '境界' && row.proposedValue === '金丹')).toBe(true)
    expect(rows.every((row) => row.checked)).toBe(true)
  })

  it('merges duplicate identity keys', () => {
    const rows = buildPreviewRowsFromChapterExtraction(step1.chapterExtractions[1]!)
    expect(rows.some((row) => row.name === '身份/称号' && row.proposedValue === '掌柜')).toBe(true)
    expect(rows.some((row) => row.name === '身份')).toBe(false)
  })
})

describe('previewRoleTierToCharacterRole', () => {
  it('maps tiers to character roles', () => {
    expect(previewRoleTierToCharacterRole('protagonist', false)).toBe('protagonist')
    expect(previewRoleTierToCharacterRole('supporting', true)).toBe('protagonist')
    expect(previewRoleTierToCharacterRole('extra', false)).toBe('mentioned')
    expect(previewRoleTierToCharacterRole('supporting', false)).toBe('major')
  })
})

describe('isPreviewReady', () => {
  it('is ready when step1 preview meta exists', () => {
    const preview = buildPreviewFromStep1(step1, [])
    expect(
      isPreviewReady({
        chapterId: 'ch-1',
        textHash: 'hash',
        step1,
        previewRowsByCharacter: preview.previewRowsByCharacter,
        characterPreviewMeta: preview.characterPreviewMeta,
        isLatestChapter: true,
        generatedAt: '2026-01-01T00:00:00.000Z'
      })
    ).toBe(true)
  })
})
