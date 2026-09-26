import { describe, expect, it } from 'vitest'
import { AiError } from './errors'
import { validateCapture, validateDayPlan, validateSubtasks, validateSummary } from './validators'

describe('validateSubtasks', () => {
  it('normalises titles and clamps estimates to 5–480 min', () => {
    const out = validateSubtasks({
      subtasks: [
        { title: '  Escribir borrador ', estimateMin: 2 },
        { title: 'Revisar', estimateMin: 9999 },
        { title: 'Enviar', estimateMin: 'abc' },
      ],
    })
    expect(out).toEqual([
      { title: 'Escribir borrador', estimateMin: 5 },
      { title: 'Revisar', estimateMin: 480 },
      { title: 'Enviar', estimateMin: 30 },
    ])
  })

  it('drops non-objects and empty titles, and keeps at most 8', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ title: `T${i}`, estimateMin: 10 }))
    expect(validateSubtasks({ subtasks: [null, 'x', { title: '   ' }, ...many] })).toHaveLength(8)
  })

  it('throws a malformed AiError when the shape is wrong', () => {
    expect(() => validateSubtasks({ subtasks: 'nope' })).toThrow(AiError)
    expect(() => validateSubtasks(null)).toThrow(AiError)
  })
})

describe('validateCapture', () => {
  it('keeps only well-formed optional fields', () => {
    expect(validateCapture({ title: ' Llamar al banco ', scheduledDate: '2026-10-01', energy: 'low', estimateMin: 17.4 })).toEqual({
      title: 'Llamar al banco',
      scheduledDate: '2026-10-01',
      energy: 'low',
      estimateMin: 17,
    })
  })

  it('discards invented or malformed values instead of storing them', () => {
    expect(validateCapture({ title: 'X', scheduledDate: 'mañana', energy: 'extreme', estimateMin: -3 })).toEqual({
      title: 'X',
      scheduledDate: undefined,
      energy: undefined,
      estimateMin: undefined,
    })
  })

  it('requires a title', () => {
    expect(() => validateCapture({ title: '  ' })).toThrow(/título/)
  })
})

describe('validateSummary', () => {
  it('trims and rejects empty summaries', () => {
    expect(validateSummary({ summary: ' Buena semana. ' })).toBe('Buena semana.')
    expect(() => validateSummary({ summary: '' })).toThrow(AiError)
  })
})

describe('validateDayPlan', () => {
  const valid = new Set([1, 2, 3])

  it('filters out ids that were never sent and de-duplicates across lists', () => {
    expect(validateDayPlan({ orderedTaskIds: [3, 99, 1], deferTaskIds: [1, 2, 42], note: ' Primero lo ligero ' }, valid)).toEqual({
      orderedTaskIds: [3, 1],
      deferTaskIds: [2],
      note: 'Primero lo ligero',
    })
  })

  it('throws when nothing usable is left', () => {
    expect(() => validateDayPlan({ orderedTaskIds: [99], deferTaskIds: [] }, valid)).toThrow(AiError)
  })
})
