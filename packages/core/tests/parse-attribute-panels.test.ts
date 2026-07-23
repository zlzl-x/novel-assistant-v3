import { describe, expect, it } from 'vitest'
import {
  mergeLocalPanelsIntoStep1Response,
  parseAttributePanelsFromText
} from '../src/recognition/preprocess/parseAttributePanels'

const SAMPLE = `杨凌立即调动出属性面板：

　　人物：杨凌

　　职业：矿工

　　等级：3

　　自由属性点：1

　　力量：5

　　敏捷：5

　　精神：10

　　生命值：50`

describe('parseAttributePanelsFromText', () => {
  it('extracts all stat lines from game attribute panel', () => {
    const panels = parseAttributePanelsFromText(SAMPLE)
    expect(panels).toHaveLength(1)
    expect(panels[0]?.inferredName).toBe('杨凌')

    const keys = panels[0]?.panelEntries.map((entry) => entry.key) ?? []
    expect(keys).toContain('职业')
    expect(keys).toContain('等级')
    expect(keys).toContain('力量')
    expect(keys).toContain('敏捷')
    expect(keys).toContain('精神')
    expect(keys).toContain('生命值')

    const level = panels[0]?.panelEntries.find((entry) => entry.key === '等级')
    expect(level?.value).toBe('3')
  })

  it('merges local panels into step1 response', () => {
    const local = parseAttributePanelsFromText(SAMPLE)
    const merged = mergeLocalPanelsIntoStep1Response(
      {
        mentions: [],
        chapterExtractions: [
          {
            inferredName: '杨凌',
            mentionCount: 2,
            fields: {
              身份: { value: '矿工', excerpt: '一名矿工', confidence: 'high' }
            }
          }
        ]
      },
      local
    )

    const yang = merged.chapterExtractions.find((item) => item.inferredName === '杨凌')
    expect(yang?.panelEntries?.some((entry) => entry.key === '职业' && entry.value === '矿工')).toBe(
      true
    )
    expect(yang?.fields.身份?.value).toBe('矿工')
  })
})
