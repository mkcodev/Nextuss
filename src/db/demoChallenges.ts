// Retos de ejemplo para los datos demo (#191). Patrones fijos, sin números aleatorios: así la demo de
// siempre no cambia y los retos son idénticos cada vez. Todo es coherente con la reconciliación
// (`reconcileCustom`): cada día pasado de un reto vivo ya tiene su fila, así que al abrir la app no se
// escribe nada nuevo. Hoy se deja limpio, como el resto de la demo: las misiones de hoy las genera el
// motor del plugin.
import type { Challenge, ChallengeDayState } from './types'
import { addDaysKey, endDateFor } from '../lib/challenges/dayRange'
import { CUSTOM_KIND } from '../lib/challenges/custom'
import { DAILY_MISSION_KIND, MISSION_XP, missionTitle } from '../lib/challenges/missionCatalog'
import type { MissionParams, MissionSource, MissionTemplate } from '../lib/challenges/missionCatalog'
import { parseDateKey } from '../lib/dates'
import { XP_PER_CHALLENGE_DAY, challengePerfectBonus } from '../lib/xp'

export interface DemoChallengeRows {
  challenges: Omit<Challenge, 'id'>[]
  /** `index` apunta a la posición de su reto en `challenges`; el `challengeId` real se pone al insertar. */
  days: { index: number; date: string; state: ChallengeDayState; xp: number; at: number }[]
  /** XP que suman los días hechos, los bonus y las misiones cumplidas (0 con la gamificación apagada). */
  xp: number
}

const SOURCE_OF: Record<MissionTemplate, MissionSource> = {
  'tasks.complete-n': 'tasks',
  'tasks.high-priority': 'tasks',
  'focus.minutes': 'focus',
  'checkin.answer': 'checkin',
  'habits.all-today': 'habits',
}

interface CustomSpec {
  title: string
  durationDays: number
  shields: number
  /** Día de inicio, en días respecto a hoy (negativo = pasado). */
  start: number
  status: 'active' | 'paused' | 'done'
  /** En pausa: desde qué día (respecto a hoy). */
  pausedSince?: number
  /** Estado de cada día pasado con fila, por defecto `done`. */
  special?: Record<number, ChallengeDayState>
}

const CUSTOMS: CustomSpec[] = [
  // Día 22 de 30. Un escudo y un «Hoy no» gastados, con uno por gastar.
  { title: 'Leer 20 minutos', durationDays: 30, shields: 3, start: -21, status: 'active', special: { [-15]: 'shield', [-9]: 'skip' } },
  // Un escudo gastado y un fallo sin escudos: la racha se rompió hace 3 días y «Hoy no» no está disponible.
  { title: 'Sin azúcar añadido', durationDays: 21, shields: 1, start: -12, status: 'active', special: { [-6]: 'shield', [-3]: 'fail' } },
  // En pausa desde hace 4 días: los días en pausa ya escritos alargan el reto.
  { title: 'Caminar 30 minutos', durationDays: 14, shields: 1, start: -10, status: 'paused', pausedSince: -4 },
  // Cumplido «perfecto»: dos escudos, ningún fallo, con su bonus.
  { title: 'Escribir tres líneas de diario', durationDays: 66, shields: 3, start: -70, status: 'done', special: { [-50]: 'shield', [-20]: 'shield' } },
  // Cumplido con fallos: sin bonus.
  { title: 'Meditar 10 minutos', durationDays: 21, shields: 1, start: -45, status: 'done', special: { [-40]: 'shield', [-38]: 'fail', [-33]: 'fail', [-30]: 'fail' } },
]

const MISSION_HISTORY_DAYS = 14

const hour = (key: string, h: number) => parseDateKey(key).getTime() + h * 3600_000

