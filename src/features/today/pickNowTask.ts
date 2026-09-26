import { timeToMinutes } from '../../lib/dates'
import type { Task } from '../../db/types'

/** Tarea en curso ahora mismo o, si no hay, la siguiente con hora de hoy. Solo tareas raíz con franja. */
export function pickNowTask(tasks: Task[], nowMin: number): { task: Task; current: boolean } | null {
  const slotted = tasks
    .filter((t) => t.status !== 'done' && !t.parentId && t.scheduledStart && t.scheduledEnd)
    .sort((a, b) => a.scheduledStart!.localeCompare(b.scheduledStart!))
  const current = slotted.find(
    (t) => timeToMinutes(t.scheduledStart!) <= nowMin && nowMin < timeToMinutes(t.scheduledEnd!),
  )
  if (current) return { task: current, current: true }
  const next = slotted.find((t) => timeToMinutes(t.scheduledStart!) > nowMin)
  return next ? { task: next, current: false } : null
}
