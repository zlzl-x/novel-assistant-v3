import { describe, expect, it } from 'vitest'
import type { Step1Result } from '../src/models/recognition'
import { buildPreviewFromStep1 } from '../src/recognition/preview/buildPreviewFromStep1'
import { collectGraphCommitData } from '../src/recognition/preview/collectGraphCommitData'
import { buildStep2UserPrompt } from '../src/recognition/prompts/step2'
import type { Character } from '../src/models/character'

const step1: Step1Result = {
  chapterId: 'ch-1',
  mentions: [],
  unresolvedMentions: [],
  ambiguousNames: [],
  chapterExtractions: [
    {
      inferredName: '张三',
      mentionCount: 3,
      fields: { 境界: { value: '金丹', excerpt: '突破', confidence: 'high' } },
      relations: [{ targetName: '李四', type: '同门', excerpt: '同门师兄' }]
    }
  ]
}

function createCharacter(overrides: Partial<Character> = {}): Character {
  const now = new Date().toISOString()
  return {
    id: overrides.id ?? 'char-1',
    projectId: 'proj-1',
    name: overrides.name ?? '张三',
    aliases: [],
    disambiguation: '',
    role: 'major',
    identity: { current: '外门弟子', history: [] },
    realm: { current: '筑基', history: [] },
    location: { current: '青云宗', history: [] },
    faction: { current: '青云宗', history: [] },
    summary: '',
    notes: '',
    status: '正常',
    panel: { entries: [{ key: '功法/技能', value: '基础剑诀', history: [] }] },
    relations: [{ targetCharacterId: 'char-2', type: '旧关系', strength: 2 }],
    mentionCount: 0,
    appearances: [],
    createdAt: now,
    updatedAt: now,
    ...overrides
  }
}

describe('collectGraphCommitData', () => {
  it('collects relations without preview rows', () => {
    const preview = buildPreviewFromStep1(step1, [
      { id: 'char-1', name: '张三', aliases: [] },
      { id: 'char-2', name: '李四', aliases: [] }
    ])
    expect(preview.previewRowsByCharacter['char-1']?.some((row) => row.name === '关系')).toBe(false)
    expect(preview.characterPreviewMeta['char-1']?.relationCount).toBe(1)

    const graph = collectGraphCommitData(step1, [
      { id: 'char-1', name: '张三', aliases: [] },
      { id: 'char-2', name: '李四', aliases: [] }
    ])
    expect(graph.relationsByCharacter['char-1']).toEqual([{ targetName: '李四', type: '同门' }])
  })

  it('merges step2 relations and converts protagonist relation to edge', () => {
    const graph = collectGraphCommitData(
      {
        ...step1,
        chapterExtractions: [
          {
            inferredName: '张三',
            mentionCount: 3,
            fields: {},
            protagonistRelation: { type: '师徒', proximity: 4, excerpt: '拜师' }
          }
        ]
      },
      [{ id: 'char-1', name: '张三', aliases: [] }],
      new Map(),
      {
        chapterId: 'ch-1',
        characters: [
          {
            characterId: 'char-1',
            mentionCount: 3,
            fields: {},
            relations: [{ targetName: '王五', type: '同门', excerpt: '同门' }]
          }
        ]
      },
      '主角'
    )

    expect(graph.relationsByCharacter['char-1']).toEqual(
      expect.arrayContaining([
        { targetName: '主角', type: '师徒' },
        { targetName: '王五', type: '同门' }
      ])
    )
    expect(graph.protagonistRelationsByCharacter).toEqual({})
  })
})

describe('buildStep2UserPrompt', () => {
  it('includes full snapshot and integrated output instructions', () => {
    const prompt = buildStep2UserPrompt({
      character: createCharacter(),
      chapterExtraction: {
        inferredName: '张三',
        mentionCount: 2,
        fields: { 境界: { value: '金丹', excerpt: '突破', confidence: 'high' } }
      },
      mentionCount: 2,
      protagonistName: '主角'
    })

    expect(prompt).toContain('existingRelations')
    expect(prompt).toContain('整合后的完整资料')
    expect(prompt).toContain('主角姓名：主角')
    expect(prompt).not.toContain('protagonistRelation')
  })
})