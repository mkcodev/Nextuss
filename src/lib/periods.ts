// Helpers de periodo ('week' | 'month' + su periodKey 'YYYY-Www' | 'YYYY-MM'). Nacieron en
// features/planner/goalProgress.ts junto a los objetivos, pero dejaron de ser cosa del planner en
// cuanto las estadísticas (Fase 4) también necesitan resolver/recorrer rangos de periodos.
import { addMonths, addWeeks, endOfISOWeek, endOfMonth, startOfISOWeek } from 'date-fns'
import { dateKey, monthKey, weekKey } from './dates'
import type { GoalPeriod } from '../db/types'

/** Inverso de `weekKey`/`monthKey` en `src/lib/dates.ts` — debe mantenerse en sincronía con ellas. */
export function parsePeriodKey(period: GoalPeriod, key: string): Date {
  if (period === 'month') {
    const [year, month] = key.split('-').map(Number)
    return new Date(year, month - 1, 1)
  }
  const [yearStr, weekStr] = key.split('-W')
  const isoYear = Number(yearStr)
  const isoWeek = Number(weekStr)
  // El 4 de enero siempre cae en la semana ISO 1 de su año ISO, igual que getISOWeek/getISOWeekYear.
  const week1Start = startOfISOWeek(new Date(isoYear, 0, 4))
  return addWeeks(week1Start, isoWeek - 1)
}

export function shiftPeriodKey(period: GoalPeriod, key: string, delta: number): string {
  const date = parsePeriodKey(period, key)
  const shifted = period === 'week' ? addWeeks(date, delta) : addMonths(date, delta)
  return period === 'week' ? weekKey(shifted) : monthKey(shifted)
}

export function previousPeriodKey(period: GoalPeriod, key: string): string {
  return shiftPeriodKey(period, key, -1)
}

export function nextPeriodKey(period: GoalPeriod, key: string): string {
  return shiftPeriodKey(period, key, 1)
}

/** ['YYYY-MM-DD' from, to] (inclusive) del periodo natural — para informes navegables por semana/mes. */
export function periodDateRange(period: GoalPeriod, periodKey: string): { from: string; to: string } {
  const start = parsePeriodKey(period, periodKey)
  const end = period === 'week' ? endOfISOWeek(start) : endOfMonth(start)
  return { from: dateKey(start), to: dateKey(end) }
}

/** 0..1 progreso a través del periodo natural, acotado — usado por la heurística "en riesgo". */
export function periodElapsedRatio(period: GoalPeriod, periodKey: string, now: Date = new Date()): number {
  const start = parsePeriodKey(period, periodKey)
  const end = period === 'week' ? endOfISOWeek(start) : endOfMonth(start)
  const totalMs = end.getTime() - start.getTime()
  if (totalMs <= 0) return 1
  const elapsedMs = now.getTime() - start.getTime()
  return Math.max(0, Math.min(1, elapsedMs / totalMs))
}

/**
 * Como `periodElapsedRatio`, pero mide desde lo que sea más tardío: el inicio del periodo o la
 * fecha de creación de `createdAt`. Algo creado a mitad de un mes/semana no ha "perdido" los días
 * previos a su existencia, así que no debería nacer ya "en riesgo".
 */
export function goalElapsedRatio(
  period: GoalPeriod,
  periodKey: string,
  createdAt: number,
  now: Date = new Date(),
): number {
  const periodStart = parsePeriodKey(period, periodKey)
  const periodEnd = period === 'week' ? endOfISOWeek(periodStart) : endOfMonth(periodStart)
  const effectiveStart = Math.max(periodStart.getTime(), createdAt)
  const totalMs = periodEnd.getTime() - effectiveStart
  if (totalMs <= 0) return 1
  return Math.max(0, Math.min(1, (now.getTime() - effectiveStart) / totalMs))
}
