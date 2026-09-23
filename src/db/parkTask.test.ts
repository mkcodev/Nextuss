import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { useUndoStore } from '../lib/undoStore'
import { createTask, getOverdueTasks, parkTask } from './repositories/tasks'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  useUndoStore.setState({ past: [], future: [] })
})

describe('parkTask', () => {
  it('clears the schedule, moves to backlog, and resets postponedCount — unlike carryOverToToday', async () => {
    const id = await createTask({
      title: 'Tarea zombie',
      scheduledDate: '2026-09-20',
      scheduledStart: '09:00',
      scheduledEnd: '10:00',
    })
    await db.tasks.update(id, { postponedCount: 3 })

    await parkTask(id)

    const task = await db.tasks.get(id)
    expect(task?.scheduledDate).toBeUndefined()
    expect(task?.scheduledStart).toBeUndefined()
    expect(task?.scheduledEnd).toBeUndefined()
    expect(task?.status).toBe('backlog')
    expect(task?.postponedCount).toBe(0)
  })

  it('a parked task no longer shows up as overdue', async () => {
    const id = await createTask({ title: 't', scheduledDate: '2026-09-20' })
    await db.tasks.update(id, { postponedCount: 3 })
    expect(await getOverdueTasks('2026-09-23')).toHaveLength(1)

    await parkTask(id)
    expect(await getOverdueTasks('2026-09-23')).toHaveLength(0)
  })

  it('is undoable via the undo stack', async () => {
    const id = await createTask({ title: 't', scheduledDate: '2026-09-20' })
    await parkTask(id)
    expect((await db.tasks.get(id))?.status).toBe('backlog')

    await useUndoStore.getState().undo()
    const restored = await db.tasks.get(id)
    expect(restored?.status).not.toBe('backlog')
    expect(restored?.scheduledDate).toBe('2026-09-20')
  })
})
