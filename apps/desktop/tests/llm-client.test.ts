import { afterEach, describe, expect, it, vi } from 'vitest'
import { LlmError } from '@novel-assistant/core'
import { chatCompletion } from '../src/main/services/llm-client'

const organicHtml = `<!DOCTYPE html><html><body><svg><g data-place-id="a"><path d="M1,1 L10,2 L9,9 Z"/></g></svg></body></html>`

describe('chatCompletion', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('throws auth error when API key is missing', async () => {
    await expect(
      chatCompletion(
        {
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          temperature: 0.2,
          apiKey: ''
        },
        { messages: [{ role: 'user', content: 'hi' }] }
      )
    ).rejects.toMatchObject({ code: 'auth' } satisfies Partial<LlmError>)
  })

  it('classifies 401 responses', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid api key'
      })
    )

    await expect(
      chatCompletion(
        {
          baseUrl: 'https://api.openai.com/v1',
          model: 'gpt-4o-mini',
          temperature: 0.2,
          apiKey: 'sk-test'
        },
        { messages: [{ role: 'user', content: 'hi' }] }
      )
    ).rejects.toMatchObject({ code: 'auth', status: 401 })
  })

  it('returns assistant content on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: '{"ok":true}' } }]
        })
      })
    )

    const result = await chatCompletion(
      {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o-mini',
        temperature: 0.2,
        apiKey: 'sk-test'
      },
      { messages: [{ role: 'user', content: 'hi' }], responseFormat: 'json' }
    )

    expect(result.content).toBe('{"ok":true}')
    expect(result.debug?.contentLength).toBe(11)
  })

  it('sends disabled thinking mode for deepseek by default', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'ok' } }]
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    await chatCompletion(
      {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        temperature: 0.2,
        apiKey: 'sk-test',
        provider: 'deepseek'
      },
      { messages: [{ role: 'user', content: 'hi' }] }
    )

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))
    expect(body.thinking).toEqual({ type: 'disabled' })
  })

  it('recovers html from reasoning_content when content is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                reasoning_content: `思考中...\n\`\`\`html\n${organicHtml}\n\`\`\``,
                content: ''
              }
            }
          ]
        })
      })
    )

    const result = await chatCompletion(
      {
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-v4-flash',
        temperature: 0.2,
        apiKey: 'sk-test',
        provider: 'deepseek'
      },
      { messages: [{ role: 'user', content: 'hi' }], thinkingMode: 'enabled' }
    )

    expect(result.content).toContain('<svg')
    expect(result.debug?.recoveredFromReasoning).toBe(true)
  })

  it('throws empty error when reasoning has no recoverable answer', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { reasoning_content: 'only thinking...', content: '' } }]
        })
      })
    )

    await expect(
      chatCompletion(
        {
          baseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-v4-flash',
          temperature: 0.2,
          apiKey: 'sk-test',
          provider: 'deepseek'
        },
        { messages: [{ role: 'user', content: 'hi' }], thinkingMode: 'enabled' }
      )
    ).rejects.toMatchObject({ code: 'empty' })
  })
})
