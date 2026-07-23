import { describe, expect, it } from 'vitest'
import { characterExtractionLlmSchema } from '../src/recognition/schemas/step2'

describe('characterExtractionLlmSchema', () => {
  it('accepts responses without fields and normalizes aliases', () => {
    const parsed = characterExtractionLlmSchema.parse({
      panelEntries: [{ key: '力量', value: '15', excerpt: '力量：15' }]
    })

    expect(parsed.fields).toEqual({})
    expect(parsed.panelEntries).toHaveLength(1)
  })

  it('clamps protagonistRelation proximity', () => {
    const parsed = characterExtractionLlmSchema.parse({
      fields: {},
      protagonistRelation: {
        type: '同门',
        proximity: 9,
        excerpt: '同门相识'
      }
    })

    expect(parsed.protagonistRelation?.proximity).toBe(5)
  })

  it('fills missing excerpts and confidence for full-merge responses', () => {
    const parsed = characterExtractionLlmSchema.parse({
      fields: {
        境界: { value: '筑基' },
        职业: { value: '矿工', excerpt: '', confidence: 'invalid' }
      },
      panelEntries: [{ key: '力量', value: '7', excerpt: '' }],
      relations: [{ targetName: '王叔', type: '熟人', excerpt: '' }]
    })

    expect(parsed.fields.境界?.excerpt).toBe('筑基')
    expect(parsed.fields.职业?.confidence).toBe('medium')
    expect(parsed.panelEntries?.[0]?.excerpt).toBe('7')
    expect(parsed.relations?.[0]?.excerpt).toBe('王叔：熟人')
  })
})
