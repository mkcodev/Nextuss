import { addDays, differenceInCalendarDays, format, getDay, getISOWeek, getISOWeekYear, subDays } from 'date-fns'
import type { Habit } from '../db/types'

/** 'YYYY-MM-DD' for a given date, defaults to today. Used as the DB key for daily records. */
export function dateKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM-dd')
}

export function todayKey(): string {
  return dateKey(new Date())
}

/** Parses a 'YYYY-MM-DD' key as a local-midnight Date (unlike `new Date(str)`, which treats it as UTC). */
export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Fecha destino de "Mañana" (+1) / "Próxima semana" (+7): suma `days` a la fecha actual de la tarea
 * si es futura, para que pulsar de nuevo avance otro paso; sin fecha o en el pasado/hoy parte de hoy.
 */
export function nextRelativeDate(current: string | null | undefined, today: string, days: number): string {
  const base = current && current > today ? current : today
  return dateKey(addDays(parseDateKey(base), days))
}

/** `key` menos `n` días, como clave. */
export function subDaysKey(key: string, n: number): string {
  return dateKey(subDays(parseDateKey(key), n))
}

export function monthKey(date: Date = new Date()): string {
  return format(date, 'yyyy-MM')
}

export function weekKey(date: Date = new Date()): string {
  return `${getISOWeekYear(date)}-W${String(getISOWeek(date)).padStart(2, '0')}`
}

/** Sunday=0 .. Saturday=6, matching Habit.weekdays. */
export function weekdayOf(date: Date = new Date()): number {
  return getDay(date)
}

/** Pausa (rango) o día suelto exento — ninguno cuenta como programado, así que ninguno rompe racha. */
function isPausedOn(habit: Habit, key: string): boolean {
  if (habit.pausedFrom && habit.pausedUntil && key >= habit.pausedFrom && key <= habit.pausedUntil) return true
  return habit.skipDates?.includes(key) ?? false
}

/**
 * ¿Toca este hábito en `date`? `schedule === undefined` (o `type: 'weekdays'`) reproduce el
 * comportamiento histórico byte a byte contra `habit.weekdays`, así que cualquier sitio que
 * siga sin conocer `schedule` sigue funcionando igual. Para `timesPerWeek`/`timesPerMonth` —
 * conteo por periodo, no por día — siempre es "elegible" (se puede registrar cualquier día); el
 * cumplimiento real de esos tipos vive en `calculatePeriodStreak`/`buildHabitMatrix`, no aquí.
 */
export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  const key = dateKey(date)
  if (isPausedOn(habit, key)) return false

  const schedule = habit.schedule
  if (!schedule || schedule.type === 'weekdays') {
    const weekdays = schedule?.weekdays ?? habit.weekdays
    if (!weekdays || weekdays.length === 0) return true
    return weekdays.includes(weekdayOf(date))
  }

  switch (schedule.type) {
    case 'everyNDays': {
      const diff = differenceInCalendarDays(date, parseDateKey(schedule.anchorDate))
      return diff >= 0 && diff % Math.max(1, schedule.interval) === 0
    }
    case 'monthDays':
      return schedule.days.includes(date.getDate())
    case 'timesPerWeek':
    case 'timesPerMonth':
      return true
  }
}

/** "X veces por semana/mes": no es un predicado por día, así que no cuenta en tallies día a día
 * (`aggregate.ts`) — su cumplimiento vive en `calculatePeriodStreak`/`buildHabitMatrix`. */
export function isPeriodicHabit(habit: Habit): boolean {
  return habit.schedule?.type === 'timesPerWeek' || habit.schedule?.type === 'timesPerMonth'
}

/** Etiqueta corta en español para el resumen del calendario de un hábito (HabitForm, HabitsPage). */
export function describeHabitSchedule(habit: Habit): string {
  const schedule = habit.schedule
  if (!schedule || schedule.type === 'weekdays') {
    const weekdays = schedule?.weekdays ?? habit.weekdays
    if (!weekdays || weekdays.length === 0) return 'Todos los días'
    return weekdays.map((d) => WEEKDAY_LABELS_ES[d]).join(' ')
  }
  switch (schedule.type) {
    case 'everyNDays':
      return `Cada ${schedule.interval} día${schedule.interval === 1 ? '' : 's'}`
    case 'timesPerWeek':
      return `${schedule.times}×/semana`
    case 'timesPerMonth':
      return `${schedule.times}×/mes`
    case 'monthDays':
      return `Día${schedule.days.length === 1 ? '' : 's'} ${schedule.days.slice().sort((a, b) => a - b).join(', ')} del mes`
  }
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, totalMinutes)
  const h = Math.floor(clamped / 60) % 24
  const m = Math.round(clamped % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const WEEKDAY_LABELS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const WEEKDAY_LABELS_ES_FULL = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

const SHORT_DATE = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const SHORT_DATE_YEAR = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', year: 'numeric' })

/** 'YYYY-MM-DD' → "1 abr" (o "1 abr 2025" si no es del año en curso). Para tablas y listas, en vez
 *  de mostrar la clave ISO cruda. */
export function formatShortDate(key: string, today: string = todayKey()): string {
  const date = parseDateKey(key)
  const sameYear = key.slice(0, 4) === today.slice(0, 4)
  return (sameYear ? SHORT_DATE : SHORT_DATE_YEAR).format(date).replace('.', '')
}

/** Orden de los días en los selectores (España): lunes primero. Valores 0-6 como `Date.getDay()`. */
export const WEEKDAY_ORDER_MON_FIRST = [1, 2, 3, 4, 5, 6, 0] as const
