import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  applyAttributeXpDelta,
  applyXpDelta,
  consumeShield,
  createAttribute,
  deleteAttribute,
  getOrCreateProgress,
  listAchievements,
  listAttributes,
  refillShieldsIfNewMonth,
  unlockAchievement,
} from './repositories/gamification'
import { SHIELDS_PER_MONTH } from '../lib/streaks'
import { levelForXp } from '../lib/xp'
import { monthKey } from '../lib/dates'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('progress', () => {
  it('seeds level 1 with a full shield pool the first time', async () => {
    const p = await getOrCreateProgress()
    expect(p).toMatchObject({ totalXp: 0, level: 1, shields: SHIELDS_PER_MONTH, lastShieldRefill: monthKey() })
    expect(await db.progress.count()).toBe(1)
  })

  it('applies XP deltas, reports level-ups and never goes below zero', async () => {
    let xp = 0
    while (levelForXp(xp) < 2) xp += 10
    const up = await applyXpDelta(xp)
    expect(up).toEqual({ totalXp: xp, level: 2, leveledUp: true })

    const again = await applyXpDelta(10)
    expect(again.leveledUp).toBe(false)

    const down = await applyXpDelta(-1_000_000)
    expect(down).toEqual({ totalXp: 0, level: 1, leveledUp: false })
  })
})

describe('shields', () => {
  it('consumes one shield at a time and refuses when empty', async () => {
    for (let i = 0; i < SHIELDS_PER_MONTH; i++) expect(await consumeShield()).toBe(true)
    expect(await consumeShield()).toBe(false)
    expect((await getOrCreateProgress()).shields).toBe(0)
  })

  it('refills only when the month rolled over, without carrying unused shields', async () => {
    await getOrCreateProgress()
    await consumeShield()
    await refillShieldsIfNewMonth()
    expect((await getOrCreateProgress()).shields).toBe(SHIELDS_PER_MONTH - 1)

    await db.progress.update(1, { lastShieldRefill: '2000-01', shields: 0 })
    await refillShieldsIfNewMonth()
    const p = await getOrCreateProgress()
    expect(p.shields).toBe(SHIELDS_PER_MONTH)
    expect(p.lastShieldRefill).toBe(monthKey())
  })
})

describe('attributes', () => {
  it('creates attributes in order and clamps their XP at zero', async () => {
    const a = (await createAttribute({ name: 'Salud', icon: 'heart', color: '#000' })) as number
    await createAttribute({ name: 'Mente', icon: 'brain', color: '#111' })
    expect((await listAttributes()).map((x) => x.name)).toEqual(['Salud', 'Mente'])

    await applyAttributeXpDelta(a, 30)
    await applyAttributeXpDelta(a, -100)
    expect((await db.attributes.get(a))!.xp).toBe(0)
    await expect(applyAttributeXpDelta(undefined, 10)).resolves.toBeUndefined()
  })

  it('clears dangling references on habits and goals before deleting', async () => {
    const a = (await createAttribute({ name: 'Salud', icon: 'heart', color: '#000' })) as number
    const habitId = await db.habits.add({
      name: 'Correr', icon: 'run', color: '#000', type: 'binary', weekdays: [], attributeId: a,
      archived: false, createdAt: 0, deletedAt: 0, sortKey: 0,
    })
    const goalId = await db.goals.add({
      period: 'week', periodKey: '2026-W39', title: 'Meta', taskIds: [], done: false, isPriority: false,
      attributeId: a, createdAt: 0, deletedAt: 0, sortKey: 0,
    })
    await deleteAttribute(a)
    expect(await db.attributes.get(a)).toBeUndefined()
    expect((await db.habits.get(habitId))!.attributeId).toBeUndefined()
    expect((await db.goals.get(goalId))!.attributeId).toBeUndefined()
  })
})

describe('achievements', () => {
  it('unlocks each key only once', async () => {
    expect(await unlockAchievement('first_habit')).toBe(true)
    expect(await unlockAchievement('first_habit')).toBe(false)
    expect((await listAchievements()).map((a) => a.key)).toEqual(['first_habit'])
  })
})
