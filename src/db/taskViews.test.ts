import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { createTask } from './repositories/tasks'
import { listAllTasks } from './repositories/tasks'
import {
  createTaskView,
  ensureDefaultTaskViews,
  listTaskViews,
  moveTaskViewBetween,
  resetSeedStateForTests,
} from './repositories/taskViews'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  resetSeedStateForTests()
})

describe('listAllTasks', () => {
  it('returns every live task, including done ones, with no cap', async () => {
    for (let i = 0; i < 60; i++) await createTask({ title: `t${i}` })
    const doneId = await createTask({ title: 'done', status: 'done' })
    const trashedId = await createTask({ title: 'trashed' })
    await db.tasks.update(trashedId, { deletedAt: Date.now() })

    const all = await listAllTasks()
    expect(all).toHaveLength(61)
    expect(all.map((t) => t.id)).toContain(doneId)
    expect(all.map((t) => t.id)).not.toContain(trashedId)
  })
})

describe('ensureDefaultTaskViews', () => {
  it('seeds 4 default views on an empty account', async () => {
    await ensureDefaultTaskViews('2026-09-23')
    const views = await listTaskViews()
    expect(views).toHaveLength(4)
    expect(views.map((v) => v.name)).toEqual(['Atrasadas', 'Prioridad alta', 'Sin proyecto', 'Hoy'])
  })

  it('substitutes today into the "Hoy" preset dates', async () => {
    await ensureDefaultTaskViews('2026-09-23')
    const hoy = (await listTaskViews()).find((v) => v.name === 'Hoy')
    expect(hoy?.filters.dateFrom).toBe('2026-09-23')
    expect(hoy?.filters.dateTo).toBe('2026-09-23')
  })

  it('never reseeds or touches views the user already has', async () => {
    await createTaskView({ name: 'Mía', filters: {}, sortField: 'title', sortDir: 'asc', columns: [] })
    await ensureDefaultTaskViews('2026-09-23')
    const views = await listTaskViews()
    expect(views).toHaveLength(1)
    expect(views[0].name).toBe('Mía')
  })

  it('two concurrent calls (React StrictMode double-effect) only seed once, not twice', async () => {
    await Promise.all([ensureDefaultTaskViews('2026-09-23'), ensureDefaultTaskViews('2026-09-23')])
    expect(await listTaskViews()).toHaveLength(4)
  })
})

describe('moveTaskViewBetween', () => {
  it('positions the view between its two neighbor sortKeys', async () => {
    const aId = await createTaskView({ name: 'A', filters: {}, sortField: 'title', sortDir: 'asc', columns: [] })
    const bId = await createTaskView({ name: 'B', filters: {}, sortField: 'title', sortDir: 'asc', columns: [] })
    await db.taskViews.update(aId, { sortKey: 0 })
    await db.taskViews.update(bId, { sortKey: 1000 })
    const cId = await createTaskView({ name: 'C', filters: {}, sortField: 'title', sortDir: 'asc', columns: [] })
    await db.taskViews.update(cId, { sortKey: 2000 })

    await moveTaskViewBetween(cId, 0, 1000)
    const c = await db.taskViews.get(cId)
    expect(c!.sortKey).toBeGreaterThan(0)
    expect(c!.sortKey).toBeLessThan(1000)
  })
})
