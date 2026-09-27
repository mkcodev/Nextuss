import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'

const createMock = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: createMock }
    constructor(_opts: unknown) {}
    static AuthenticationError = class extends Error {}
    static RateLimitError = class extends Error {}
    static APIConnectionError = class extends Error {}
    static APIError = class extends Error {}
  }
  return { default: MockAnthropic }
})

const { callTool } = await import('./client')

const tool: Anthropic.Tool = {
  name: 'test_tool',
  description: 'tool de prueba',
  input_schema: { type: 'object', properties: {} },
}

beforeEach(() => {
  createMock.mockReset()
  createMock.mockResolvedValue({
    stop_reason: 'tool_use',
    content: [{ type: 'tool_use', input: { ok: true } }],
  })
})

describe('callTool — parámetros por modelo', () => {
  it('envía output_config.effort para Sonnet 5', async () => {
    await callTool({ apiKey: 'k', model: 'claude-sonnet-5', system: 's', user: 'u', tool, validate: (raw) => raw })
    const params = createMock.mock.calls[0][0]
    expect(params.model).toBe('claude-sonnet-5')
    expect(params.output_config).toEqual({ effort: 'medium' })
  })

  it('envía output_config.effort para Opus 5', async () => {
    await callTool({ apiKey: 'k', model: 'claude-opus-5', system: 's', user: 'u', tool, effort: 'high', validate: (raw) => raw })
    const params = createMock.mock.calls[0][0]
    expect(params.output_config).toEqual({ effort: 'high' })
  })

  it('omite output_config para Haiku 4.5 (da 400 si se envía)', async () => {
    await callTool({ apiKey: 'k', model: 'claude-haiku-4-5', system: 's', user: 'u', tool, validate: (raw) => raw })
    const params = createMock.mock.calls[0][0]
    expect(params.model).toBe('claude-haiku-4-5')
    expect(params).not.toHaveProperty('output_config')
  })
})
