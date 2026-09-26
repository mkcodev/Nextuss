import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  getAchievementsInRange,
  getFocusSessionsInRange,
  getGoalsInRange,
  getHabitLogsInRange,
  getTasksCompletedInRange,
  getTasksCreatedInRange,
} from './repositories/stats'
import { createTask } from './repositories/tasks'

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime()

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

describe('stats range reads', () => {
  it('habit logs: inclusive on both ends', async () => {
    for (const date of ['2026-09-09', '2026-09-10', '2026-09-20', '2026-09-21']) {
      await db.habitLogs.add({ habitId: 1, date, value: 1, completed: true, loggedAt: 0 })
    }
    const rows = await getHabitLogsInRange('2026-09-10', '2026-09-20')
    expect(rows.map((r) => r.date).sort()).toEqual(['2026-09-10', '2026-09-20'])
  })

  it('tasks: whole last day included, next midnight excluded, trashed skipped', async () => {
    const inside = await createTask({ title: 'Dentro' })
    const lastMinute = await createTask({ title: 'Último minuto' })
    const nextDay = await createTask({ title: 'Día siguiente' })
    const trashed = await createTask({ title: 'Borrada' })
    await db.tasks.update(inside, { completedAt: at(2026, 9, 15), createdAt: at(2026, 9, 15) })
    await db.tasks.update(lastMinute, { completedAt: new Date(2026, 8, 20, 23, 59).getTime(), createdAt: at(2026, 9, 1) })
    await db.tasks.update(nextDay, { completedAt: new Date(2026, 8, 21, 0, 0).getTime(), createdAt: at(2026, 9, 21) })
    await db.tasks.update(trashed, { completedAt: at(2026, 9, 15), createdAt: at(2026, 9, 15), deletedAt: Date.now() })

    const done = await getTasksCompletedInRange('2026-09-10', '2026-09-20')
    expect(done.map((t) => t.title).sort()).toEqual(['Dentro', 'Último minuto'])
    const created = await getTasksCreatedInRange('2026-09-10', '2026-09-20')
    expect(created.map((t) => t.title)).toEqual(['Dentro'])
  })

  it('focus sessions by start timestamp', async () => {
    await db.focusSessions.add({ start: at(2026, 9, 15), end: at(2026, 9, 15, 13), durationMin: 60, interruptions: 0 })
    await db.focusSessions.add({ start: at(2026, 9, 25), end: at(2026, 9, 25, 13), durationMin: 60, interruptions: 0 })
    expect(await getFocusSessionsInRange(at(2026, 9, 10, 0), at(2026, 9, 20, 0))).toHaveLength(1)
  })

  it('goals created or completed in range, excluding trashed', async () => {
    const base = { period: 'week' as const, periodKey: '2026-W38', taskIds: [], done: false, isPriority: false, sortKey: 0, deletedAt: 0 }
    await db.goals.bulkAdd([
      { ...base, title: 'Creado dentro', createdAt: at(2026, 9, 15) },
      { ...base, title: 'Completado dentro', createdAt: at(2026, 8, 1), completedAt: at(2026, 9, 18) },
      { ...base, title: 'Fuera', createdAt: at(2026, 8, 1) },
      { ...base, title: 'Borrado', createdAt: at(2026, 9, 15), deletedAt: 1 },
    ])
    const rows = await getGoalsInRange('2026-09-10', '2026-09-20')
    expect(rows.map((g) => g.title).sort()).toEqual(['Completado dentro', 'Creado dentro'])
  })

  it('achievements unlocked in range', async () => {
    await db.achievements.bulkAdd([
      { key: 'a', unlockedAt: at(2026, 9, 12) },
      { key: 'b', unlockedAt: at(2026, 9, 30) },
    ])
    expect((await getAchievementsInRange('2026-09-10', '2026-09-20')).map((a) => a.key)).toEqual(['a'])
  })
})
