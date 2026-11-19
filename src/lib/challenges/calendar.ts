// Lo que pintan las vistas de un reto propio, calculado aparte para poder probarlo: el estado visual de
// cada día, la tira de los últimos 7 días, el calendario por semanas, el registro y el motivo por el que
// hoy no se puede marcar. Funciones puras sobre claves de día ('YYYY-MM-DD').
import type { Challenge, ChallengeDay, ChallengeDayState } from '../../db/types'
import { parseDateKey } from '../dates'
import { addDaysKey, eachDayKey } from './dayRange'

/** Estado de un día para dibujarlo: los de la base más los que no tienen fila.
 *  - `today`: hoy, sin marcar · `upcoming`: por llegar · `open`: pasado aún sin cerrar (la
 *    reconciliación lo cierra con un escudo o un fallo) · `out`: fuera de las fechas del reto. */
export type DayVisual = ChallengeDayState | 'today' | 'upcoming' | 'open' | 'out'

/** Texto de cada estado, para lectores de pantalla, `title` y la leyenda. */
export const DAY_LABEL: Record<DayVisual, string> = {
  done: 'Hecho',
  shield: 'Cubierto por un escudo',
  skip: '«Hoy no», con escudo',
  fail: 'Fallado, sin escudos',
  pause: 'En pausa',
  today: 'Hoy, sin marcar',
  upcoming: 'Por llegar',
  open: 'Sin registrar',
  out: 'Fuera del reto',
}

type Range = Pick<Challenge, 'startDate' | 'endDate'>

export function indexDays(days: readonly ChallengeDay[]): Map<string, ChallengeDay> {
  return new Map(days.map((d) => [d.date, d]))
}

export function dayVisual(date: string, today: string, range: Range, byDate: ReadonlyMap<string, ChallengeDay>): DayVisual {
  if (date < range.startDate || date > range.endDate) return 'out'
  const row = byDate.get(date)
  if (row) return row.state
  if (date === today) return 'today'
  return date > today ? 'upcoming' : 'open'
}

export interface DayCell {
  date: string
  visual: DayVisual
  isToday: boolean
}

/** Los últimos `count` días hasta hoy (o hasta el último día del reto, si ya terminó). */
export function lastDays(range: Range, byDate: ReadonlyMap<string, ChallengeDay>, today: string, count = 7): DayCell[] {
  const end = today <= range.endDate ? today : range.endDate
  return Array.from({ length: count }, (_, i) => {
    const date = addDaysKey(end, i - (count - 1))
    return { date, visual: dayVisual(date, today, range, byDate), isToday: date === today }
  })
}

export interface CalendarWeek {
  /** Mes («nov») en la primera semana y en la que trae un día 1; vacío en el resto. */
  label: string
  /** Siete huecos, lunes a domingo; `null` donde el reto aún no empezó o ya terminó. */
  cells: (DayCell | null)[]
}

const MONTH = new Intl.DateTimeFormat('es', { month: 'short' })
const DAY_MONTH = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short' })
const WEEKDAY_DAY = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric' })

const monthLabel = (key: string) => MONTH.format(parseDateKey(key)).replace('.', '')

/** «19 nov». */
export const formatDayMonth = (key: string): string => DAY_MONTH.format(parseDateKey(key)).replace('.', '')
/** «jue 19». */
export const formatWeekdayDay = (key: string): string => WEEKDAY_DAY.format(parseDateKey(key)).replace('.', '')

