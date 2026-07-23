import {
  executeStep1Pipeline,
  hashText,
  isStep1Blocked,
  step1LlmResponseSchema,
  buildPreviewFromStep1,
  type Character,
  type CharacterRegistryEntry,
  type RecognitionDebugSink,
  type RecognitionPreview
} from '@novel-assistant/core'
import { completeJson } from '@/services/llm'

export interface RunStep1Input {
  chapterId: string
  projectId: string
  rawText: string
  isLatestChapter: boolean
  characters: CharacterRegistryEntry[]
  fullCharacters?: Character[]
  debug?: RecognitionDebugSink
}

export async function runStep1(input: RunStep1Input): Promise<RecognitionPreview> {
  const textHash = await hashText(input.rawText)
  const step1 = await executeStep1Pipeline({
    chapterId: input.chapterId,
    rawText: input.rawText,
    characters: input.characters,
    debug: input.debug,
    completeJson: (messages) =>
      completeJson(messages, step1LlmResponseSchema, {
        onRawContent: (content) => {
          input.debug?.({
            stage: 'step1-llm-raw',
            label: 'Step1 LLM 原始输出',
            payload: content
          })
        }
      })
  })

  const step1Preview = buildPreviewFromStep1(step1, input.characters, input.fullCharacters ?? [])
  input.debug?.({
    stage: 'step1-preview',
    label: 'Step1 预览卡片',
    payload: {
      characterPreviewMeta: step1Preview.characterPreviewMeta,
      previewRowsByCharacter: step1Preview.previewRowsByCharacter,
      protagonistPreviewKey: step1Preview.protagonistPreviewKey
    }
  })

  return {
    chapterId: input.chapterId,
    textHash,
    step1,
    previewRowsByCharacter: step1Preview.previewRowsByCharacter,
    characterPreviewMeta: step1Preview.characterPreviewMeta,
    protagonistPreviewKey: step1Preview.protagonistPreviewKey,
    isLatestChapter: input.isLatestChapter,
    generatedAt: new Date().toISOString(),
    blocked: isStep1Blocked(step1)
  }
}

export function toCharacterRegistry(
  characters: Array<{ id: string; name: string; aliases: string[] }>
): CharacterRegistryEntry[] {
  return characters.map((character) => ({
    id: character.id,
    name: character.name,
    aliases: character.aliases
  }))
}
