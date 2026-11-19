import { formatDayMonth } from '../../lib/challenges/calendar'
import type { ChallengeItem } from './challengesData'

/** Qué enseña la celda «Hoy» de un reto. Siempre es una forma (el icono que elige la vista) y un texto. */
export type RowStatusKey = 'done' | 'skip' | 'pause' | 'future' | 'pending' | 'over' | 'completed' | 'perfect' | 'abandoned'

export interface RowStatus {
  key: RowStatusKey
  text: string
}

export function rowStatus(item: ChallengeItem, today: string): RowStatus {
  const { challenge, summary } = item
  if (item.finished) {
    if (challenge.status === 'abandoned') return { key: 'abandoned', text: 'Abandonado' }
    return item.perfect ? { key: 'perfect', text: 'Perfecto' } : { key: 'completed', text: 'Cumplido' }
  }
  if (challenge.status === 'paused' && challenge.pausedSince !== undefined && challenge.pausedSince <= today) {
    return { key: 'pause', text: 'En pausa' }
  }
  if (today < challenge.startDate) return { key: 'future', text: `Empieza el ${formatDayMonth(challenge.startDate)}` }
  if (summary.todayState === 'done') return { key: 'done', text: 'Hecho hoy' }
  if (summary.todayState === 'skip') return { key: 'skip', text: '«Hoy no»' }
  if (today > challenge.endDate) return { key: 'over', text: 'Terminando' }
  return { key: 'pending', text: 'Por marcar' }
}

/** «Día 22 de 30», o «30 días» si aún no empezó o ya terminó. */
export function progressText(item: ChallengeItem): string {
  const { dayIndex, totalDays } = item.summary
  return !item.finished && dayIndex > 0 ? `Día ${dayIndex} de ${totalDays}` : `${totalDays} días`
}

/** ¿Es el último día del reto (en marcha)? */
export const isLastDay = (item: ChallengeItem, today: string): boolean => !item.finished && item.challenge.endDate === today
