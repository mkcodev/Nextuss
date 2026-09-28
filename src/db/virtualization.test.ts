import { beforeEach, describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import { db } from './schema'
import { getOrCreateProgress } from './repositories/gamification'
import { getVirtualizationDay, getVirtualizationDays, reconcileVirtualizationShields, upsertVirtualizationDay } from './repositories/virtualization'
import { SHIELDS_PER_MONTH } from '../lib/streaks'
import { dateKey } from '../lib/dates'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('upsertVirtualizationDay', () => {
  it('crea la fila la primera vez y la actualiza después, sin duplicar', async () => {
    const created = await upsertVirtualizationDay('2026-09-20', { phaseReached: 'transmision' })
    expect(created).toMatchObject({ date: '2026-09-20', phaseReached: 'transmision', completed: false, skipped: false })

    const updated = await upsertVirtualizationDay('2026-09-20', { completed: true, xpAwarded: 40 })
    expect(updated).toMatchObject({ phaseReached: 'transmision', completed: true, xpAwarded: 40 })
    expect(await db.virtualizationDays.count()).toBe(1)
  })
})

describe('getVirtualizationDays', () => {
  it('trae solo las filas dentro del rango pedido', async () => {
    await upsertVirtualizationDay('2026-09-10', { completed: true })
    await upsertVirtualizationDay('2026-09-19', { completed: true })
    await upsertVirtualizationDay('2026-09-20', { completed: true })
    const days = await getVirtualizationDays(5, new Date(2026, 8, 20))
    expect(days.map((d) => d.date).sort()).toEqual(['2026-09-19', '2026-09-20'])
  })
})

describe('reconcileVirtualizationShields', () => {
  const today = new Date(2026, 8, 25)
  const yesterday = dateKey(addDays(today, -1))

  it('cubre con un escudo el día de ayer si no hay ninguna fila', async () => {
    await reconcileVirtualizationShields(today)
    expect(await getVirtualizationDay(yesterday)).toMatchObject({ shieldUsed: true, completed: false })
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH - 1)

    // Repetir el mismo día no gasta un segundo escudo.
    await reconcileVirtualizationShields(today)
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH - 1)
  })

  it('no toca un día ya completado, saltado explícitamente, ni gasta escudos si no quedan', async () => {
    await upsertVirtualizationDay(yesterday, { completed: true })
    await reconcileVirtualizationShields(today)
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH)

    await db.virtualizationDays.clear()
    await upsertVirtualizationDay(yesterday, { skipped: true })
    await reconcileVirtualizationShields(today)
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH)

    await db.virtualizationDays.clear()
    await db.progress.update(1, { shields: 0 })
    await reconcileVirtualizationShields(today)
    expect(await getVirtualizationDay(yesterday)).toBeUndefined()
  })
})
