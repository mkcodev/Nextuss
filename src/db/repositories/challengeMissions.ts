// Misiones diarias (#191): generar al empezar el día, cerrar las de días pasados y llevar el
// progreso de las de hoy. Las reglas (catálogo, objetivos, evaluación) viven en `src/lib/challenges/`;
// aquí solo se lee la base y se escribe el resultado, con el XP.
import { addDays } from 'date-fns'
import { db } from '../schema'
import { readSetting } from '../settingsDefaults'
import type { Challenge } from '../types'
import { dateKey, isHabitScheduledOn, isPeriodicHabit, parseDateKey, subDaysKey, todayKey } from '../../lib/dates'
import {
  DAILY_MISSION_KIND,
  MISSION_XP,
  generateMissions,
  parseMissionParams,
  type MissionHistory,
  type MissionParams,
  type MissionSource,
} from '../../lib/challenges/missionCatalog'
import { evaluateMission, type MissionSnapshot } from '../../lib/challenges/missionEval'
import { focusRangeFor, summarizeFocus } from '../../features/today/todayNumbersData'
import { isPluginEnabled } from '../../features/plugins/pluginsStore'
import { applyXpDelta } from './gamification'
import { gamifiedXp } from './challenges'
import { getCheckInForDate } from './checkins'
import { listHabits } from './habits'
import { getFocusSessionsInRange, getHabitLogsInRange, getTasksCompletedInRange } from './stats'

/** Cuántos días atrás mira el historial de tareas para fijar el objetivo. */
const TASK_HISTORY_DAYS = 14

/** Lo que hay hoy en la base para evaluar las misiones. Es lo que escucha el motor con `useLiveQuery`. */
export async function readMissionSnapshot(date: string): Promise<MissionSnapshot> {
  const startTs = parseDateKey(date).getTime()
  const endTs = addDays(parseDateKey(date), 1).getTime() - 1
  const [tasksCompleted, focusSessions, checkIn, habitLogs] = await Promise.all([
    getTasksCompletedInRange(date, date),
    getFocusSessionsInRange(startTs, endTs),
    getCheckInForDate(date),
    getHabitLogsInRange(date, date),
  ])
  return { date, tasksCompleted, focusSessions, checkIn, habitLogs }
}

/** Resumen de los días ANTERIORES a `date` (sin hoy) que alimenta los objetivos. */
export async function buildMissionHistory(date: string): Promise<MissionHistory> {
  const tasks = await getTasksCompletedInRange(subDaysKey(date, TASK_HISTORY_DAYS), subDaysKey(date, 1))
  const perDay = new Map<string, number>()
  for (const t of tasks) {
    if (t.parentId || t.status !== 'done' || t.completedAt === undefined) continue
    const key = dateKey(new Date(t.completedAt))
    perDay.set(key, (perDay.get(key) ?? 0) + 1)
  }

  const range = focusRangeFor(date)
  const focusAvgPrevMin = summarizeFocus(await getFocusSessionsInRange(range.fromTs, range.toTs), date).avgPrevMin

  const openP1 = await db.tasks
    .where('deletedAt')
    .equals(0)
    .filter((t) => !t.parentId && t.status !== 'done' && t.priority === 1)
    .first()
  const answered = await db.checkins.filter((c) => c.energy != null && c.mood != null && c.focus != null).first()
  const day = parseDateKey(date)
  const habits = (await listHabits()).filter((h) => !isPeriodicHabit(h) && isHabitScheduledOn(h, day))

  return {
    tasksDonePerActiveDay: [...perDay.values()],
    hasOpenP1Task: openP1 !== undefined,
    focusAvgPrevMin,
    hasAnsweredCheckIn: answered !== undefined,
    scheduledHabitIds: habits.map((h) => h.id!),
  }
}

/** Fuentes cuyo plugin está activo (Tareas es núcleo y siempre lo está). */
export function enabledMissionSources(): Set<MissionSource> {
  const sources = new Set<MissionSource>(['tasks'])
  if (isPluginEnabled('focus')) sources.add('focus')
  if (isPluginEnabled('checkin')) sources.add('checkin')
  if (isPluginEnabled('habits')) sources.add('habits')
  return sources
}

const missionsOn = (date: string) => db.challenges.where('[kind+startDate]').equals([DAILY_MISSION_KIND, date])

/** Genera las misiones de `today` si aún no hay ninguna. Seguro con varias pestañas: la comprobación
 * y el alta van en la misma transacción. Devuelve cuántas creó. */
export async function ensureDailyMissions(today: string = todayKey()): Promise<number> {
  if ((await missionsOn(today).count()) > 0) return 0
  const settings = await db.settings.get(1)
  const drafts = generateMissions(today, await buildMissionHistory(today), enabledMissionSources(), readSetting(settings, 'missionsPerDay'))
  if (drafts.length === 0) return 0

  return db.transaction('rw', db.challenges, async () => {
    if ((await missionsOn(today).count()) > 0) return 0
    const now = Date.now()
    for (const [i, d] of drafts.entries()) {
      const params: MissionParams = { template: d.template, source: d.source, target: d.target, progress: 0, refs: d.refs }
      await db.challenges.add({
        kind: DAILY_MISSION_KIND,
        status: 'active',
        title: d.title,
        startDate: today,
        endDate: today,
        params,
        xpAwarded: 0,
        createdAt: now,
        updatedAt: now,
        deletedAt: 0,
        sortKey: now + i,
      })
    }
    return drafts.length
  })
}

/** Las misiones sin cumplir de días anteriores a `before` caducan, sin penalización. */
export async function closeMissions(before: string = todayKey()): Promise<void> {
  await db.challenges
    .where('kind')
    .equals(DAILY_MISSION_KIND)
    .filter((c) => c.status === 'active' && c.startDate < before)
    .modify({ status: 'expired', updatedAt: Date.now() })
}

/** Lleva al día el progreso de las misiones de `today`. Al llegar al objetivo la misión se cumple y
 * suma su XP (si la gamificación está activa ahora); si el dato baja ese mismo día (deshaces una
 * tarea) vuelve a estar activa y resta exactamente lo que dio. Una vez cerrado el día no cambia. */
export async function syncMissionProgress(today: string = todayKey(), snapshot?: MissionSnapshot): Promise<void> {
  const snap = snapshot && snapshot.date === today ? snapshot : await readMissionSnapshot(today)
  await db.transaction('rw', db.challenges, db.progress, async () => {
    const rows = (await missionsOn(today).toArray()).filter((c) => c.deletedAt === 0 && (c.status === 'active' || c.status === 'done'))
    for (const c of rows) {
      const params = parseMissionParams(c.params)
      if (!params) continue
      const progress = evaluateMission(params, snap)
      const reached = progress >= params.target
      const changes: Partial<Challenge> = {}
      if (progress !== params.progress) changes.params = { ...params, progress }
      if (reached && c.status === 'active') {
        const xp = gamifiedXp(MISSION_XP[params.template])
        if (xp > 0) await applyXpDelta(xp)
        Object.assign(changes, { status: 'done', xpAwarded: xp, completedAt: Date.now() })
      } else if (!reached && c.status === 'done') {
        if (c.xpAwarded > 0) await applyXpDelta(-c.xpAwarded)
        Object.assign(changes, { status: 'active', xpAwarded: 0, completedAt: undefined })
      }
      if (Object.keys(changes).length > 0) await db.challenges.update(c.id!, { ...changes, updatedAt: Date.now() })
    }
  })
}
