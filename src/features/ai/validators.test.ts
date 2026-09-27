import { describe, expect, it } from 'vitest'
import { AiError } from './errors'
import {
  validateCapture,
  validateDayPlan,
  validateGoalTasks,
  validateHabitSuggestions,
  validateProjectTemplate,
  validateSubtasks,
  validateSummary,
} from './validators'

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

describe('validateHabitSuggestions', () => {
  const ctx = { existingNames: ['Beber agua'], attributes: [{ id: 7, name: 'Salud' }] }

  it('normalises each habit and resolves the attribute by name', () => {
    const [h] = validateHabitSuggestions(
      { habits: [{ name: ' Leer ', icon: 'book', type: 'quantity', targetValue: 10.4, unit: ' páginas ', weekdays: [1, 3, 3, 9], attribute: 'salud', reason: 'Calma' }] },
      ctx,
    )
    expect(h).toEqual({ name: 'Leer', icon: 'book', type: 'quantity', targetValue: 10, unit: 'páginas', weekdays: [1, 3], attributeId: 7, reason: 'Calma' })
  })

  it('falls back on unknown icon/type, drops target and unit for yes/no habits, and treats 7 days as daily', () => {
    const [h] = validateHabitSuggestions(
      { habits: [{ name: 'Meditar', icon: 'unicornio', type: 'weird', targetValue: 5, unit: 'min', weekdays: [0, 1, 2, 3, 4, 5, 6], attribute: 'Inventado' }] },
      ctx,
    )
    expect(h).toMatchObject({ icon: 'target', type: 'binary', targetValue: undefined, unit: undefined, weekdays: [], attributeId: undefined })
  })

  it('defaults duration habits to minutes', () => {
    const [h] = validateHabitSuggestions({ habits: [{ name: 'Caminar', type: 'duration', targetValue: 20 }] }, ctx)
    expect(h.unit).toBe('min')
  })

  it('skips habits the user already has and repeated names, case-insensitively', () => {
    const out = validateHabitSuggestions({ habits: [{ name: 'beber AGUA' }, { name: 'Estirar' }, { name: 'estirar ' }] }, ctx)
    expect(out.map((h) => h.name)).toEqual(['Estirar'])
  })

  it('throws when nothing new is left, or the shape is wrong', () => {
    expect(() => validateHabitSuggestions({ habits: [{ name: 'Beber agua' }] }, ctx)).toThrow(AiError)
    expect(() => validateHabitSuggestions({ habits: 'x' }, ctx)).toThrow(AiError)
  })
})

describe('validateProjectTemplate', () => {
  it('normalises name, icon and tasks', () => {
    const out = validateProjectTemplate({ name: ' Podcast ', icon: 'music', description: '', tasks: [{ title: ' Grabar ', estimateMin: 1 }, { title: '' }] })
    expect(out).toEqual({ name: 'Podcast', icon: 'music', description: undefined, tasks: [{ title: 'Grabar', estimateMin: 5 }] })
  })

  it('uses the folder icon for unknown keys and caps tasks at 15', () => {
    const tasks = Array.from({ length: 20 }, (_, i) => ({ title: `T${i}`, estimateMin: 30 }))
    const out = validateProjectTemplate({ name: 'X', icon: '???', tasks })
    expect(out.icon).toBe('folder')
    expect(out.tasks).toHaveLength(15)
  })

  it('throws without a name or without tasks', () => {
    expect(() => validateProjectTemplate({ name: '', tasks: [{ title: 'a' }] })).toThrow(AiError)
    expect(() => validateProjectTemplate({ name: 'X', tasks: [] })).toThrow(AiError)
  })
})

describe('validateGoalTasks', () => {
  it('skips tasks already linked to the goal and repeats', () => {
    const out = validateGoalTasks(
      { tasks: [{ title: 'Configurar dominio', estimateMin: 30 }, { title: 'Elegir fotos', estimateMin: 45 }, { title: 'elegir fotos' }] },
      ['configurar DOMINIO'],
    )
    expect(out).toEqual([{ title: 'Elegir fotos', estimateMin: 45 }])
  })

  it('throws when every proposal already exists', () => {
    expect(() => validateGoalTasks({ tasks: [{ title: 'A' }] }, ['a'])).toThrow(AiError)
  })
})
