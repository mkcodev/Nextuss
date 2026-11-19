// Vista Horizonte (#191): cada reto es una barra sobre un eje de fechas. Aquí está la geometría en
// porcentajes, sin DOM, para probarla aparte. Todo son claves de día ('YYYY-MM-DD').
import { differenceInCalendarDays } from 'date-fns'
import type { Challenge, ChallengeDay, ChallengeDayState } from '../../db/types'
import { parseDateKey } from '../dates'
import { addDaysKey } from './dayRange'

/** Margen a cada lado del conjunto de retos, y lo mínimo que se ve por detrás y por delante de hoy. */
const PAD_DAYS = 4
const MIN_BEHIND = 7
const MIN_AHEAD = 14
/** Una marca del eje no se pinta a menos de estos días de «hoy»: la taparía su etiqueta. */
const TICK_CLEARANCE = 4

export const daysBetween = (from: string, to: string): number => differenceInCalendarDays(parseDateKey(to), parseDateKey(from))

export interface HorizonRange {
  /** Primer día del eje. */
  start: string
  /** Último día del eje. */
  end: string
  /** Días del eje, extremos incluidos. */
  total: number
}

type Dates = Pick<Challenge, 'startDate' | 'endDate'>

/** El eje cubre todos los retos y, como mínimo, una semana atrás y dos por delante de hoy. */
export function horizonRange(items: readonly Dates[], today: string): HorizonRange {
  let start = addDaysKey(today, -MIN_BEHIND)
  let end = addDaysKey(today, MIN_AHEAD)
  for (const c of items) {
    if (c.startDate < start) start = c.startDate
    if (c.endDate > end) end = c.endDate
  }
  start = addDaysKey(start, -PAD_DAYS)
  end = addDaysKey(end, PAD_DAYS)
  return { start, end, total: daysBetween(start, end) + 1 }
}

/** Posición (0 a 100) del comienzo del día `key`. */
export const leftPct = (r: HorizonRange, key: string): number => (daysBetween(r.start, key) / r.total) * 100
/** Ancho (0 a 100) de `days` días. */
export const widthPct = (r: HorizonRange, days: number): number => (days / r.total) * 100
/** Posición del centro del día `key`: donde va la línea de «hoy». */
export const centerPct = (r: HorizonRange, key: string): number => ((daysBetween(r.start, key) + 0.5) / r.total) * 100

export interface HorizonTick {
  key: string
  /** Posición, 0 a 100. */
  left: number
  /** `true` el día 1 (se pinta más fuerte), `false` el 15. */
  month: boolean
}

/** Marcas del eje: los días 1 y 15 de cada mes, salvo los pegados a «hoy». */
export function horizonTicks(r: HorizonRange, today: string): HorizonTick[] {
  const ticks: HorizonTick[] = []
  for (let i = 0; i < r.total; i++) {
    const key = addDaysKey(r.start, i)
    const day = key.slice(8)
    if ((day === '01' || day === '15') && Math.abs(daysBetween(today, key)) > TICK_CLEARANCE) {
      ticks.push({ key, left: leftPct(r, key), month: day === '01' })
    }
  }
  return ticks
}

export interface BarInput {
  status: Challenge['status']
  /** Días del reto (con los de pausa que lo alargaron). */
  totalDays: number
  /** «Día N de M»: entre 0 y M. */
  dayIndex: number
  todayState: ChallengeDayState | null
  /** Cuántos días tienen fila. */
  rowCount: number
}

/** Días ya recorridos, para el relleno de la barra: los pasados más hoy si ya está resuelto. Un reto
 * cumplido va lleno; uno abandonado se queda en los días que llegó a registrar. */
export function elapsedDays(b: BarInput): number {
  if (b.status === 'done') return b.totalDays
  if (b.status === 'abandoned' || b.status === 'expired') return Math.min(b.totalDays, b.rowCount)
  return Math.min(b.totalDays, Math.max(0, b.dayIndex - 1) + (b.todayState !== null ? 1 : 0))
}

export interface BarMark {
  date: string
  state: 'shield' | 'skip' | 'fail'
  /** Posición dentro de la barra, 0 a 100. */
  left: number
}

/** Marcas sobre la barra: un escudo, un «Hoy no» o un fallo en el centro de su día. */
export function barMarks(challenge: Dates, days: readonly ChallengeDay[], totalDays: number): BarMark[] {
  const marks: BarMark[] = []
  for (const d of days) {
    if (d.state !== 'shield' && d.state !== 'skip' && d.state !== 'fail') continue
    const left = ((daysBetween(challenge.startDate, d.date) + 0.5) / totalDays) * 100
    if (left > 0 && left < 100) marks.push({ date: d.date, state: d.state, left })
  }
  return marks
}
