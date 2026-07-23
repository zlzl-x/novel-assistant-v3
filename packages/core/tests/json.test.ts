import { describe, expect, it } from 'vitest'
import { extractJsonContent } from '../src/utils/json'
import { normalizeStep1LlmPayload } from '../src/recognition/normalize/step1Response'
import { step1LlmResponseSchema } from '../src/recognition/schemas/step1'

describe('extractJsonContent', () => {
  it('parses plain JSON', () => {
    expect(extractJsonContent('{"ok":true}')).toEqual({ ok: true })
  })

  it('strips markdown fences', () => {
    expect(extractJsonContent('```json\n{"ok":true}\n```')).toEqual({ ok: true })
  })

  it('extracts JSON embedded in prose', () => {
    expect(extractJsonContent('说明如下：\n{"ok":true}\n完毕')).toEqual({ ok: true })
  })

  it('repairs trailing commas', () => {
    expect(extractJsonContent('{"ok":true,}')).toEqual({ ok: true })
  })

  it('throws on invalid JSON', () => {
    expect(() => extractJsonContent('not json')).toThrow()
  })
})

describe('normalizeStep1LlmPayload', () => {
  it('coerces array fields and missing confidence', () => {
    const normalized = normalizeStep1LlmPayload({
      mentions: [
        {
          surfaceForm: '张三',
          mentionCount: 0,
          excerpts: ['张三点头']
        }
      ],
      chapterExtractions: [
        {
          name: '张三',
          fields: [{ key: '境界', value: '金丹', excerpt: '金丹修士' }]
        }
      ]
    })

    const parsed = step1LlmResponseSchema.parse(normalized)
    expect(parsed.mentions[0]?.mentionCount).toBe(1)
    expect(parsed.chapterExtractions[0]?.inferredName).toBe('张三')
    expect(parsed.chapterExtractions[0]?.fields.境界?.value).toBe('金丹')
    expect(parsed.chapterExtractions[0]?.fields.境界?.confidence).toBe('medium')
  })

  it('harvests top-level keys on chapter extraction', () => {
    const parsed = step1LlmResponseSchema.parse(
      normalizeStep1LlmPayload({
        mentions: [
          {
            surfaceForm: '杨凌',
            inferredName: '杨凌',
            mentionCount: 1,
            excerpts: ['杨凌出现']
          }
        ],
        chapterExtractions: [
          {
            inferredName: '杨凌',
            mentionCount: 1,
            职业: '矿工',
            等级: '3'
          }
        ]
      })
    )

    expect(parsed.chapterExtractions[0]?.fields.职业?.value).toBe('矿工')
    expect(parsed.chapterExtractions[0]?.fields.等级?.value).toBe('3')
  })

  it('promotes fields attached to mentions', () => {
    const parsed = step1LlmResponseSchema.parse(
      normalizeStep1LlmPayload({
        mentions: [
          {
            surfaceForm: '杨凌',
            inferredName: '杨凌',
            mentionCount: 1,
            excerpts: ['杨凌出现'],
            attributes: {
              职业: { value: '矿工', excerpt: '一名矿工' }
            }
          }
        ],
        chapterExtractions: []
      })
    )

    expect(parsed.chapterExtractions[0]?.fields.职业?.value).toBe('矿工')
  })
})
