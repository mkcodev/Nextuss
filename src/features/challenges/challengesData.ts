// Lo que lee la página /retos, en forma pura: recibe las filas de la base y devuelve las misiones de
// hoy y los retos propios ya resumidos, listos para pintar. La consulta en vivo está en
// `useChallengesData`; así esto se prueba sin base de datos.
import type { Challenge, ChallengeDay } from '../../db/types'
import { CUSTOM_KIND, parseCustomParams, type CustomChallengeParams } from '../../lib/challenges/custom'
import { DAILY_MISSION_KIND, parseMissionParams, type MissionParams } from '../../lib/challenges/missionCatalog'
import { indexDays, lastDays, markReason, type DayCell } from '../../lib/challenges/calendar'
import { getChallengeKind, type ChallengeSummary } from './kinds'

export type StoredChallenge = Challenge & { id: number }

export interface MissionItem {
  challenge: StoredChallenge
  params: MissionParams
}

export interface ChallengeItem {
  challenge: StoredChallenge
  params: CustomChallengeParams
  days: ChallengeDay[]
  summary: ChallengeSummary
  /** Los últimos 7 días, para la tira de la lista. */
  strip: DayCell[]
  /** Por qué hoy no se puede marcar, o `null` si se puede. */
  markReason: string | null
  /** Terminado: cumplido o abandonado (ya no se mantiene). */
  finished: boolean
  /** Cumplido sin ningún fallo (con escudos permitidos): el que da el bonus de XP. */
  perfect: boolean
}

export interface ChallengesData {
  today: string
  /** Misiones de hoy, por orden de creación. */
  missions: MissionItem[]
  /** ¿Hubo misiones algún día? Distingue «tus primeras misiones llegan mañana» de «hoy no hay». */
  hadMissions: boolean
  /** Retos propios en marcha (activos y en pausa), por orden manual. */
  active: ChallengeItem[]
  /** Cumplidos y abandonados, el más reciente primero. */
  finished: ChallengeItem[]
}

const hasId = (c: Challenge): c is StoredChallenge => c.id !== undefined

export function buildChallengesData(rows: readonly Challenge[], dayRows: readonly ChallengeDay[], today: string): ChallengesData {
  const live = rows.filter((c): c is StoredChallenge => hasId(c) && c.deletedAt === 0)

  const daysBy = new Map<number, ChallengeDay[]>()
  for (const d of dayRows) {
    const list = daysBy.get(d.challengeId)
    if (list) list.push(d)
    else daysBy.set(d.challengeId, [d])
  }

  const missionRows = live.filter((c) => c.kind === DAILY_MISSION_KIND)
  const missions: MissionItem[] = []
  for (const challenge of missionRows.filter((c) => c.startDate === today).sort((a, b) => a.sortKey - b.sortKey)) {
    const params = parseMissionParams(challenge.params)
    if (params) missions.push({ challenge, params })
  }

  const items: ChallengeItem[] = []
  for (const challenge of live.filter((c) => c.kind === CUSTOM_KIND).sort((a, b) => a.sortKey - b.sortKey)) {
    const module = getChallengeKind(challenge.kind)
    const params = parseCustomParams(challenge.params)
    if (!module || !params) continue // fila de otra versión o dañada: se conserva, no se muestra
    const days = (daysBy.get(challenge.id) ?? []).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    const summary = module.summarize(challenge, days, today)
    if (!summary) continue
    const finished = challenge.status === 'done' || challenge.status === 'abandoned' || challenge.status === 'expired'
    items.push({
      challenge,
      params,
      days,
      summary,
      strip: lastDays(challenge, indexDays(days), today),
      markReason: markReason(challenge, today),
      finished,
      perfect: challenge.status === 'done' && summary.counts.fail === 0,
    })
  }

  const when = (i: ChallengeItem) => i.challenge.completedAt ?? i.challenge.updatedAt
  return {
    today,
    missions,
    hadMissions: missionRows.length > 0,
    active: items.filter((i) => !i.finished),
    finished: items.filter((i) => i.finished).sort((a, b) => when(b) - when(a)),
  }
}
