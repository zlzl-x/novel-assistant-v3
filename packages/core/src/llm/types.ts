export type LlmProviderId =
  | 'openai'
  | 'deepseek'
  | 'moonshot'
  | 'zhipu'
  | 'qwen'
  | 'doubao'
  | 'baichuan'
  | 'minimax'
  | 'yi'
  | 'siliconflow'
  | 'openrouter'
  | 'groq'
  | 'gemini'
  | 'ollama'
  | 'azure'
  | 'custom'

export type LlmChatRole = 'system' | 'user' | 'assistant'

export interface LlmChatMessage {
  role: LlmChatRole
  content: string
}

export type LlmErrorCode = 'auth' | 'rate_limit' | 'network' | 'timeout' | 'parse' | 'empty' | 'unknown'

export class LlmError extends Error {
  constructor(
    message: string,
    readonly code: LlmErrorCode,
    readonly status?: number
  ) {
    super(message)
    this.name = 'LlmError'
  }
}

export type LlmThinkingMode = 'enabled' | 'disabled'

export interface LlmCompleteInput {
  profileId?: string
  messages: LlmChatMessage[]
  responseFormat?: 'json'
  temperature?: number
  timeoutMs?: number
  maxTokens?: number
  /** DeepSeek V4: defaults to disabled for non-reasoning tasks */
  thinkingMode?: LlmThinkingMode
  /** Used to cancel in-flight requests from renderer */
  requestId?: string
}

export interface LlmCompleteResult {
  content: string
  debug?: {
    elapsedMs: number
    status: number
    contentLength: number
    hasReasoningContent: boolean
    recoveredFromReasoning?: boolean
    thinkingMode: LlmThinkingMode | null
  }
}

export interface LlmAbortInput {
  requestId: string
}

export interface LlmTestConnectionInput {
  profileId?: string
}

export interface LlmTestConnectionResult {
  message: string
}
