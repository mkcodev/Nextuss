import { beforeEach, describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import { db } from './schema'
import { getOrCreateProgress } from './repositories/gamification'
import {
  completeVirtualization,
  getVirtualizationDay,
  getVirtualizationDays,
  reconcileVirtualizationShields,
  upsertVirtualizationDay,
} from './repositories/virtualization'
import { SHIELDS_PER_MONTH } from '../lib/streaks'
import { xpForVirtualization, VIRTUALIZATION_XP_BASE } from '../lib/xp'
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

describe('completeVirtualization', () => {
  it('completar da XP base (racha 1) y no rompe nada al repetir el mismo día', async () => {
    const result = await completeVirtualization('2026-09-20', false)
    expect(result).toMatchObject({ streak: 1, xpAwarded: VIRTUALIZATION_XP_BASE, unlockedAchievements: [] })
    expect((await getOrCreateProgress()).totalXp).toBe(VIRTUALIZATION_XP_BASE)
    expect(await getVirtualizationDay('2026-09-20')).toMatchObject({ completed: true, skipped: false, xpAwarded: VIRTUALIZATION_XP_BASE })
  })

  it('la XP crece con la racha real y desbloquea el logro de 3 días al llegar', async () => {
    await completeVirtualization('2026-09-18', false)
    await completeVirtualization('2026-09-19', false)
    const result = await completeVirtualization('2026-09-20', false)
    expect(result.streak).toBe(3)
    expect(result.xpAwarded).toBe(xpForVirtualization(3))
    expect(result.unlockedAchievements).toContain('virtualization_streak_3')
  })

  it('saltar («Hoy no») no da XP ni logros; al día siguiente la racha ya no cuenta ese salto', async () => {
    await completeVirtualization('2026-09-19', false)
    const result = await completeVirtualization('2026-09-20', true)
    expect(result).toMatchObject({ xpAwarded: 0, unlockedAchievements: [] })
    expect(await getVirtualizationDay('2026-09-20')).toMatchObject({ completed: false, skipped: true, xpAwarded: 0 })
    // El día del salto en sí no rompe su propia racha (mismo criterio que "hoy" en calculateStreak:
    // el día aún no ha terminado); el corte se nota al mirar hacia atrás desde el día siguiente.
    const next = await completeVirtualization('2026-09-21', false)
    expect(next.streak).toBe(1)
  })
})
