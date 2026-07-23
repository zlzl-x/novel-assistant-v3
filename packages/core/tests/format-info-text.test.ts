import { describe, expect, it } from 'vitest'
import {
  formatInfoLines,
  mergeInfoTextIntoPreviewRows,
  parseInfoTextToLines
} from '../src/recognition/preview/formatInfoText'

describe('formatInfoText', () => {
  it('formats and parses key-value lines', () => {
    const text = formatInfoLines([
      { name: '职业', value: '打金人' },
      { name: '状态', value: '疲劳' }
    ])
    expect(text).toBe('职业：打金人\n状态：疲劳')
    expect(parseInfoTextToLines(text)).toEqual([
      { name: '职业', value: '打金人' },
      { name: '状态', value: '疲劳' }
    ])
  })

  it('merges edited text back into preview rows and skips excluded keys', () => {
    const merged = mergeInfoTextIntoPreviewRows('职业：矿工\n关系：五哥（冲突）', [
      {
        name: '职业',
        existingValue: null,
        proposedValue: '打金人',
        changed: true,
        checked: true,
        excerpt: '原文'
      }
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0]?.proposedValue).toBe('矿工')
    expect(merged.every((row) => row.checked)).toBe(true)
  })

  it('drops dialogue lines parsed from recognition text', () => {
    const dialogue = '赵侯微笑道："你可以多看几眼，反正你也记不住。"'
    expect(parseInfoTextToLines(`职业：矿工\n${dialogue}\n境界：4`)).toEqual([
      { name: '职业', value: '矿工' },
      { name: '境界', value: '4' }
    ])
    expect(
      mergeInfoTextIntoPreviewRows(`职业：矿工\n${dialogue}\n境界：4`, []).map((row) => row.name)
    ).toEqual(['职业', '境界'])
  })
})
