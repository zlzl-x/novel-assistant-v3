import { generateMapCode, LlmError, type MapDebugSink } from '@novel-assistant/core'
import type { MapNode, MapWorld } from '@novel-assistant/core'
import {
  abortLlmRequest,
  completeWithDebug,
  getActiveLlmProfileSummary,
  hasActiveApiKey,
  isSlowLlmModel
} from '@/services/llm'

const MAP_CODEGEN_TIMEOUT_MS = 300_000
const MAP_CODEGEN_MAX_TOKENS_HTML = 12_288
const MAP_THINKING_MODE = 'disabled' as const
const HEARTBEAT_INTERVAL_MS = 10_000

export interface RunMapCodegenOptions {
  world: MapWorld
  nodes: MapNode[]
  extraPrompt?: string
  onDebug?: MapDebugSink
  requestId?: string
  signal?: AbortSignal
}

export interface RunMapCodegenResult {
  html: string
}

export async function runMapCodegen(input: RunMapCodegenOptions): Promise<RunMapCodegenResult> {
  const ready = await hasActiveApiKey()
  if (!ready) {
    throw new Error('请先在应用设置中配置 LLM API Key')
  }

  const profile = await getActiveLlmProfileSummary()
  const slowModel = profile ? isSlowLlmModel(profile.model) : false
  const requestId = input.requestId ?? `map-${Date.now()}`

  if (input.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError')
  }

  const onAbort = (): void => {
    void abortLlmRequest(requestId)
  }
  input.signal?.addEventListener('abort', onAbort, { once: true })

  input.onDebug?.({
    stage: 'map-codegen-start',
    label: '准备调用 LLM 绘制地图',
    payload: {
      worldId: input.world.id,
      nodeCount: input.nodes.length,
      descriptionLength: input.world.description?.trim().length ?? 0,
      timeoutMs: MAP_CODEGEN_TIMEOUT_MS,
      maxTokens: MAP_CODEGEN_MAX_TOKENS_HTML,
      thinkingMode: MAP_THINKING_MODE,
      model: profile?.model ?? null,
      provider: profile?.provider ?? null,
      requestId,
      mode: 'html-llm',
      slowModelWarning: slowModel
        ? '当前模型偏慢，地图生成建议在设置中切换到 Flash/快速模型（如 deepseek-v4-flash）'
        : null
    }
  })

  if (slowModel) {
    throw new Error('当前 LLM 模型较慢，地图生成可能长时间无响应。请在设置页切换到 Flash/快速模型（如 deepseek-v4-flash）后重试')
  }

  try {
    const result = await generateMapCode({
      world: input.world,
      nodes: input.nodes,
      extraPrompt: input.extraPrompt,
      onDebug: input.onDebug,
      complete: async (messages) => {
        const startedAt = Date.now()
        input.onDebug?.({
          stage: 'map-llm-request',
          label: '正在等待 LLM 绘制地图…',
          payload: {
            messageCount: messages.length,
            model: profile?.model ?? null,
            timeoutMs: MAP_CODEGEN_TIMEOUT_MS,
            maxTokens: MAP_CODEGEN_MAX_TOKENS_HTML,
            thinkingMode: MAP_THINKING_MODE,
            requestId,
            startedAt: new Date(startedAt).toISOString()
          }
        })

        const heartbeat = window.setInterval(() => {
          const elapsedMs = Date.now() - startedAt
          input.onDebug?.({
            stage: 'map-llm-raw',
            label: `仍在等待 LLM 响应（${Math.round(elapsedMs / 1000)}s）`,
            payload: {
              elapsedMs,
              timeoutMs: MAP_CODEGEN_TIMEOUT_MS,
              model: profile?.model ?? null,
              thinkingMode: MAP_THINKING_MODE
            }
          })
        }, HEARTBEAT_INTERVAL_MS)

        try {
          const { content, debug } = await completeWithDebug(messages, {
            timeoutMs: MAP_CODEGEN_TIMEOUT_MS,
            maxTokens: MAP_CODEGEN_MAX_TOKENS_HTML,
            temperature: 0.3,
            thinkingMode: MAP_THINKING_MODE,
            requestId
          })
          input.onDebug?.({
            stage: 'map-llm-response',
            label: 'LLM 响应已返回',
            payload: {
              elapsedMs: Date.now() - startedAt,
              contentLength: content.length,
              httpDebug: debug ?? null
            }
          })
          return content
        } catch (error) {
          input.onDebug?.({
            stage: 'map-codegen-error',
            label: 'LLM 请求失败',
            payload: {
              elapsedMs: Date.now() - startedAt,
              error: error instanceof Error ? error.message : String(error),
              llmCode: error instanceof LlmError ? error.code : 'unknown',
              model: profile?.model ?? null
            }
          })
          throw error
        } finally {
          window.clearInterval(heartbeat)
        }
      }
    })

    if (!result.sanitizedHtml.trim()) {
      throw new Error('LLM 返回的地图 HTML 为空')
    }

    return { html: result.sanitizedHtml }
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }
    input.onDebug?.({
      stage: 'map-codegen-error',
      label: '地图代码生成失败',
      payload: {
        error: error.message,
        llmCode: error instanceof LlmError ? error.code : undefined,
        model: profile?.model ?? null
      }
    })
    throw error
  } finally {
    input.signal?.removeEventListener('abort', onAbort)
  }
}
