import { describe, expect, it } from 'vitest'
import {
  isDialogueLike,
  isDroppedFieldKey,
  isInvalidFactionValue,
  isInvalidFieldValue,
  isWeakLocationValue,
  normalizeExtractedFields,
  normalizeFieldKey,
  shouldDropRecognitionEntry
} from '../src/recognition/sanitize/fieldNormalization'

describe('normalizeFieldKey', () => {
  it('merges common aliases into standard keys', () => {
    expect(normalizeFieldKey('身份')).toBe('身份/称号')
    expect(normalizeFieldKey('身份/背景')).toBe('身份/称号')
    expect(normalizeFieldKey('等级')).toBe('境界')
    expect(normalizeFieldKey('修为')).toBe('境界')
  })

  it('drops appearance and dialogue keys', () => {
    expect(normalizeFieldKey('外貌')).toBeNull()
    expect(normalizeFieldKey('对话')).toBeNull()
    expect(isDroppedFieldKey('长相')).toBe(true)
  })
})

describe('normalizeExtractedFields', () => {
  it('deduplicates realm and identity variants', () => {
    const normalized = normalizeExtractedFields([
      {
        key: '身份',
        field: { value: '外门弟子', excerpt: '外门弟子', confidence: 'high' }
      },
      {
        key: '身份/背景',
        field: { value: '矿工出身', excerpt: '矿工出身', confidence: 'medium' }
      },
      {
        key: '等级',
        field: { value: '3', excerpt: '等级：3', confidence: 'high' }
      },
      {
        key: '境界',
        field: { value: '练气三层', excerpt: '练气三层', confidence: 'high' }
      }
    ])

    expect(normalized.fields['身份/称号']?.value).toBe('外门弟子')
    expect(normalized.fields.境界?.value).toBe('练气三层')
    expect(normalized.fields.等级).toBeUndefined()
    expect(normalized.fields.身份).toBeUndefined()
  })

  it('keeps game stats as free-form panel entries', () => {
    const normalized = normalizeExtractedFields([
      {
        key: '力量',
        field: { value: '15', excerpt: '力量：15', confidence: 'high' }
      },
      {
        key: '幸运',
        field: { value: '7', excerpt: '幸运：7', confidence: 'medium' }
      }
    ])

    expect(normalized.fields.力量).toBeUndefined()
    expect(normalized.panelEntries).toEqual(
      expect.arrayContaining([
        { key: '力量', value: '15', excerpt: '力量：15' },
        { key: '幸运', value: '7', excerpt: '幸运：7' }
      ])
    )
  })

  it('drops dialogue-like values', () => {
    expect(
      isDialogueLike('「你来了。」', '他笑道：「你来了。」')
    ).toBe(true)
    expect(
      isDialogueLike('你可以多看几眼', '赵侯微笑道："你可以多看几眼，反正你也记不住。"')
    ).toBe(true)

    const normalized = normalizeExtractedFields([
      {
        key: '备注',
        field: { value: '「你来了。」', excerpt: '他笑道：「你来了。」', confidence: 'medium' }
      }
    ])

    expect(normalized.panelEntries).toHaveLength(0)
    expect(Object.keys(normalized.fields)).toHaveLength(0)
  })

  it('rejects interpersonal faction values and weak location terms', () => {
    expect(isInvalidFactionValue('与牛管事合作')).toBe(true)
    expect(isInvalidFactionValue('赵家')).toBe(false)
    expect(isWeakLocationValue('矿脉出口')).toBe(true)
    expect(isWeakLocationValue('火晶岩矿')).toBe(false)

    const normalized = normalizeExtractedFields([
      {
        key: '势力',
        field: { value: '与牛管事合作', excerpt: '与牛管事合作开采', confidence: 'high' }
      },
      {
        key: '所在地',
        field: { value: '矿脉出口', excerpt: '站在矿脉出口', confidence: 'high' }
      },
      {
        key: '所在地',
        field: { value: '火晶岩矿', excerpt: '火晶岩矿深处', confidence: 'high' }
      }
    ])

    expect(normalized.fields.势力).toBeUndefined()
    expect(normalized.fields.所在地?.value).toBe('火晶岩矿')
    expect(isInvalidFieldValue('所在地', '矿脉出口')).toBe(true)
  })

  it('drops dialogue used as panel entry key', () => {
    const dialogue = '赵侯微笑道："你可以多看几眼，反正你也记不住。"'
    expect(shouldDropRecognitionEntry(dialogue, dialogue)).toBe(true)
    expect(shouldDropRecognitionEntry('备注', dialogue)).toBe(true)
    expect(normalizeFieldKey(dialogue)).toBeNull()

    const normalized = normalizeExtractedFields([
      {
        key: dialogue,
        field: { value: dialogue, excerpt: dialogue, confidence: 'high' }
      },
      {
        key: '境界',
        field: { value: '4', excerpt: '境界：4', confidence: 'high' }
      }
    ])

    expect(normalized.fields.境界?.value).toBe('4')
    expect(normalized.panelEntries).toHaveLength(0)
  })

  it('drops speech attribution mistaken as field key', () => {
    expect(isDialogueLike('赵侯微笑道')).toBe(true)
    expect(shouldDropRecognitionEntry('赵侯微笑道', '"你可以多看几眼，反正你也记不住。"')).toBe(
      true
    )
  })
})
