import { describe, expect, it } from 'vitest'
import { isNoiseExtraction } from '../src/recognition/sanitize/extractionNoise'
import { isPlausibleCharacterName } from '../src/recognition/sanitize/mentionFilter'
import { sanitizeStep1LlmResponse } from '../src/recognition/sanitize/step1'

describe('isNoiseExtraction', () => {
  it('filters UI narration about panels but keeps stat keys', () => {
    expect(
      isNoiseExtraction(
        '能力',
        '能查看NPC属性面板',
        '下一秒，五哥的属性在他面前展开。'
      )
    ).toBe(true)
    expect(isNoiseExtraction('职业', '矿工', '杨凌立即调动出属性面板')).toBe(false)
    expect(isNoiseExtraction('力量', '5', '力量：5')).toBe(false)
  })

  it('keeps actual stat values even when excerpt mentions panels', () => {
    expect(isNoiseExtraction('力量', '15', '五哥的力量是 15')).toBe(false)
    expect(isNoiseExtraction('外貌', '青衫', '属性面板在眼前展开')).toBe(false)
  })
})

describe('isPlausibleCharacterName', () => {
  it('rejects common narrative words', () => {
    expect(isPlausibleCharacterName('随后')).toBe(false)
    expect(isPlausibleCharacterName('杨凌')).toBe(true)
  })
})

describe('sanitizeStep1LlmResponse flexible fields', () => {
  it('keeps custom field keys and filters noise', () => {
    const sanitized = sanitizeStep1LlmResponse({
      mentions: [
        {
          surfaceForm: '五哥',
          inferredName: '五哥',
          mentionCount: 2,
          excerpts: ['五哥的力量是 15'],
          isNickname: false
        }
      ],
      chapterExtractions: [
        {
          inferredName: '五哥',
          mentionCount: 2,
          fields: {
            力量: { value: '15', excerpt: '五哥的力量是 15', confidence: 'high' }
          },
          panelEntries: [
            {
              key: '面板',
              value: '能查看NPC属性面板',
              excerpt: '下一秒，五哥的属性在他面前展开。'
            }
          ]
        }
      ]
    })

    expect(sanitized.chapterExtractions[0]?.panelEntries?.some((entry) => entry.key === '力量' && entry.value === '15')).toBe(true)
    expect(sanitized.chapterExtractions[0]?.fields.力量).toBeUndefined()
    expect(sanitized.chapterExtractions[0]?.panelEntries ?? []).toHaveLength(1)
  })

  it('does not create empty cards for narrative words', () => {
    const sanitized = sanitizeStep1LlmResponse({
      mentions: [
        {
          surfaceForm: '随后',
          inferredName: '随后',
          mentionCount: 1,
          excerpts: ['随后他离开了'],
          isNickname: false
        },
        {
          surfaceForm: '杨凌',
          inferredName: '杨凌',
          mentionCount: 3,
          excerpts: ['杨凌点了点头'],
          isNickname: false
        }
      ],
      chapterExtractions: [
        {
          inferredName: '杨凌',
          mentionCount: 3,
          fields: {
            职业: { value: '矿工', excerpt: '职业：矿工', confidence: 'high' }
          }
        }
      ]
    })

    expect(sanitized.mentions.some((mention) => mention.surfaceForm === '随后')).toBe(false)
    expect(sanitized.chapterExtractions).toHaveLength(1)
    expect(sanitized.chapterExtractions[0]?.fields.职业?.value).toBe('矿工')
  })

  it('uses value as excerpt fallback', () => {
    const sanitized = sanitizeStep1LlmResponse({
      mentions: [],
      chapterExtractions: [
        {
          inferredName: '杨凌',
          mentionCount: 1,
          fields: {
            境界: { value: '练气三层', excerpt: '', confidence: 'high' }
          }
        }
      ]
    })

    expect(sanitized.chapterExtractions[0]?.fields.境界?.value).toBe('练气三层')
  })

  it('filters dialogue mistakenly stored as field key', () => {
    const dialogue = '赵侯微笑道："你可以多看几眼，反正你也记不住。"'
    const sanitized = sanitizeStep1LlmResponse({
      mentions: [
        {
          surfaceForm: '杨凌',
          inferredName: '杨凌',
          mentionCount: 1,
          excerpts: ['杨凌点了点头'],
          isNickname: false
        }
      ],
      chapterExtractions: [
        {
          inferredName: '杨凌',
          mentionCount: 1,
          fields: {
            职业: { value: '矿工', excerpt: '职业：矿工', confidence: 'high' },
            [dialogue]: { value: dialogue, excerpt: dialogue, confidence: 'high' }
          }
        }
      ]
    })

    expect(sanitized.chapterExtractions[0]?.fields.职业?.value).toBe('矿工')
    expect(
      sanitized.chapterExtractions[0]?.panelEntries?.some((entry) => entry.key.includes('微笑道'))
    ).toBe(false)
  })
})