export function buildDemoChallenges(today: string, gamified: boolean): DemoChallengeRows {
  const dk = (offset: number) => addDaysKey(today, offset)
  const dayXp = gamified ? XP_PER_CHALLENGE_DAY : 0
  const base = Date.now()
  const challenges: Omit<Challenge, 'id'>[] = []
  const days: DemoChallengeRows['days'] = []
  let xp = 0

  for (const spec of CUSTOMS) {
    const index = challenges.length
    const start = dk(spec.start)
    let endDate = endDateFor(start, spec.durationDays)
    const last = spec.status === 'done' ? endDateFor(start, spec.durationDays) : dk(-1)

    let paused = 0
    for (let key = start; key <= last; key = addDaysKey(key, 1)) {
      const offset = Math.round((parseDateKey(key).getTime() - parseDateKey(today).getTime()) / 86_400_000)
      const inPause = spec.status === 'paused' && spec.pausedSince !== undefined && offset >= spec.pausedSince
      const state: ChallengeDayState = inPause ? 'pause' : (spec.special?.[offset] ?? 'done')
      if (inPause) paused += 1
      const stateXp = state === 'done' ? dayXp : 0
      xp += stateXp
      days.push({ index, date: key, state, xp: stateXp, at: hour(key, 20) })
    }
    // Cada día en pausa escrito alarga el reto un día (lo mismo que haría la reconciliación).
    if (paused > 0) endDate = addDaysKey(endDate, paused)

    const perfect = spec.status === 'done' && !days.some((d) => d.index === index && d.state === 'fail')
    const bonus = spec.status === 'done' && perfect && gamified ? challengePerfectBonus(spec.durationDays) : 0
    xp += bonus

    challenges.push({
      kind: CUSTOM_KIND,
      status: spec.status,
      title: spec.title,
      startDate: start,
      endDate,
      params: { durationDays: spec.durationDays, shields: spec.shields },
      xpAwarded: bonus,
      pausedSince: spec.status === 'paused' && spec.pausedSince !== undefined ? dk(spec.pausedSince) : undefined,
      pausedBy: spec.status === 'paused' ? 'user' : undefined,
      createdAt: hour(start, 8),
      updatedAt: hour(last, 20),
      completedAt: spec.status === 'done' ? hour(addDaysKey(last, 1), 8) : undefined,
      deletedAt: 0,
      // Los vivos primero, en el orden de la lista; los cumplidos detrás.
      sortKey: base + index,
    })
  }

  // Misiones de los últimos días: unas cumplidas y otras caducadas, para que el historial no esté vacío.
  let n = 0
  const addMission = (date: string, template: MissionTemplate, target: number, done: boolean, progress: number) => {
    const missionXp = done && gamified ? MISSION_XP[template] : 0
    xp += missionXp
    const params: MissionParams = { template, source: SOURCE_OF[template], target, progress }
    challenges.push({
      kind: DAILY_MISSION_KIND,
      status: done ? 'done' : 'expired',
      title: missionTitle(template, target),
      startDate: date,
      endDate: date,
      params,
      xpAwarded: missionXp,
      createdAt: hour(date, 0),
      updatedAt: hour(date, 22),
      completedAt: done ? hour(date, 18) : undefined,
      deletedAt: 0,
      sortKey: base + 1000 + n++,
    })
  }
  for (let i = 1; i <= MISSION_HISTORY_DAYS; i++) {
    const date = dk(-i)
    const taskTarget = 3 + (i % 4)
    const tasksDone = i % 3 !== 0
    addMission(date, 'tasks.complete-n', taskTarget, tasksDone, tasksDone ? taskTarget : Math.max(1, taskTarget - 2))
    if (i % 2 === 0) {
      const focusTarget = 30 + (i % 3) * 15
      const focusDone = i % 4 !== 0
      addMission(date, 'focus.minutes', focusTarget, focusDone, focusDone ? focusTarget + 5 : Math.round(focusTarget / 2))
    }
    if (i % 3 === 1) {
      const checkinDone = i % 2 === 1
      addMission(date, 'checkin.answer', 3, checkinDone, checkinDone ? 3 : 1)
    }
  }

  return { challenges, days, xp }
}
