import type { Step1Result } from '../../models/recognition'
import type { RecognitionDebugSink } from '../../models/recognition-debug'
import type { LlmChatMessage } from '../../llm/types'
import { applyLocalMatching } from '../matchLocal'
import type { CharacterRegistryEntry } from '../matchLocal'
import { normalizeText } from '../preprocess'
import { enrichStep1FromLocalText } from '../preprocess/enrichLocalText'
import { buildStep1Messages } from '../prompts/step1'
import { sanitizeStep1LlmResponse, attachChapterId } from '../sanitize/step1'
import type { Step1LlmResponse } from '../schemas/step1'

export interface ExecuteStep1PipelineInput {
  chapterId: string
  rawText: string
  characters: CharacterRegistryEntry[]
  completeJson: (messages: LlmChatMessage[]) => Promise<Step1LlmResponse>
  debug?: RecognitionDebugSink
}

export async function executeStep1Pipeline(input: ExecuteStep1PipelineInput): Promise<Step1Result> {
  const normalizedText = normalizeText(input.rawText)
  const messages = buildStep1Messages(normalizedText)
  const llmResponse = await input.completeJson(messages)
  input.debug?.({
    stage: 'step1-llm-parsed',
    label: 'Step1 LLM 输出',
    payload: llmResponse
  })

  const enriched = enrichStep1FromLocalText(normalizedText, llmResponse)
  input.debug?.({
    stage: 'step1-enriched',
    label: 'Step1 本地补抓合并后',
    payload: enriched
  })

  const sanitized = sanitizeStep1LlmResponse(enriched)
  const withChapter = attachChapterId(input.chapterId, sanitized)
  const matched = applyLocalMatching(normalizedText, withChapter, input.characters)
  input.debug?.({
    stage: 'step1-final',
    label: 'Step1 最终结果',
    payload: matched
  })

  return matched
}

export function isStep1Blocked(step1: Step1Result): boolean {
  return step1.ambiguousNames.length > 0
}
