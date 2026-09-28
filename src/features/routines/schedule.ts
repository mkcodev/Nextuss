// Cuándo "toca" una rutina: días de la semana + hora opcional. Puro, para testearlo con fechas fijas.
import type { Routine, RoutineRun } from '../../db/types'
import { timeToMinutes } from '../../lib/dates'

/** Margen alrededor de la hora de una rutina en el que Hoy la propone como "Rutina de ahora". */
export const ROUTINE_WINDOW_BEFORE_MIN = 15
export const ROUTINE_WINDOW_AFTER_MIN = 30

export function routineTotalMin(routine: Pick<Routine, 'steps'>): number {
  return routine.steps.reduce((sum, st) => sum + st.durationMin, 0)
}

export function isRoutineScheduledOn(routine: Pick<Routine, 'weekdays'>, date: Date): boolean {
  return routine.weekdays.length === 0 || routine.weekdays.includes(date.getDay())
}

/** Hecha en `runs` = alguna pasada de ese día llegó hasta el final (saltarse un paso no la deshace). */
export function isRoutineDone(routineId: number, runs: RoutineRun[]): boolean {
  return runs.some((r) => r.routineId === routineId && r.finished)
}

/** La rutina programada cuya ventana (hora - 15 min … fin + 30 min) contiene `now` y que aún no se
 * ha hecho hoy. Si se solapan varias, la que empieza antes. */
export function routineDueNow(routines: Routine[], runsToday: RoutineRun[], now: Date): Routine | null {
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const due = routines.filter((r) => {
    if (!r.startTime || r.steps.length === 0 || !isRoutineScheduledOn(r, now) || isRoutineDone(r.id!, runsToday)) {
      return false
    }
    const start = timeToMinutes(r.startTime)
    const end = start + routineTotalMin(r)
    return nowMin >= start - ROUTINE_WINDOW_BEFORE_MIN && nowMin <= end + ROUTINE_WINDOW_AFTER_MIN
  })
  due.sort((a, b) => timeToMinutes(a.startTime!) - timeToMinutes(b.startTime!))
  return due[0] ?? null
}

/** "25 min", "1 h", "1 h 20 min". */
export function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}
