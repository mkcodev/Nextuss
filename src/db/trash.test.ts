import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { listTrash, purgeExpiredTrash, purgeTrashEntry, restoreTrashEntry, trashRows } from './trash'
import { useUndoStore } from '../lib/undoStore'
import { createTask, getTask, getTasksForDate, trashTask } from './repositories/tasks'
import { createHabit, listHabits } from './repositories/habits'
import { createGoal, listGoalsForPeriod, trashGoal } from './repositories/goals'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  useUndoStore.setState({ past: [], future: [] })
})

describe('trashRows / listing exclusion', () => {
  it('a soft-deleted row disappears from listHabits but stays in the table', async () => {
    const id = await createHabit({ name: 'Meditar', icon: 'brain', color: '#fff', type: 'binary', weekdays: [] })
    await trashRows('habits', [id], 'Hábito eliminado')

    expect(await listHabits()).toEqual([])
    const raw = await db.habits.get(id)
    expect(raw?.deletedAt).toBeGreaterThan(0)
  })

  it('a soft-deleted goal disappears from listGoalsForPeriod', async () => {
    const id = await createGoal({ period: 'week', periodKey: '2026-W38', title: 'g' })
    await trashRows('goals', [id], 'Objetivo eliminado')
    expect(await listGoalsForPeriod('week', '2026-W38')).toEqual([])
  })

  it('a soft-deleted task disappears from getTasksForDate', async () => {
    const id = await createTask({ title: 't', scheduledDate: '2026-09-22' })
    await trashRows('tasks', [id], 'Tarea eliminada')
    expect(await getTasksForDate('2026-09-22')).toEqual([])
  })

  it('records one trash entry per batch, listed newest first', async () => {
    const id = await createTask({ title: 't' })
    await trashRows('tasks', [id], 'Tarea eliminada: "t"')
    const trash = await listTrash()
    expect(trash).toHaveLength(1)
    expect(trash[0].table).toBe('tasks')
    expect(trash[0].entityIds).toEqual([id])
  })
})

describe('undo', () => {
  it('Ctrl+Z after a soft-delete restores the row and clears the trash entry', async () => {
    const id = await createTask({ title: 't', scheduledDate: '2026-09-22' })
    await trashRows('tasks', [id], 'Tarea eliminada')
    expect(await getTasksForDate('2026-09-22')).toEqual([])

    await useUndoStore.getState().undo()

    expect((await getTasksForDate('2026-09-22')).map((t) => t.id)).toEqual([id])
    expect(await listTrash()).toEqual([])
  })
})

describe('trashTask cascade', () => {
  it('moves a task and its whole subtree to the trash behind one undo entry', async () => {
    const parentId = await createTask({ title: 'parent' })
    const childId = await createTask({ title: 'child', parentId })
    const grandchildId = await createTask({ title: 'grandchild', parentId: childId })

    await trashTask(parentId)

    for (const id of [parentId, childId, grandchildId]) {
      expect((await getTask(id))?.deletedAt).toBeGreaterThan(0)
    }
    expect(await listTrash()).toHaveLength(1)

    await useUndoStore.getState().undo()
    for (const id of [parentId, childId, grandchildId]) {
      expect((await getTask(id))?.deletedAt).toBe(0)
    }
  })
})

describe('restore / purge', () => {
  it('restoreTrashEntry brings the row back and removes the trash entry', async () => {
    const id = await createTask({ title: 't' })
    await trashRows('tasks', [id], 'Tarea eliminada')
    const [entry] = await listTrash()

    await restoreTrashEntry(entry.id!)

    expect((await getTask(id))?.deletedAt).toBe(0)
    expect(await listTrash()).toEqual([])
  })

  it('purgeTrashEntry deletes the row for real and unlinks it from any goal', async () => {
    const taskId = await createTask({ title: 't' })
    const goalId = await createGoal({ period: 'week', periodKey: '2026-W38', title: 'g' })
    await db.goals.update(goalId, { taskIds: [taskId] })
    await trashRows('tasks', [taskId], 'Tarea eliminada')
    const [entry] = await listTrash()

    await purgeTrashEntry(entry.id!)

    expect(await db.tasks.get(taskId)).toBeUndefined()
    expect((await db.goals.get(goalId))?.taskIds).toEqual([])
    expect(await listTrash()).toEqual([])
  })

  it('purgeTrashEntry on a goal promotes its children to root', async () => {
    const parentId = await createGoal({ period: 'week', periodKey: '2026-W38', title: 'parent' })
    const childId = await createGoal({ period: 'week', periodKey: '2026-W38', title: 'child', parentGoalId: parentId })
    await trashGoal(parentId)
    const [entry] = await listTrash()

    await purgeTrashEntry(entry.id!)

    expect(await db.goals.get(parentId)).toBeUndefined()
    expect((await db.goals.get(childId))?.parentGoalId).toBeUndefined()
  })

  it('purgeExpiredTrash purges only entries older than the retention window', async () => {
    const oldId = await createTask({ title: 'old' })
    const recentId = await createTask({ title: 'recent' })
    const now = 1_000_000_000_000
    await db.trash.add({ table: 'tasks', entityIds: [oldId], label: 'old', deletedAt: now - 31 * 86400000 })
    await db.trash.add({ table: 'tasks', entityIds: [recentId], label: 'recent', deletedAt: now - 1 * 86400000 })
    await db.tasks.update(oldId, { deletedAt: now - 31 * 86400000 })
    await db.tasks.update(recentId, { deletedAt: now - 1 * 86400000 })

    await purgeExpiredTrash(now, 30 * 86400000)

    expect(await db.tasks.get(oldId)).toBeUndefined()
    expect(await db.tasks.get(recentId)).not.toBeUndefined()
    expect((await listTrash()).map((e) => e.label)).toEqual(['recent'])
  })
})
