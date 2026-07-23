import { describe, expect, it } from 'vitest'
import {
  extractInlineFactsFromText,
  mergeInlineFactsIntoStep1Response
} from '../src/recognition/preprocess/extractInlineFacts'

describe('extractInlineFactsFromText', () => {
  it('associates inline key-value lines with recent character name', () => {
    const text = `杨凌走进矿洞。

职业：矿工
等级：3
力量：5`

    const facts = extractInlineFactsFromText(text)
    expect(facts).toHaveLength(1)
    expect(facts[0]?.inferredName).toBe('杨凌')
    const keys = facts[0]?.panelEntries?.map((entry) => entry.key) ?? []
    expect(keys).toEqual(expect.arrayContaining(['职业', '等级', '力量']))
  })

  it('merges inline facts into step1 response', () => {
    const merged = mergeInlineFactsIntoStep1Response(
      {
        mentions: [],
        chapterExtractions: [
          {
            inferredName: '杨凌',
            mentionCount: 2,
            fields: {}
          }
        ]
      },
      extractInlineFactsFromText('杨凌\n职业：矿工')
    )

    expect(
      merged.chapterExtractions[0]?.panelEntries?.some(
        (entry) => entry.key === '职业' && entry.value === '矿工'
      )
    ).toBe(true)
  })
})
