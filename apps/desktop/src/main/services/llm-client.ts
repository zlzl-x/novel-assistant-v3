import {
  extractHtmlContent,
  extractJsonContent,
  LlmError,
  type LlmChatMessage,
  type LlmCompleteInput,
  type LlmCompleteResult,
  type LlmTestConnectionResult,
  type LlmThinkingMode
} from '@novel-assistant/core'
import type { LlmProfileStore } from './llm-profile-store'

export interface LlmClientProfile {
  baseUrl: string
  model: string
  temperature: number
  apiKey: string
  provider?: string
}

export interface ChatCompletionOptions {
  messages: LlmChatMessage[]
  responseFormat?: 'json'
  temperature?: number
  timeoutMs?: number
  maxTokens?: number
  thinkingMode?: LlmThinkingMode
  signal?: AbortSignal
}

const DEFAULT_TIMEOUT_MS = 120_000
const activeRequests = new Map<string, AbortController>()

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/$/, '')
}

function resolveThinkingMode(
  provider: string | undefined,
  thinkingMode?: LlmThinkingMode
): LlmThinkingMode | null {
  if (provider !== 'deepseek') return null
  return thinkingMode ?? 'disabled'
}

function classifyHttpError(status: number, detail: string): LlmError {
  if (status === 401 || status === 403) {
    return new LlmError('API Key 无效或无权访问，请检查设置页配置', 'auth', status)
  }
  if (status === 429) {
    return new LlmError('请求过于频繁，请稍后重试', 'rate_limit', status)
  }
  return new LlmError(detail || `API 请求失败 (${status})`, 'unknown', status)
}

function classifyFetchError(error: unknown): LlmError {
  if (error instanceof LlmError) return error
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new LlmError('请求已取消或超时，请检查网络或换用更快模型', 'timeout')
  }
  if (error instanceof TypeError) {
    return new LlmError('网络连接失败，请检查 Base URL 与网络', 'network')
  }
  return new LlmError(error instanceof Error ? error.message : '网络请求失败', 'network')
}

export function abortLlmRequest(requestId: string): boolean {
  const controller = activeRequests.get(requestId)
  if (!controller) return false
  controller.abort()
  activeRequests.delete(requestId)
  return true
}

function tryRecoverContentFromReasoning(reasoningContent: string): string | null {
  const html = extractHtmlContent(reasoningContent)
  if (/<(?:html|svg)\b/i.test(html)) {
    return html
  }

  try {
    const parsed = extractJsonContent(reasoningContent)
    if (parsed && typeof parsed === 'object') {
      return JSON.stringify(parsed)
    }
  } catch {
    // fall through
  }

  const tail = reasoningContent.slice(Math.max(0, reasoningContent.length - 12_000))
  const htmlTail = extractHtmlContent(tail)
  if (/<(?:html|svg)\b/i.test(htmlTail)) {
    return htmlTail
  }

  try {
    const parsedTail = extractJsonContent(tail)
    if (parsedTail && typeof parsedTail === 'object') {
      return JSON.stringify(parsedTail)
    }
  } catch {
    return null
  }

  return null
}

function resolveMessageContent(
  content: string,
  reasoningContent: string
): { content: string; recoveredFromReasoning: boolean } {
  if (content) {
    return { content, recoveredFromReasoning: false }
  }

  if (reasoningContent) {
    const recovered = tryRecoverContentFromReasoning(reasoningContent)
    if (recovered) {
      return { content: recovered, recoveredFromReasoning: true }
    }
    throw new LlmError(
      '思考模式已返回推理内容，但最终答案为空或 token 不足。请稍后重试，或适当缩短地图说明',
      'empty'
    )
  }

  throw new LlmError('API 返回空内容', 'empty')
}

