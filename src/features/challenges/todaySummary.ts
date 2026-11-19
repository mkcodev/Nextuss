// Lo que enseña la celda «Retos» de Hoy, en forma pura: sale de los mismos datos que la página /retos.
import type { ChallengeItem, ChallengesData } from './challengesData'

export interface TodayChallengesSummary {
  missionsDone: number
  missionsTotal: number
  /** Retos propios de hoy, por orden manual: los que se pueden marcar (activos y ya empezados) y el que
   *  se cerró al marcar hoy su último día, para que la fila no desaparezca de golpe. */
  items: ChallengeItem[]
  /** De ésos, los que hoy aún no están resueltos (ni hechos ni «Hoy no»). */
  toMark: number
}

export function summarizeForToday(data: ChallengesData): TodayChallengesSummary {
  const closedToday = data.finished.filter((i) => i.challenge.status === 'done' && i.challenge.endDate === data.today && i.summary.todayState === 'done')
  const items = [...data.active.filter((i) => i.markReason === null), ...closedToday].sort((a, b) => a.challenge.sortKey - b.challenge.sortKey)
  return {
    missionsDone: data.missions.filter((m) => m.challenge.status === 'done').length,
    missionsTotal: data.missions.length,
    items,
    toMark: items.filter((i) => i.summary.todayState === null).length,
  }
}

/** ¿Hay algo que enseñar en Hoy? Sin misiones ni retos en marcha, la celda no aparece. */
export const hasTodayContent = (s: TodayChallengesSummary): boolean => s.missionsTotal > 0 || s.items.length > 0
