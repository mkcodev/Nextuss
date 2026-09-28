import { timeToMinutes } from '../../lib/dates'
import type { Task } from '../../db/types'

export type NowMode = 'current' | 'next' | 'pick'

/** Tarea en curso, si no la siguiente con hora de hoy y, sin ninguna con hora, la más prioritaria
 * sin franja: así el bloque «Ahora» siempre dice qué hacer aunque no se planifique por horas. */
export function pickNowTask(tasks: Task[], nowMin: number): { task: Task; mode: NowMode } | null {
  const open = tasks.filter((t) => t.status !== 'done' && !t.parentId)
  const slotted = open
    .filter((t) => t.scheduledStart && t.scheduledEnd)
    .sort((a, b) => a.scheduledStart!.localeCompare(b.scheduledStart!))
  const current = slotted.find(
    (t) => timeToMinutes(t.scheduledStart!) <= nowMin && nowMin < timeToMinutes(t.scheduledEnd!),
  )
  if (current) return { task: current, mode: 'current' }
  const next = slotted.find((t) => timeToMinutes(t.scheduledStart!) > nowMin)
  if (next) return { task: next, mode: 'next' }
  const loose = open
    .filter((t) => !t.scheduledStart)
    .sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5) || a.sortKey - b.sortKey)
  return loose[0] ? { task: loose[0], mode: 'pick' } : null
}
