import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { getDailyEntry, upsertDailyEntry, upsertReflection } from './repositories/dailyEntries'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('upsertDailyEntry', () => {
  it('crea la fila con los valores por defecto y fusiona escrituras sucesivas', async () => {
    await upsertDailyEntry('2026-09-29', { intention: 'Ir con calma' })
    let entry = await getDailyEntry('2026-09-29')
    expect(entry?.intention).toBe('Ir con calma')
    expect(entry?.gratitudes).toEqual([])
    expect(entry?.intentionKept).toBeNull()

    await upsertDailyEntry('2026-09-29', { gratitudes: ['Sol', 'Café'] })
    entry = await getDailyEntry('2026-09-29')
    expect(entry?.intention).toBe('Ir con calma')
    expect(entry?.gratitudes).toEqual(['Sol', 'Café'])

    const all = await db.dailyEntries.where('date').equals('2026-09-29').toArray()
    expect(all).toHaveLength(1)
  })
})

describe('upsertReflection', () => {
  it('añade una reflexión nueva y reemplaza la de la misma pregunta en vez de duplicarla', async () => {
    await upsertReflection('2026-09-29', '¿Cómo quieres sentirte hoy?', 'Tranquilo')
    let entry = await getDailyEntry('2026-09-29')
    expect(entry?.reflections).toHaveLength(1)
    expect(entry?.reflections[0].answer).toBe('Tranquilo')

    await upsertReflection('2026-09-29', '¿Cómo quieres sentirte hoy?', 'En paz')
    entry = await getDailyEntry('2026-09-29')
    expect(entry?.reflections).toHaveLength(1)
    expect(entry?.reflections[0].answer).toBe('En paz')

    await upsertReflection('2026-09-29', 'Otra pregunta', 'Otra respuesta')
    entry = await getDailyEntry('2026-09-29')
    expect(entry?.reflections).toHaveLength(2)
  })
})

describe('getDailyEntry', () => {
  it('devuelve null (no undefined) cuando no hay fila', async () => {
    expect(await getDailyEntry('2026-09-29')).toBeNull()
  })
})
