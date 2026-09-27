import { describe, expect, it } from 'vitest'
import { DEFAULT_AI_MODEL, modelSupportsEffort, resolveAiModel } from './errors'

describe('resolveAiModel', () => {
  it('usa Sonnet 5 por defecto cuando no hay modelo guardado', () => {
    expect(resolveAiModel(undefined)).toBe('claude-sonnet-5')
    expect(resolveAiModel(undefined)).toBe(DEFAULT_AI_MODEL)
  })

  it('respeta el modelo guardado cuando existe', () => {
    expect(resolveAiModel('claude-opus-5')).toBe('claude-opus-5')
    expect(resolveAiModel('claude-haiku-4-5')).toBe('claude-haiku-4-5')
  })
})

describe('modelSupportsEffort', () => {
  it('Haiku 4.5 no acepta output_config.effort', () => {
    expect(modelSupportsEffort('claude-haiku-4-5')).toBe(false)
  })

  it('Sonnet 5 y Opus 5 sí lo aceptan', () => {
    expect(modelSupportsEffort('claude-sonnet-5')).toBe(true)
    expect(modelSupportsEffort('claude-opus-5')).toBe(true)
  })
})