/** El calendario del reto por semanas, de lunes a domingo, desde su primer hasta su último día. */
export function calendarWeeks(range: Range, byDate: ReadonlyMap<string, ChallengeDay>, today: string): CalendarWeek[] {
  const keys = eachDayKey(range.startDate, range.endDate)
  if (keys.length === 0) return []
  const lead = (parseDateKey(range.startDate).getDay() + 6) % 7
  const slots: (string | null)[] = [...Array<null>(lead).fill(null), ...keys]
  while (slots.length % 7 !== 0) slots.push(null)

  const weeks: CalendarWeek[] = []
  for (let i = 0; i < slots.length; i += 7) {
    const row = slots.slice(i, i + 7)
    const real = row.filter((k): k is string => k !== null)
    const firstOfMonth = real.find((k) => k.endsWith('-01'))
    const label = i === 0 ? monthLabel(real[0]) : firstOfMonth ? monthLabel(firstOfMonth) : ''
    weeks.push({
      label,
      cells: row.map((k) => (k === null ? null : { date: k, visual: dayVisual(k, today, range, byDate), isToday: k === today })),
    })
  }
  return weeks
}

export interface LogEntry {
  date: string
  state: ChallengeDayState
}

/** Registro de la ficha: los últimos 3 días con fila más todos los de escudo, «Hoy no» y fallo, del más
 * reciente al más antiguo y con un máximo de `limit`. */
export function logEntries(days: readonly ChallengeDay[], today: string, limit = 6): LogEntry[] {
  const since = addDaysKey(today, -2)
  return [...days]
    .filter((d) => d.date >= since || d.state === 'shield' || d.state === 'skip' || d.state === 'fail')
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
    .map((d) => ({ date: d.date, state: d.state }))
}

/** Por qué hoy no se puede marcar (los mismos casos que rechaza el repositorio), o `null` si se puede. */
export function markReason(challenge: Pick<Challenge, 'status' | 'pausedSince' | 'startDate' | 'endDate'>, today: string): string | null {
  const paused = challenge.status === 'paused' && challenge.pausedSince !== undefined && challenge.pausedSince <= today
  if (challenge.status === 'paused' && paused) return 'El reto está en pausa. Reanúdalo para marcar hoy.'
  if (challenge.status !== 'active' && challenge.status !== 'paused') return 'Este reto ya no admite marcar días.'
  if (today < challenge.startDate) return 'Aún no ha empezado.'
  if (today > challenge.endDate) return 'Hoy ya está fuera de las fechas del reto.'
  return null
}

/** «1 día», «30 días». */
export const daysText = (n: number): string => `${n} ${n === 1 ? 'día' : 'días'}`

/** Todos los días del reto, de su primer a su último día: la cadena de la vista Cadena. */
export function chainCells(range: Range, byDate: ReadonlyMap<string, ChallengeDay>, today: string): DayCell[] {
  return eachDayKey(range.startDate, range.endDate).map((date) => ({ date, visual: dayVisual(date, today, range, byDate), isToday: date === today }))
}

/** Columnas de la cadena: una sola fila hasta 21 días y, a partir de ahí, filas de unos 22 días
 * repartidas por igual (66 días = 3 filas de 22; 30 días = 2 de 15). */
export function chainColumns(totalDays: number): number {
  return totalDays <= 21 ? Math.max(1, totalDays) : Math.ceil(totalDays / Math.ceil(totalDays / 22))
}

const CHAIN_PARTS: [DayVisual, string][] = [
  ['done', 'Hechos'],
  ['shield', 'Con escudo'],
  ['skip', '«Hoy no»'],
  ['fail', 'Fallados'],
  ['pause', 'En pausa'],
  ['today', 'Hoy sin marcar'],
  ['open', 'Sin registrar'],
  ['upcoming', 'Por llegar'],
]

/** Texto de la cadena para lectores de pantalla: la cadena se pinta como una imagen y esto la cuenta
 * («Cadena de 30 días. Hechos: 22. Con escudo: 1. Por llegar: 7.»). El día a día está en la ficha. */
export function chainSummary(cells: readonly DayCell[]): string {
  const parts = CHAIN_PARTS.flatMap(([visual, label]) => {
    const n = cells.filter((c) => c.visual === visual).length
    return n > 0 ? [`${label}: ${n}.`] : []
  })
  return [`Cadena de ${daysText(cells.length)}.`, ...parts].join(' ')
}
