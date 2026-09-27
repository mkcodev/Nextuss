import { beforeEach, describe, expect, it } from 'vitest'
import { addDays } from 'date-fns'
import { db } from './schema'
import {
  createHabit,
  getLog,
  listHabits,
  moveHabitBetween,
  reconcileShields,
  setHabitLog,
  trashHabit,
} from './repositories/habits'
import { createAttribute, getOrCreateProgress } from './repositories/gamification'
import { SHIELDS_PER_MONTH } from '../lib/streaks'
import { XP_PER_COMPLETION } from '../lib/xp'
import { dateKey } from '../lib/dates'
import type { Habit } from './types'

type HabitInput = Omit<Habit, 'id' | 'createdAt' | 'archived' | 'deletedAt' | 'sortKey'>
const habit = (over: Partial<HabitInput> = {}): HabitInput => ({
  name: 'Meditar',
  icon: 'sparkles',
  color: '#5058c8',
  type: 'binary',
  weekdays: [],
  ...over,
})

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('createHabit / listHabits', () => {
  it('unlocks first_habit only for the first one', async () => {
    await createHabit(habit())
    await createHabit(habit({ name: 'Leer' }))
    expect((await db.achievements.toArray()).map((a) => a.key)).toEqual(['first_habit'])
  })

  it('lists by sortKey and hides archived and trashed habits', async () => {
    const a = await createHabit(habit({ name: 'A' }))
    const b = await createHabit(habit({ name: 'B' }))
    const c = await createHabit(habit({ name: 'C' }))
    await moveHabitBetween(c, null, (await db.habits.get(a))!.sortKey)
    expect((await listHabits()).map((h) => h.name)).toEqual(['C', 'A', 'B'])

    await db.habits.update(a, { archived: true })
    await trashHabit(b)
    expect((await listHabits()).map((h) => h.name)).toEqual(['C'])
    expect((await listHabits(true)).map((h) => h.name)).toEqual(['C', 'A'])
  })
})

describe('setHabitLog', () => {
  it('grants XP (global and attribute) on completion and gives it back on undo', async () => {
    const attributeId = (await createAttribute({ name: 'Mente', icon: 'brain', color: '#000' })) as number
    const id = await createHabit(habit({ attributeId }))
    await db.habits.update(id, { createdAt: 0 }) // la racha no cuenta días anteriores a su creación

    const done = await setHabitLog(id, '2026-09-20', 1)
    expect(done).toMatchObject({ completed: true, streak: 1 })
    expect(done.unlockedAchievements).toContain('first_completion')
    expect((await getOrCreateProgress()).totalXp).toBe(XP_PER_COMPLETION)
    expect((await db.attributes.get(attributeId))!.xp).toBe(XP_PER_COMPLETION)

    // Rewriting the same value doesn't double-count.
    await setHabitLog(id, '2026-09-20', 1)
    expect((await getOrCreateProgress()).totalXp).toBe(XP_PER_COMPLETION)

    const undone = await setHabitLog(id, '2026-09-20', 0)
    expect(undone.completed).toBe(false)
    expect((await getOrCreateProgress()).totalXp).toBe(0)
    expect((await db.attributes.get(attributeId))!.xp).toBe(0)
    expect(await db.habitLogs.count()).toBe(1)
  })

  it('only completes a quantity habit once the target is reached', async () => {
    const id = await createHabit(habit({ type: 'quantity', targetValue: 8, unit: 'vasos' }))
    expect((await setHabitLog(id, '2026-09-20', 5)).completed).toBe(false)
    expect((await setHabitLog(id, '2026-09-20', 8, 'bien')).completed).toBe(true)
    expect(await getLog(id, '2026-09-20')).toMatchObject({ value: 8, note: 'bien', completed: true })
  })

  it('unlocks the 7-day streak achievement on the seventh consecutive day', async () => {
    const id = await createHabit(habit())
    const start = new Date(2026, 8, 1)
    // Creado justo antes del primer registro: calculateStreak recorre día a día hasta createdAt, y
    // con createdAt = 0 (1970) eran ~20.600 días por llamada (timeout con la suite en paralelo).
    await db.habits.update(id, { createdAt: addDays(start, -1).getTime() })
    let last
    for (let i = 0; i < 7; i++) last = await setHabitLog(id, dateKey(addDays(start, i)), 1)
    expect(last!.streak).toBe(7)
    expect(last!.unlockedAchievements).toContain('streak_7')
  })

  it('throws for an unknown habit', async () => {
    await expect(setHabitLog(999, '2026-09-20', 1)).rejects.toThrow(/not found/)
  })
})

describe('reconcileShields', () => {
  const today = new Date(2026, 8, 25)
  const yesterday = dateKey(addDays(today, -1))

  it('absorbs an unlogged miss from yesterday with a shield', async () => {
    const id = await createHabit(habit())
    await reconcileShields(today)
    expect(await getLog(id, yesterday)).toMatchObject({ shieldUsed: true, completed: false })
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH - 1)

    // Running again the same day doesn't spend a second shield.
    await reconcileShields(today)
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH - 1)
  })

  it('leaves logged days, periodic habits and empty pools alone', async () => {
    const logged = await createHabit(habit({ name: 'Hecho' }))
    await setHabitLog(logged, yesterday, 1)
    await createHabit(habit({ name: 'Semanal', schedule: { type: 'timesPerWeek', times: 3 } }))
    await reconcileShields(today)
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH)
    expect(await db.habitLogs.filter((l) => !!l.shieldUsed).count()).toBe(0)

    await db.progress.update(1, { shields: 0 })
    const missed = await createHabit(habit({ name: 'Sin escudos' }))
    await reconcileShields(today)
    expect(await getLog(missed, yesterday)).toBeUndefined()
  })
})
