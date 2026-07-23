import type { MapNode, MapWorld } from '../models/map'
import type { MapDebugSink } from '../models/map-debug'
import type { LlmChatMessage } from '../llm/types'
import { extractHtmlContent } from '../utils/html'
import { buildMapCodegenMessages } from './prompts'
import { injectMapBridge, sanitizeMapHtml } from './sanitize-html'
import {
  buildMapHtmlRetryMessage,
  assertHasRenderableRegions,
  isTruncatedMapHtml,
  repairTruncatedMapHtml
} from './validate-html'

export interface GenerateMapCodeInput {
  world: MapWorld
  nodes: MapNode[]
  extraPrompt?: string
  complete: (messages: LlmChatMessage[]) => Promise<string>
  onDebug?: MapDebugSink
}

export interface GenerateMapCodeResult {
  html: string
  sanitizedHtml: string
  renderHtml: string
}

const MAP_VALIDATION_ERROR_MARKERS = [
  'HTML 为空',
  '输出必须是完整 HTML 或包含 SVG',
  '禁止外链脚本',
  '禁止使用 fetch',
  '禁止使用 XMLHttpRequest',
  '禁止使用 eval',
  '禁止 javascript: 协议',
  '禁止嵌套 iframe',
  '禁止 object 标签',
  '禁止 embed 标签',
  '禁止外链样式表',
  '禁止外链图片',
  '地图 HTML 未通过安全校验',
  'HTML 输出不完整',
  '地图缺少可渲染区域'
]

function truncateDebugText(text: string, max = 4000): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}\n... [已截断，共 ${text.length} 字符]`
}

export function isMapValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return MAP_VALIDATION_ERROR_MARKERS.some((marker) => error.message.includes(marker))
}

function assertCompleteMapHtml(html: string): void {
  if (isTruncatedMapHtml(html)) {
    throw new Error('HTML 输出不完整（可能被 token 截断），缺少闭合标签或未完成的 data-place-id')
  }
}

export function prepareMapCodeFromLlm(raw: string, onDebug?: MapDebugSink): GenerateMapCodeResult {
  let html = extractHtmlContent(raw)
  onDebug?.({
    stage: 'map-extract-html',
    label: '提取 HTML',
    payload: {
      rawLength: raw.length,
      extractedLength: html.length,
      truncated: isTruncatedMapHtml(html),
      preview: truncateDebugText(html, 2000)
    }
  })

  if (isTruncatedMapHtml(html)) {
    const repaired = repairTruncatedMapHtml(html)
    onDebug?.({
      stage: 'map-extract-html',
      label: '检测到截断 HTML，已尝试自动补全标签',
      payload: {
        repairedLength: repaired.length,
        stillTruncated: isTruncatedMapHtml(repaired)
      }
    })
    if (!isTruncatedMapHtml(repaired)) {
      html = repaired
    } else {
      assertCompleteMapHtml(html)
    }
  }

  assertHasRenderableRegions(html)

  const sanitized = sanitizeMapHtml(html)
  onDebug?.({
    stage: 'map-sanitize',
    label: sanitized.ok ? '安全校验通过' : '安全校验失败',
    payload: {
      ok: sanitized.ok,
      error: sanitized.error ?? null,
      htmlLength: sanitized.html.length
    }
  })

  if (!sanitized.ok) {
    throw new Error(sanitized.error ?? '地图 HTML 未通过安全校验')
  }

  return {
    html,
    sanitizedHtml: sanitized.html,
    renderHtml: injectMapBridge(sanitized.html)
  }
}

async function generateFromHtml(input: GenerateMapCodeInput): Promise<GenerateMapCodeResult> {
  const messages = buildMapCodegenMessages({
    world: input.world,
    nodes: input.nodes,
    extraPrompt: input.extraPrompt
  })

  let conversation = [...messages]
  let lastError: Error | null = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    input.onDebug?.({
      stage: 'map-llm-request',
      label: `请求 LLM 生成 HTML 地图（第 ${attempt + 1} 次）`,
      payload: {
        attempt: attempt + 1,
        conversationLength: conversation.length,
        mode: 'html-llm'
      }
    })

    let raw = ''
    try {
      raw = await input.complete(conversation)
      input.onDebug?.({
        stage: 'map-llm-response',
        label: `LLM HTML 原始输出（第 ${attempt + 1} 次）`,
        payload: {
          attempt: attempt + 1,
          rawLength: raw.length,
          preview: truncateDebugText(raw)
        }
      })

      const result = prepareMapCodeFromLlm(raw, input.onDebug)
      input.onDebug?.({
        stage: 'map-codegen-success',
        label: '地图代码生成成功',
        payload: {
          attempt: attempt + 1,
          mode: 'html-llm',
          sanitizedLength: result.sanitizedHtml.length,
          renderLength: result.renderHtml.length
        }
      })
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      input.onDebug?.({
        stage: attempt === 2 ? 'map-codegen-error' : 'map-codegen-retry',
        label: attempt === 2 ? 'HTML 地图生成失败' : `第 ${attempt + 1} 次 HTML 失败，准备重试`,
        payload: {
          attempt: attempt + 1,
          error: message,
          rawLength: raw.length,
          rawPreview: raw ? truncateDebugText(raw, 1500) : null
        }
      })

      if (!(error instanceof Error) || !isMapValidationError(error) || attempt === 2) {
        throw error
      }
      lastError = error
      conversation = [
        ...conversation,
        ...(raw ? [{ role: 'assistant' as const, content: raw }] : []),
        { role: 'user', content: buildMapHtmlRetryMessage(error) }
      ]
    }
  }

  throw lastError ?? new Error('地图 HTML 生成失败')
}

export async function generateMapCode(input: GenerateMapCodeInput): Promise<GenerateMapCodeResult> {
  input.onDebug?.({
    stage: 'map-codegen-start',
    label: '开始生成地图',
    payload: {
      worldId: input.world.id,
      worldName: input.world.name,
      nodeCount: input.nodes.length,
      descriptionLength: input.world.description?.length ?? 0,
      stylePreset: input.world.stylePreset ?? null,
      mode: 'html-llm'
    }
  })

  return generateFromHtml(input)
}

export { buildMapCodegenMessages, buildMapLayoutMessages, buildMapRegionExtractMessages } from './prompts'