export async function chatCompletion(
  profile: LlmClientProfile,
  options: ChatCompletionOptions
): Promise<LlmCompleteResult> {
  const isOllama = profile.provider === 'ollama'
  if (!profile.apiKey.trim() && !isOllama) {
    throw new LlmError('请先在设置页配置 API Key', 'auth')
  }

  const endpoint = `${normalizeBaseUrl(profile.baseUrl)}/chat/completions`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)
  const thinkingMode = resolveThinkingMode(profile.provider, options.thinkingMode)

  const onExternalAbort = (): void => controller.abort()
  options.signal?.addEventListener('abort', onExternalAbort, { once: true })

  const startedAt = Date.now()

  try {
    const body: Record<string, unknown> = {
      model: profile.model,
      temperature: options.temperature ?? profile.temperature,
      messages: options.messages
    }
    if (options.maxTokens) {
      body.max_tokens = options.maxTokens
    }
    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' }
    }
    if (thinkingMode) {
      body.thinking = { type: thinkingMode }
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(profile.apiKey.trim() ? { Authorization: `Bearer ${profile.apiKey}` } : {})
      },
      signal: controller.signal,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 200)
      throw classifyHttpError(response.status, detail)
    }

    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string; reasoning_content?: string }
      }>
    }
    const message = data.choices?.[0]?.message
    const reasoningContent = message?.reasoning_content?.trim() ?? ''
    const rawContent = message?.content?.trim() ?? ''
    const resolved = resolveMessageContent(rawContent, reasoningContent)

    return {
      content: resolved.content,
      debug: {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
        contentLength: resolved.content.length,
        hasReasoningContent: Boolean(reasoningContent),
        recoveredFromReasoning: resolved.recoveredFromReasoning,
        thinkingMode
      }
    }
  } catch (error) {
    throw classifyFetchError(error)
  } finally {
    clearTimeout(timeout)
    options.signal?.removeEventListener('abort', onExternalAbort)
  }
}

export class LlmService {
  constructor(private readonly profileStore: LlmProfileStore) {}

  private resolveProfile(profileId?: string): LlmClientProfile {
    const state = this.profileStore.getProfiles()
    const id =
      profileId ??
      state.activeProfileId ??
      state.profiles.find((item) => item.hasApiKey)?.id ??
      state.profiles[0]?.id
    if (!id) {
      throw new LlmError('请先在设置页创建 LLM Profile', 'auth')
    }

    const profile = state.profiles.find((item) => item.id === id)
    if (!profile) {
      throw new LlmError('未找到对应的 LLM Profile', 'unknown')
    }

    const apiKey = this.profileStore.getDecryptedApiKey(id)
    if (profile.provider !== 'ollama') {
      if (!profile.hasApiKey) {
        throw new LlmError('请先在设置页配置 API Key', 'auth')
      }
      if (!apiKey) {
        throw new LlmError('无法解密 API Key，请重新保存', 'auth')
      }
    }

    return {
      baseUrl: profile.baseUrl,
      model: profile.model,
      temperature: profile.temperature,
      apiKey: apiKey ?? '',
      provider: profile.provider
    }
  }

  async complete(input: LlmCompleteInput): Promise<LlmCompleteResult> {
    const profile = this.resolveProfile(input.profileId)
    const controller = new AbortController()

    if (input.requestId) {
      activeRequests.set(input.requestId, controller)
    }

    try {
      return await chatCompletion(profile, {
        messages: input.messages,
        responseFormat: input.responseFormat,
        temperature: input.temperature,
        timeoutMs: input.timeoutMs,
        maxTokens: input.maxTokens,
        thinkingMode: input.thinkingMode,
        signal: controller.signal
      })
    } finally {
      if (input.requestId) {
        activeRequests.delete(input.requestId)
      }
    }
  }

  abort(requestId: string): boolean {
    return abortLlmRequest(requestId)
  }

  async testConnection(profileId?: string): Promise<LlmTestConnectionResult> {
    const profile = this.resolveProfile(profileId)
    const result = await chatCompletion(profile, {
      messages: [
        { role: 'system', content: '只回复 JSON：{"ok":true,"message":"连接成功"}' },
        { role: 'user', content: 'ping' }
      ],
      responseFormat: 'json',
      temperature: 0,
      timeoutMs: 30_000,
      thinkingMode: 'disabled'
    })

    try {
      const parsed = extractJsonContent(result.content) as { ok?: boolean; message?: string }
      if (!parsed.ok) {
        throw new LlmError(parsed.message ?? '连接测试未通过', 'parse')
      }
      return { message: parsed.message ?? '连接成功' }
    } catch (error) {
      if (error instanceof LlmError) throw error
      throw new LlmError('连接测试返回的内容不是合法 JSON', 'parse')
    }
  }
}
