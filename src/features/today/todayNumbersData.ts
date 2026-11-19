import { addDays, format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { dateKey, parseDateKey } from '../../lib/dates'
import { XP_PER_COMPLETION } from '../../lib/xp'
import type { FocusSession, HabitLog, Task } from '../../db/types'

/** Lógica pura de «Tu día en números» (Hoy). Agrupa por día igual que las estadísticas
 *  (`buildDailySeries`): una sesión cuenta en el día local de su `start` y suma su `durationMin`. */

export interface FocusDay {
  date: string
  /** «Lun», «Mar»… o «Hoy». */
  label: string
  minutes: number
  isToday: boolean
}

export interface FocusSummary {
  /** Los 7 días que pintan las barras, de hace 6 días a hoy. */
  days: FocusDay[]
  todayMin: number
  /** Media de los 7 días ANTERIORES a hoy (sin hoy). Los días sin sesiones cuentan como 0. */
  avgPrevMin: number
}

/** Rango de lectura en epoch ms, inclusivo en los dos extremos como `getFocusSessionsInRange`:
 *  desde las 00:00 locales de hace 7 días hasta el último milisegundo de hoy. */
export function focusRangeFor(today: string): { fromTs: number; toTs: number } {
  const day = parseDateKey(today)
  return { fromTs: subDays(day, 7).getTime(), toTs: addDays(day, 1).getTime() - 1 }
}

function weekdayLabel(key: string): string {
  const raw = format(parseDateKey(key), 'EEE', { locale: es }).replace('.', '')
  return raw.charAt(0).toUpperCase() + raw.slice(1)
}

export function summarizeFocus(sessions: FocusSession[], today: string): FocusSummary {
  const byDay = new Map<string, number>()
  for (const s of sessions) {
    const key = dateKey(new Date(s.start))
    byDay.set(key, (byDay.get(key) ?? 0) + (s.durationMin ?? 0))
  }
  const base = parseDateKey(today)
  const minutesOn = (offset: number) => byDay.get(dateKey(subDays(base, offset))) ?? 0

  const days: FocusDay[] = []
  for (let offset = 6; offset >= 0; offset--) {
    const key = dateKey(subDays(base, offset))
    days.push({ date: key, label: offset === 0 ? 'Hoy' : weekdayLabel(key), minutes: minutesOn(offset), isToday: offset === 0 })
  }
  let prevTotal = 0
  for (let offset = 1; offset <= 7; offset++) prevTotal += minutesOn(offset)

  return { days, todayMin: minutesOn(0), avgPrevMin: prevTotal / 7 }
}

/** Frase neutra que compara hoy con la media de los 7 días anteriores. */
export function focusComparison(todayMin: number, avgPrevMin: number): string {
  if (todayMin === 0) return 'Aún sin foco hoy'
  const diff = Math.round(todayMin - avgPrevMin)
  if (diff === 0) return 'En tu media de 7 días'
  return diff > 0 ? `+${diff} min sobre tu media` : `${-diff} min bajo tu media`
}

/** XP ganada hoy: la `xpAwarded` de las tareas completadas hoy más `XP_PER_COMPLETION` por cada
 *  registro de hábito cumplido hoy (lo que suma `logHabit`, también en hábitos periódicos). No entra
 *  la XP de objetivos ni de Virtualización, que no deja rastro por día. */
export function xpEarnedToday(tasksCompleted: Pick<Task, 'xpAwarded'>[], habitLogs: Pick<HabitLog, 'completed'>[]): number {
  const fromTasks = tasksCompleted.reduce((sum, t) => sum + (t.xpAwarded ?? 0), 0)
  return fromTasks + habitLogs.filter((l) => l.completed).length * XP_PER_COMPLETION
}

/** Tareas del día (sin subtareas): cuántas hechas de cuántas. */
export function countTasks(tasks: Pick<Task, 'status' | 'parentId'>[]): { done: number; total: number } {
  const top = tasks.filter((t) => !t.parentId)
  return { done: top.filter((t) => t.status === 'done').length, total: top.length }
}
