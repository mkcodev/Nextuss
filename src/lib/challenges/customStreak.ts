// Retos propios (#191): racha, escudos y cierre de días. Funciones puras, sin Dexie ni reloj: todo lo
// que dependa de «hoy» entra por parámetro.
import type { Challenge, ChallengeDay, ChallengeDayState } from '../../db/types'
import { challengePerfectBonus } from '../xp'
import { parseDateKey } from '../dates'
import { differenceInCalendarDays } from 'date-fns'
import { shieldsLeft, type CustomChallengeParams } from './custom'
import { addDaysKey, eachDayKey } from './dayRange'

export type DayCounts = Record<ChallengeDayState, number>

export interface CustomSummary {
  currentStreak: number
  bestStreak: number
  shieldsLeft: number
  counts: DayCounts
  /** Hechos entre los días que pedían algo (hecho, escudo, «Hoy no» y fallo). 0 si aún no hay ninguno. */
  compliance: number
  /** «Día N de M»: N entre 0 (aún no empieza) y M; M ya incluye los días de pausa que alargaron el reto. */
  dayIndex: number
  totalDays: number
  /** Estado de la fila de hoy, o `null` si hoy no está marcado. */
  todayState: ChallengeDayState | null
}

const byDate = (a: { date: string }, b: { date: string }) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)

export function emptyCounts(): DayCounts {
  return { done: 0, shield: 0, skip: 0, fail: 0, pause: 0 }
}

/** Racha actual y mejor, recorriendo solo las filas escritas: hecho suma, escudo, «Hoy no» y pausa
 * conservan la racha sin alargarla (como en `calculateStreak` de hábitos) y el fallo la deja en 0.
 * Un día sin fila (hoy sin marcar, o un pasado aún sin reconciliar) no rompe nada. */
export function summarizeCustom(
  challenge: Pick<Challenge, 'startDate' | 'endDate'>,
  params: CustomChallengeParams,
  days: readonly ChallengeDay[],
  today: string,
): CustomSummary {
  const counts = emptyCounts()
  let current = 0
  let best = 0
  for (const day of [...days].sort(byDate)) {
    counts[day.state] += 1
    if (day.state === 'done') {
      current += 1
      best = Math.max(best, current)
    } else if (day.state === 'fail') {
      current = 0
    }
  }
  const asked = counts.done + counts.shield + counts.skip + counts.fail
  const totalDays = eachDayKey(challenge.startDate, challenge.endDate).length
  const sinceStart = differenceInCalendarDays(parseDateKey(today), parseDateKey(challenge.startDate)) + 1
  return {
    currentStreak: current,
    bestStreak: best,
    shieldsLeft: shieldsLeft(params, days),
    counts,
    compliance: asked === 0 ? 0 : counts.done / asked,
    dayIndex: Math.max(0, Math.min(totalDays, sinceStart)),
    totalDays,
    todayState: days.find((d) => d.date === today)?.state ?? null,
  }
}

export interface Reconciliation {
  /** Filas de día a insertar, en orden cronológico. */
  add: { date: string; state: 'shield' | 'fail' | 'pause' }[]
  /** `endDate` resultante: un día más por cada día en pausa escrito. */
  endDate: string
  /** Presente si el reto termina ahora. `bonus` es 0 si no fue `perfect`. */
  finish?: { perfect: boolean; bonus: number }
}

/** Cierra los días pasados de un reto propio que no tienen fila. Recorre cada día sin fila entre el
 * inicio y `min(endDate, ayer)` en orden cronológico, así que tras varios días sin abrir la app los
 * escudos se gastan primero en los días más antiguos:
 *  - en pausa → `pause` y el reto se alarga un día;
 *  - si quedan escudos → `shield`;
 *  - si no → `fail`.
 * Al pasar `endDate` (y solo si no está en pausa) el reto termina; es `perfect` si no tuvo ningún
 * fallo. Es idempotente: una segunda llamada con las filas ya escritas no devuelve nada que añadir. */
export function reconcileCustom(
  challenge: Pick<Challenge, 'startDate' | 'endDate' | 'status' | 'pausedSince'>,
  params: CustomChallengeParams,
  days: readonly ChallengeDay[],
  today: string,
): Reconciliation {
  const existing = new Set(days.map((d) => d.date))
  let left = shieldsLeft(params, days)
  let endDate = challenge.endDate
  let failed = days.some((d) => d.state === 'fail')
  const yesterday = addDaysKey(today, -1)
  const pausedSince = challenge.status === 'paused' ? challenge.pausedSince : undefined
  const add: Reconciliation['add'] = []

  for (let date = challenge.startDate; date <= endDate && date <= yesterday; date = addDaysKey(date, 1)) {
    if (existing.has(date)) continue
    if (pausedSince !== undefined && date >= pausedSince) {
      add.push({ date, state: 'pause' })
      endDate = addDaysKey(endDate, 1)
    } else if (left > 0) {
      add.push({ date, state: 'shield' })
      left -= 1
    } else {
      add.push({ date, state: 'fail' })
      failed = true
    }
  }

  const finished = challenge.status === 'active' && endDate < today
  const perfect = !failed
  return {
    add,
    endDate,
    finish: finished ? { perfect, bonus: perfect ? challengePerfectBonus(params.durationDays) : 0 } : undefined,
  }
}
