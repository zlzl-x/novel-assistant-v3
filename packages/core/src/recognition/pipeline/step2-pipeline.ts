import type { Character } from '../../models/character'
import type { Step1Result, Step2Result } from '../../models/recognition'
import type { RecognitionDebugSink } from '../../models/recognition-debug'
import type { CharacterExtraction } from '../../models/recognition-step2'
import type { PreviewRow } from '../../models/preview'
import type { LlmChatMessage } from '../../llm/types'
import {
  countMentionsForCharacter,
  getChapterExtractionForCharacter,
  getMatchedCharacterIds,
  type CharacterRegistryEntry
} from '../matchLocal'
import { buildStep2Messages } from '../prompts/step2'
import { buildPreviewRowsForAll, mergePreviewRowsByName } from '../preview/buildPreviewRows'
import { sanitizeCharacterExtraction } from '../sanitize/step2'
import type { CharacterExtractionLlmResponse } from '../schemas/step2'

export interface ExecuteStep2PipelineInput {
  chapterId: string
  step1: Step1Result
  characters: Character[]
  registry: CharacterRegistryEntry[]
  protagonistName?: string | null
  completeJson: (
    messages: LlmChatMessage[],
    context?: { characterName?: string }
  ) => Promise<CharacterExtractionLlmResponse>
  onProgress?: (current: number, total: number, characterName: string) => void
  concurrency?: number
  debug?: RecognitionDebugSink
}

export interface ExecuteStep2PipelineResult {
  step2: Step2Result
  previewRowsByCharacter: Record<string, PreviewRow[]>
  failures: Array<{ characterId: string; characterName: string; error: string }>
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
  delayMs = 0
): Promise<R[]> {
  if (items.length === 0) return []
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const current = nextIndex
      nextIndex += 1
      if (current > 0 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
      results[current] = await mapper(items[current]!, current)
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

export async function executeStep2Pipeline(
  input: ExecuteStep2PipelineInput
): Promise<ExecuteStep2PipelineResult> {
  const matchedIds = getMatchedCharacterIds(input.step1, input.registry)
  const characters = matchedIds
    .map((id) => input.characters.find((character) => character.id === id))
    .filter((character): character is Character => Boolean(character))

  const total = characters.length
  let completed = 0

  const failures: Array<{ characterId: string; characterName: string; error: string }> = []

  const extractions = (
    await mapWithConcurrency(
      characters,
      input.concurrency ?? 1,
      async (character) => {
        const registryEntry = input.registry.find((entry) => entry.id === character.id)
        if (!registryEntry) {
          const error = `未找到角色：${character.name}`
          failures.push({ characterId: character.id, characterName: character.name, error })
          input.debug?.({
            stage: 'step2-error',
            label: 'Step2 角色处理失败',
            characterName: character.name,
            payload: error
          })
          return null
        }

        try {
          const chapterExtraction = getChapterExtractionForCharacter(input.step1, registryEntry)
          const mentionCount = Math.max(
            countMentionsForCharacter(input.step1, registryEntry),
            chapterExtraction?.mentionCount ?? 1
          )

          const messages = buildStep2Messages({
            character,
            chapterExtraction,
            mentionCount,
            protagonistName: input.protagonistName
          })
          const llmResponse = await input.completeJson(messages, { characterName: character.name })
          input.debug?.({
            stage: 'step2-llm-parsed',
            label: 'Step2 LLM 结构化结果',
            characterName: character.name,
            payload: llmResponse
          })

          const sanitized = sanitizeCharacterExtraction(
            character,
            character.id,
            mentionCount,
            llmResponse
          )
          input.debug?.({
            stage: 'step2-sanitized',
            label: 'Step2 清洗后',
            characterName: character.name,
            payload: sanitized
          })

          completed += 1
          input.onProgress?.(completed, total, character.name)
          return sanitized
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Step2 处理失败'
          failures.push({ characterId: character.id, characterName: character.name, error: message })
          input.debug?.({
            stage: 'step2-error',
            label: 'Step2 角色处理失败',
            characterName: character.name,
            payload: message
          })
          return null
        }
      },
      input.concurrency === 1 ? 400 : 0
    )
  ).filter((extraction): extraction is CharacterExtraction => extraction !== null)

  const step2: Step2Result = {
    chapterId: input.chapterId,
    characters: extractions
  }

  return {
    step2,
    previewRowsByCharacter: buildPreviewRowsForAll(characters, extractions, { onlyChanged: false }),
    failures
  }
}

export function mergeStep2IntoPreview<
  T extends {
    step2?: Step2Result
    previewRowsByCharacter?: Record<string, PreviewRow[]>
    characterPreviewMeta?: Record<string, import('../../models/recognition').CharacterPreviewMeta>
  }
>(preview: T, result: ExecuteStep2PipelineResult): T {
  const mergedRows = { ...preview.previewRowsByCharacter }
  for (const [characterId, step2Rows] of Object.entries(result.previewRowsByCharacter)) {
    mergedRows[characterId] = mergePreviewRowsByName(
      preview.previewRowsByCharacter?.[characterId],
      step2Rows
    )
  }

  return {
    ...preview,
    step2: result.step2,
    step2Failures: result.failures,
    previewRowsByCharacter: mergedRows
  }
}
