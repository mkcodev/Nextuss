// Lecturas crudas por rango de fechas para las estadísticas — una consulta indexada por tabla,
// sin lógica de agregación (eso vive en `src/features/stats/aggregate.ts`). Evita el N+1 que ya
// tiene `useHabitsWithStats.ts` (una consulta por hábito y por día), inviable para un año de datos.
import { addDays } from 'date-fns'
import { db } from '../schema'
import { parseDateKey } from '../../lib/dates'
import type { Achievement, CheckIn, FocusSession, Goal, HabitLog, Task } from '../types'
import { getCheckInsForRange } from './checkins'

function startOfDayTs(dateKeyStr: string): number {
  return parseDateKey(dateKeyStr).getTime()
}

/** Límite superior exclusivo: el instante justo después del final del día `to`. */
function endOfDayExclusiveTs(dateKeyStr: string): number {
  return addDays(parseDateKey(dateKeyStr), 1).getTime()
}

/** Logs de hábitos con `date` en [from, to] (inclusive, 'YYYY-MM-DD'). */
export function getHabitLogsInRange(from: string, to: string): Promise<HabitLog[]> {
  return db.habitLogs.where('date').between(from, to, true, true).toArray()
}

/** Tareas cuyo `completedAt` cae dentro del rango de días [from, to]. */
export function getTasksCompletedInRange(from: string, to: string): Promise<Task[]> {
  return db.tasks
    .where('completedAt')
    .between(startOfDayTs(from), endOfDayExclusiveTs(to), true, false)
    .toArray()
}

/** Tareas cuyo `createdAt` cae dentro del rango de días [from, to] (completadas o no). */
export function getTasksCreatedInRange(from: string, to: string): Promise<Task[]> {
  return db.tasks
    .where('createdAt')
    .between(startOfDayTs(from), endOfDayExclusiveTs(to), true, false)
    .toArray()
}

/** Sesiones de foco cuyo `start` (epoch ms) cae en [fromTs, toTs]. */
export function getFocusSessionsInRange(fromTs: number, toTs: number): Promise<FocusSession[]> {
  return db.focusSessions.where('start').between(fromTs, toTs, true, true).toArray()
}

/** Check-ins con `date` en [from, to] (inclusive). Delegado a `checkins.ts`, que es su dueño. */
export function getCheckInsInRange(from: string, to: string): Promise<CheckIn[]> {
  return getCheckInsForRange(from, to)
}

/**
 * Objetivos activos en el rango: creados o completados dentro de él. La tabla de objetivos es
 * pequeña (decenas/cientos de filas, no una por día), así que un filtro en memoria sobre
 * `toArray()` es más simple que mantener un índice de rango dedicado y no reintroduce el N+1 que
 * este módulo existe para evitar.
 */
export async function getGoalsInRange(from: string, to: string): Promise<Goal[]> {
  const fromTs = startOfDayTs(from)
  const toTs = endOfDayExclusiveTs(to)
  const inRange = (ts: number) => ts >= fromTs && ts < toTs
  const all = await db.goals.toArray()
  return all.filter((g) => inRange(g.createdAt) || (g.completedAt != null && inRange(g.completedAt)))
}

/** Logros desbloqueados en el rango de días [from, to]. */
export function getAchievementsInRange(from: string, to: string): Promise<Achievement[]> {
  return db.achievements
    .where('unlockedAt')
    .between(startOfDayTs(from), endOfDayExclusiveTs(to), true, false)
    .toArray()
}
