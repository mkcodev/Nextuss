import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { toggleTaskDone } from './repositories/tasks'
import {
  createRecurrenceRule,
  detachOccurrence,
  generateUpcomingOccurrences,
  stopRecurrence,
  updateRuleAndFutureOccurrences,
} from './repositories/recurrence'
import type { RecurrenceRule } from './types'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

function baseRule(overrides: Partial<RecurrenceRule> = {}): Omit<RecurrenceRule, 'id' | 'createdAt'> {
  return {
    freq: 'daily',
    interval: 1,
    mode: 'schedule',
    startDate: '2026-01-01',
    title: 'Regar plantas',
    tagIds: [],
    ...overrides,
  }
}

describe('createRecurrenceRule + generateUpcomingOccurrences (modo schedule)', () => {
  it('genera la ocurrencia de hoy al crear la regla, sin esperar al mantenimiento diario', async () => {
    await createRecurrenceRule(baseRule({ startDate: '2026-01-01' }), '2026-01-01')
    const tasks = await db.tasks.toArray()
    const today = tasks.find((t) => t.occurrenceDate === '2026-01-01')
    expect(today).toMatchObject({ title: 'Regar plantas', occurrenceDate: '2026-01-01' })
  })

  it('rellena el horizonte de 28 días sin duplicar al llamarse dos veces (idempotencia de StrictMode)', async () => {
    const ruleId = await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 7, startDate: '2026-01-01' }),
      '2026-01-01',
    )
    await generateUpcomingOccurrences('2026-01-01')
    await generateUpcomingOccurrences('2026-01-01')
    const tasks = await db.tasks.where('recurrenceId').equals(ruleId).toArray()
    // 2026-01-01, 08, 15, 22, 29 dentro de un horizonte de 28 días (inclusive) — nunca duplicado por la segunda llamada.
    expect(tasks).toHaveLength(5)
  })

  it('no genera ocurrencias pasadas que se saltaron', async () => {
    const ruleId = await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 1, startDate: '2025-01-01' }),
      '2026-06-01',
    )
    await generateUpcomingOccurrences('2026-06-01')
    const tasks = await db.tasks.where('recurrenceId').equals(ruleId).toArray()
    expect(tasks.every((t) => (t.occurrenceDate ?? '') >= '2026-06-01')).toBe(true)
  })
})

describe('handleRecurringCompletion (modo completion)', () => {
  it('genera la siguiente ocurrencia solo al completar la actual, no por adelantado', async () => {
    await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 3, mode: 'completion', startDate: '2026-01-01' }),
      '2026-01-01',
    )
    let tasks = await db.tasks.toArray()
    expect(tasks).toHaveLength(1)

    await toggleTaskDone(tasks[0].id!)
    tasks = await db.tasks.toArray()
    expect(tasks).toHaveLength(2)
    const next = tasks.find((t) => t.id !== tasks[0].id)
    expect(next?.scheduledDate).not.toBe(tasks[0].scheduledDate)
  })

  it('no genera otra vez al desmarcar y volver a marcar la misma ocurrencia', async () => {
    await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 3, mode: 'completion', startDate: '2026-01-01' }),
      '2026-01-01',
    )
    const first = (await db.tasks.toArray())[0]
    await toggleTaskDone(first.id!)
    await toggleTaskDone(first.id!) // desmarca
    await toggleTaskDone(first.id!) // vuelve a marcar
    const tasks = await db.tasks.toArray()
    expect(tasks).toHaveLength(2)
  })
})

describe('detachOccurrence / updateRuleAndFutureOccurrences / stopRecurrence', () => {
  it('detachOccurrence deja la tarea como normal, ya no pertenece a la serie', async () => {
    const ruleId = await createRecurrenceRule(baseRule({ startDate: '2026-01-01' }), '2026-01-01')
    const task = (await db.tasks.toArray())[0]
    await detachOccurrence(task.id!)
    const updated = await db.tasks.get(task.id!)
    expect(updated?.recurrenceId).toBeUndefined()
    expect(updated?.occurrenceDate).toBeUndefined()
    // La regla sigue generando para el resto de la serie, ajena a esta tarea ya desvinculada.
    await generateUpcomingOccurrences('2026-01-01')
    const stillLinked = await db.tasks.where('recurrenceId').equals(ruleId).toArray()
    expect(stillLinked.find((t) => t.id === task.id)).toBeUndefined()
  })

  it('updateRuleAndFutureOccurrences regenera las ocurrencias futuras no completadas con la plantilla nueva', async () => {
    const ruleId = await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 1, startDate: '2026-01-01' }),
      '2026-01-01',
    )
    await generateUpcomingOccurrences('2026-01-01')
    const before = await db.tasks.where('recurrenceId').equals(ruleId).toArray()
    expect(before.every((t) => t.title === 'Regar plantas')).toBe(true)

    await updateRuleAndFutureOccurrences(ruleId, { title: 'Regar plantas (nuevo horario)' }, '2026-01-01')

    const after = (await db.tasks.where('recurrenceId').equals(ruleId).toArray()).filter((t) => t.deletedAt === 0)
    expect(after.every((t) => t.title === 'Regar plantas (nuevo horario)')).toBe(true)
    // Las filas viejas quedaron en papelera, no borradas de verdad.
    const trashed = await db.tasks.where('recurrenceId').equals(ruleId).and((t) => t.deletedAt !== 0).toArray()
    expect(trashed.length).toBe(before.length)
  })

  it('updateRuleAndFutureOccurrences no toca una ocurrencia ya completada', async () => {
    const ruleId = await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 1, startDate: '2026-01-01' }),
      '2026-01-01',
    )
    const first = (await db.tasks.toArray())[0]
    await toggleTaskDone(first.id!)
    await updateRuleAndFutureOccurrences(ruleId, { title: 'Otro nombre' }, '2026-01-01')
    const stillDone = await db.tasks.get(first.id!)
    expect(stillDone?.title).toBe('Regar plantas')
    expect(stillDone?.status).toBe('done')
    expect(stillDone?.deletedAt).toBe(0)
  })

  it('stopRecurrence borra la regla y desvincula las ocurrencias futuras sin completar', async () => {
    const ruleId = await createRecurrenceRule(
      baseRule({ freq: 'daily', interval: 1, startDate: '2026-01-01' }),
      '2026-01-01',
    )
    await generateUpcomingOccurrences('2026-01-01')
    const before = await db.tasks.where('recurrenceId').equals(ruleId).toArray()
    expect(before.length).toBeGreaterThan(1)

    await stopRecurrence(ruleId, '2026-01-01')

    expect(await db.recurrenceRules.get(ruleId)).toBeUndefined()
    const after = await db.tasks.toArray()
    expect(after.every((t) => t.recurrenceId === undefined)).toBe(true)
    expect(after).toHaveLength(before.length) // ninguna se borró, solo se desvincularon
  })
})
