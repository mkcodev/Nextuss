import { db } from '../schema'
import type { Task } from '../types'
import { unlinkTaskFromAllGoals } from './goals'

export function getTasksForDate(date: string) {
  return db.tasks.where('scheduledDate').equals(date).toArray()
}

export function getTasksForRange(startDate: string, endDate: string) {
  return db.tasks.where('scheduledDate').between(startDate, endDate, true, true).toArray()
}

/** Tasks with no time slot today: not scheduled anywhere, or due today but not yet placed on the timeline. */
export async function getUnscheduledTasks(today: string): Promise<Task[]> {
  const all = await db.tasks.toArray()
  return all.filter(
    (t) =>
      t.status !== 'done' &&
      !t.scheduledDate &&
      (t.status === 'planned' || t.dueDate === today || t.status === 'backlog'),
  )
}

export function getTask(id: number) {
  return db.tasks.get(id)
}

export async function createTask(
  input: Partial<Omit<Task, 'id' | 'createdAt' | 'postponedCount'>> & { title: string },
): Promise<number> {
  const id = (await db.tasks.add({
    status: 'planned',
    postponedCount: 0,
    createdAt: Date.now(),
    ...input,
  })) as number
  return id
}

export function updateTask(id: number, changes: Partial<Omit<Task, 'id'>>) {
  return db.tasks.update(id, changes)
}

export async function deleteTask(id: number) {
  await unlinkTaskFromAllGoals(id)
  await db.tasks.delete(id)
}

export function scheduleTask(
  id: number,
  scheduledDate: string,
  scheduledStart: string,
  scheduledEnd: string,
) {
  return db.tasks.update(id, { scheduledDate, scheduledStart, scheduledEnd, status: 'planned' })
}

export function unscheduleTask(id: number) {
  return db.tasks.update(id, {
    scheduledDate: undefined,
    scheduledStart: undefined,
    scheduledEnd: undefined,
  })
}

export const ZOMBIE_THRESHOLD = 3

/** Tasks scheduled before `today` that are still open — surfaced so they don't silently rot on a past day. */
export async function getOverdueTasks(today: string): Promise<Task[]> {
  const all = await db.tasks.toArray()
  return all
    .filter((t) => t.status !== 'done' && t.scheduledDate && t.scheduledDate < today)
    .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''))
}

/** Moves an overdue task to today, clearing its old time slot and counting the postponement. */
export async function carryOverToToday(id: number, today: string) {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, {
    scheduledDate: today,
    scheduledStart: undefined,
    scheduledEnd: undefined,
    postponedCount: task.postponedCount + 1,
  })
}

/** Non-done tasks, most recently scheduled/created first — used by the focus timer's task picker. */
export async function listActiveTasks(): Promise<Task[]> {
  const all = await db.tasks.where('status').notEqual('done').toArray()
  return all.sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? '') || b.createdAt - a.createdAt).slice(0, 50)
}

export async function addActualMinutes(id: number, minutes: number) {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, { actualMin: (task.actualMin ?? 0) + minutes })
}

export async function toggleTaskDone(id: number) {
  const task = await db.tasks.get(id)
  if (!task) return
  const done = task.status !== 'done'
  await db.tasks.update(id, { status: done ? 'done' : 'planned', completedAt: done ? Date.now() : undefined })
}
