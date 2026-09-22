import { format, getDay, getISOWeek, getISOWeekYear } from 'date-fns'
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

export function isHabitScheduledOn(habit: Habit, date: Date): boolean {
  if (!habit.weekdays || habit.weekdays.length === 0) return true
  return habit.weekdays.includes(weekdayOf(date))
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
