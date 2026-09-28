// Rutinas (Fase 28): CRUD con papelera y orden manual (mismo patrón que `habits.ts`), más el registro
// de pasadas (`routineRuns`) que alimenta "hecha hoy" en la lista y la tarjeta de Hoy.
import { db } from '../schema'
import type { Routine, RoutineRun } from '../types'
import { trashRows } from '../trash'

export type RoutineInput = Pick<Routine, 'name' | 'icon' | 'color' | 'steps' | 'startTime' | 'weekdays'>

export async function listRoutines(): Promise<Routine[]> {
  const rows = await db.routines.where('deletedAt').equals(0).toArray()
  return rows.sort((a, b) => a.sortKey - b.sortKey)
}

export async function getRoutine(id: number): Promise<Routine | null> {
  const routine = await db.routines.get(id)
  return routine && routine.deletedAt === 0 ? routine : null
}

export async function createRoutine(input: RoutineInput): Promise<number> {
  const now = Date.now()
  return (await db.routines.add({ ...input, createdAt: now, deletedAt: 0, sortKey: now })) as number
}

export function updateRoutine(id: number, changes: Partial<RoutineInput>) {
  return db.routines.update(id, changes)
}

/** Reordena una rutina entre sus dos vecinos actuales (mismo patrón que `moveHabitBetween`). */
export function moveRoutineBetween(id: number, beforeSortKey: number | null, afterSortKey: number | null) {
  let sortKey: number
  if (beforeSortKey == null && afterSortKey == null) sortKey = Date.now()
  else if (beforeSortKey == null) sortKey = afterSortKey! - 1000
  else if (afterSortKey == null) sortKey = beforeSortKey + 1000
  else sortKey = (beforeSortKey + afterSortKey) / 2
  return db.routines.update(id, { sortKey })
}

/** A la papelera; sus pasadas se quedan hasta que la papelera la purgue de verdad. */
export async function trashRoutine(id: number): Promise<void> {
  const routine = await db.routines.get(id)
  if (!routine) return
  await trashRows('routines', [id], `Rutina eliminada: "${routine.name}"`)
}

export async function logRoutineRun(run: Omit<RoutineRun, 'id'>): Promise<number> {
  return (await db.routineRuns.add(run)) as number
}

/** Pasadas de un día, de todas las rutinas: una sola consulta indexada para la lista y la tarjeta de Hoy. */
export function getRoutineRunsForDate(date: string): Promise<RoutineRun[]> {
  return db.routineRuns.where('date').equals(date).toArray()
}
