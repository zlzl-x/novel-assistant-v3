import {
  canRunStep2,
  characterExtractionLlmSchema,
  executeStep2Pipeline,
  mergeStep2IntoPreview,
  type RecognitionDebugSink,
  type RecognitionPreview
} from '@novel-assistant/core'
import type { Character } from '@novel-assistant/core'
import { completeJson } from '@/services/llm'
import { toCharacterRegistry } from '@/services/recognition/runStep1'

export interface RunStep2Input {
  preview: RecognitionPreview
  characters: Character[]
  protagonistName?: string | null
  onProgress?: (current: number, total: number, characterName: string) => void
  debug?: RecognitionDebugSink
}

export async function runStep2(input: RunStep2Input): Promise<{
  preview: RecognitionPreview
  failures: Array<{ characterId: string; characterName: string; error: string }>
}> {
  const registry = toCharacterRegistry(input.characters)

  if (!canRunStep2(input.preview, registry)) {
    throw new Error('当前无法执行 Step 2：请先解决同名歧义或确保有已匹配角色')
  }

  const result = await executeStep2Pipeline({
    chapterId: input.preview.chapterId,
    step1: input.preview.step1,
    characters: input.characters,
    registry,
    protagonistName: input.protagonistName,
    onProgress: input.onProgress,
    debug: input.debug,
    completeJson: (messages, context) =>
      completeJson(messages, characterExtractionLlmSchema, {
        onRawContent: (content) => {
          input.debug?.({
            stage: 'step2-llm-raw',
            label: 'Step2 LLM 原始输出',
            characterName: context?.characterName,
            payload: content
          })
        }
      })
  })

  return {
    preview: mergeStep2IntoPreview(input.preview, result),
    failures: result.failures
  }
}
