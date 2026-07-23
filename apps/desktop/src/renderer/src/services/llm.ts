import { z } from 'zod'
import {
  extractJsonContent,
  LlmError,
  mapLayoutSchema,
  type LlmChatMessage,
  type LlmCompleteInput
} from '@novel-assistant/core'

function formatZodError(error: z.ZodError): string {
  const issue = error.issues[0]
  if (!issue) return 'JSON 结构与预期不符'
  return `JSON 校验失败：${issue.path.join('.') || '根节点'} ${issue.message}`
}

function formatParseError(error: unknown): string {
  if (error instanceof z.ZodError) return formatZodError(error)
  if (error instanceof SyntaxError) return `JSON 解析失败：${error.message}`
  if (error instanceof Error) return error.message
  return 'JSON 解析失败'
}

function isRetryableParseError(error: unknown): boolean {
  if (error instanceof z.ZodError) return true
  if (error instanceof SyntaxError) return true
  return error instanceof LlmError && error.code === 'parse'
}

export async function complete(messages: LlmChatMessage[], input?: Partial<LlmCompleteInput>): Promise<string> {
  const result = await window.novelApi.llm.complete({
    messages,
    profileId: input?.profileId,
    responseFormat: input?.responseFormat,
    temperature: input?.temperature,
    timeoutMs: input?.timeoutMs,
    maxTokens: input?.maxTokens,
    thinkingMode: input?.thinkingMode ?? 'disabled',
    requestId: input?.requestId
  })
  if (!result.success || !result.data) {
    throw new LlmError(result.error ?? 'LLM 请求失败', 'unknown')
  }
  return result.data.content
}

export async function completeWithDebug(
  messages: LlmChatMessage[],
  input?: Partial<LlmCompleteInput>
): Promise<{ content: string; debug?: NonNullable<Awaited<ReturnType<typeof window.novelApi.llm.complete>>['data']>['debug'] }> {
  const result = await window.novelApi.llm.complete({
    messages,
    profileId: input?.profileId,
    responseFormat: input?.responseFormat,
    temperature: input?.temperature,
    timeoutMs: input?.timeoutMs,
    maxTokens: input?.maxTokens,
    thinkingMode: input?.thinkingMode ?? 'disabled',
    requestId: input?.requestId
  })
  if (!result.success || !result.data) {
    throw new LlmError(result.error ?? 'LLM 请求失败', 'unknown')
  }
  return { content: result.data.content, debug: result.data.debug }
}

export async function abortLlmRequest(requestId: string): Promise<void> {
  await window.novelApi.llm.abort(requestId)
}

export async function getActiveLlmProfileSummary(): Promise<{
  model: string
  provider: string
} | null> {
  const result = await window.novelApi.settings.getLlmProfiles()
  if (!result.success || !result.data) return null

  const { profiles, activeProfileId } = result.data
  const active =
    profiles.find((profile) => profile.id === activeProfileId) ??
    profiles.find((profile) => profile.hasApiKey || profile.provider === 'ollama') ??
    profiles[0]
  if (!active) return null
  return { model: active.model, provider: active.provider }
}

export function isSlowLlmModel(model: string): boolean {
  const normalized = model.toLowerCase()
  return /reasoner|r1|pro|o1|o3|think|plus/.test(normalized) && !/flash|haiku|mini|lite|fast/.test(normalized)
}

export async function completeJson<T>(
  messages: LlmChatMessage[],
  schema: z.ZodType<T>,
  input?: Partial<LlmCompleteInput> & { onRawContent?: (content: string) => void }
): Promise<T> {
  let lastError: unknown
  let conversation = [...messages]

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await complete(conversation, {
        ...input,
        responseFormat: 'json',
        thinkingMode: input?.thinkingMode ?? 'disabled'
      })
      input?.onRawContent?.(content)
      const parsed = extractJsonContent(content)
      return schema.parse(parsed)
    } catch (error) {
      lastError = error
      if (!isRetryableParseError(error) || attempt === 1) {
        if (error instanceof z.ZodError) {
          throw new LlmError(formatZodError(error), 'parse')
        }
        throw error
      }

      conversation = [
        ...conversation,
        {
          role: 'user',
          content: `上一次输出不是合法 JSON（${formatParseError(error)}）。请只返回修复后的纯 JSON 对象，不要 markdown 代码块、不要解释文字。`
        }
      ]
    }
  }

  throw lastError instanceof Error ? lastError : new LlmError('LLM JSON 解析失败', 'parse')
}

export async function testConnection(profileId?: string): Promise<string> {
  const result = await window.novelApi.llm.testConnection(profileId ? { profileId } : undefined)
  if (!result.success || !result.data) {
    throw new LlmError(result.error ?? '连接测试失败', 'unknown')
  }
  return result.data.message
}

export async function hasActiveApiKey(): Promise<boolean> {
  const result = await window.novelApi.settings.getLlmProfiles()
  if (!result.success || !result.data) return false

  const { profiles, activeProfileId } = result.data
  if (profiles.length === 0) return false

  const active =
    profiles.find((profile) => profile.id === activeProfileId) ??
    profiles.find((profile) => profile.hasApiKey || profile.provider === 'ollama') ??
    profiles[0]

  return Boolean(active?.hasApiKey || active?.provider === 'ollama')
}
