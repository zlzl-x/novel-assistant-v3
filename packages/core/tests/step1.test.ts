import { describe, expect, it } from 'vitest'
import type { Step1Result } from '../src/models/recognition'
import type { CharacterRegistryEntry } from '../src/recognition/matchLocal'
import {
  applyLocalMatching,
  localNameScan,
  matchMentionsToRegistry,
  resolveCharacterIdForLabel
} from '../src/recognition/matchLocal'
import { assertStep1PayloadIsTextOnly } from '../src/recognition/prompts/step1'
import { executeStep1Pipeline } from '../src/recognition/pipeline/step1-pipeline'
import { normalizeText } from '../src/recognition/preprocess'
import { sanitizeStep1LlmResponse } from '../src/recognition/sanitize/step1'

const characters: CharacterRegistryEntry[] = [
  { id: 'char-zhang-1', name: '张三', aliases: ['三哥'] },
  { id: 'char-zhang-2', name: '张三', aliases: [] },
  { id: 'char-li', name: '李四', aliases: [] }
]

describe('sanitizeStep1LlmResponse', () => {
  it('falls back to value when excerpt is missing', () => {
    const sanitized = sanitizeStep1LlmResponse({
      mentions: [
        {
          surfaceForm: '张三',
          inferredName: '张三',
          mentionCount: 1,
          excerpts: ['张三点了点头'],
          isNickname: false
        }
      ],
      chapterExtractions: [
        {
          inferredName: '张三',
          mentionCount: 1,
          fields: {
            境界: { value: '金丹', excerpt: '如今已是金丹修士', confidence: 'high' },
            所在地: { value: '青云宗', excerpt: '', confidence: 'low' }
          }
        }
      ]
    })

    expect(sanitized.chapterExtractions[0]?.fields.所在地?.value).toBe('青云宗')
    expect(sanitized.chapterExtractions[0]?.fields.境界?.value).toBe('金丹')
  })
})

describe('matchMentionsToRegistry', () => {
  it('moves duplicate-name candidates into ambiguousNames', () => {
    const step1: Step1Result = {
      chapterId: 'ch-1',
      mentions: [
        {
          surfaceForm: '张三',
          inferredName: '张三',
          mentionCount: 1,
          excerpts: ['张三冷笑'],
          isNickname: false
        }
      ],
      chapterExtractions: [],
      unresolvedMentions: [],
      ambiguousNames: []
    }

    const matched = matchMentionsToRegistry(step1, characters)
    expect(matched.ambiguousNames).toHaveLength(1)
    expect(matched.ambiguousNames[0]?.candidateCharacterIds).toEqual([
      'char-zhang-1',
      'char-zhang-2'
    ])
  })
})

describe('localNameScan', () => {
  it('supplements mentions missing from LLM output', () => {
    const text = '李四在门外等候，张三点了点头。'
    const scanned = localNameScan(text, characters)
    expect(scanned.some((mention) => mention.inferredName === '李四')).toBe(true)

    const step1: Step1Result = {
      chapterId: 'ch-1',
      mentions: [
        {
          surfaceForm: '三哥',
          inferredName: '张三',
          mentionCount: 1,
          excerpts: ['三哥冷笑一声'],
          isNickname: true
        }
      ],
      chapterExtractions: [],
      unresolvedMentions: [],
      ambiguousNames: []
    }

    const merged = applyLocalMatching(text, step1, characters)
    expect(merged.mentions.some((mention) => mention.inferredName === '李四')).toBe(true)
  })
})

describe('executeStep1Pipeline', () => {
  it('sends text-only user payload and resolves nickname to one character when unique', async () => {
    const uniqueCharacters: CharacterRegistryEntry[] = [
      { id: 'char-zhang', name: '张三', aliases: ['三哥'] },
      { id: 'char-li', name: '李四', aliases: [] }
    ]
    const text = '三哥冷笑一声。张三点了点头，如今已是金丹修士。'
    let capturedPayload = ''

    const step1 = await executeStep1Pipeline({
      chapterId: 'ch-1',
      rawText: text,
      characters: uniqueCharacters,
      completeJson: async (messages) => {
        assertStep1PayloadIsTextOnly(messages)
        capturedPayload = messages.find((message) => message.role === 'user')?.content ?? ''
        expect(capturedPayload.includes('"aliases"')).toBe(false)
        return {
          mentions: [
            {
              surfaceForm: '三哥',
              inferredName: '张三',
              mentionCount: 1,
              excerpts: ['三哥冷笑一声'],
              isNickname: true
            },
            {
              surfaceForm: '张三',
              inferredName: '张三',
              mentionCount: 1,
              excerpts: ['张三点了点头'],
              isNickname: false
            }
          ],
          chapterExtractions: [
            {
              inferredName: '张三',
              mentionCount: 2,
              fields: {
                境界: {
                  value: '金丹',
                  excerpt: '如今已是金丹修士',
                  confidence: 'high'
                }
              }
            }
          ]
        }
      }
    })

    expect(capturedPayload).toContain(normalizeText(text))
    expect(step1.ambiguousNames).toHaveLength(0)
    expect(resolveCharacterIdForLabel('张三', uniqueCharacters)).toBe('char-zhang')
    expect(step1.unresolvedMentions).not.toContain('张三')
  })
})
