// Única fuente de datos para toda pestaña de estadísticas — la lección de los dos anillos de
// objetivos que no coincidían (ver memoria de colaboración): un solo hook, cero divergencia.
import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { parseDateKey } from '../../lib/dates'
import { listHabits } from '../../db/repositories/habits'
import {
  getAchievementsInRange,
  getCheckInsInRange,
  getFocusSessionsInRange,
  getGoalsInRange,
  getHabitLogsInRange,
  getTasksCompletedInRange,
  getTasksCreatedInRange,
} from '../../db/repositories/stats'
import { previousRangeOf, resolveRange, type ResolvedRange, type StatsRange } from './range'
import {
  buildDailySeries,
  buildEstimateAccuracy,
  buildHabitMatrix,
  buildHourHistogram,
  buildWeekdayProfile,
  comparePeriods,
  summarizePeriod,
  type DailyPoint,
  type EstimateAccuracyResult,
  type HabitMatrixRow,
  type HourBucket,
  type KpiDelta,
  type WeekdayProfilePoint,
} from './aggregate'
import type { Achievement, CheckIn, FocusSession, Goal, Habit, HabitLog, Task } from '../../db/types'

export interface StatsData {
  loading: boolean
  range: ResolvedRange
  habits: Habit[]
  points: DailyPoint[]
  weekdayProfile: WeekdayProfilePoint[]
  hourHistogram: HourBucket[]
  habitMatrix: HabitMatrixRow[]
  estimateAccuracy: EstimateAccuracyResult
  kpiDeltas: KpiDelta[]
  /** Logs de hábitos crudos del rango seleccionado — para gráficos por-hábito que `habitMatrix` no cubre. */
  habitLogs: HabitLog[]
  tasksCompleted: Task[]
  tasksCreated: Task[]
  goals: Goal[]
  achievements: Achievement[]
  checkins: CheckIn[]
  focusSessions: FocusSession[]
}

const EMPTY_ESTIMATE_ACCURACY: EstimateAccuracyResult = {
  sampleSize: 0,
  medianRatio: null,
  meanRatio: null,
  biasLabel: null,
}

function tsBounds(r: { from: string; to: string }): { fromTs: number; toTs: number } {
  return { fromTs: parseDateKey(r.from).getTime(), toTs: addDays(parseDateKey(r.to), 1).getTime() - 1 }
}

/**
 * `range` acepta un `StatsRange` relativo ('7d'…'all', terminando hoy) o un `ResolvedRange`
 * explícito ya calculado (p. ej. una semana/mes concretos para un informe navegable) — memoiza el
 * objeto que pases si no es un `StatsRange`, para no re-disparar la consulta en cada render.
 *
 * `includeArchivedHabits`: la mayoría de pestañas quiere solo hábitos activos; el histórico de
 * "Hábitos" puede pedir también los archivados para no perder su racha pasada del gráfico.
 */
export function useStatsData(range: StatsRange | ResolvedRange, includeArchivedHabits = false): StatsData {
  const resolved = useMemo(() => (typeof range === 'string' ? resolveRange(range) : range), [range])
  const previous = useMemo(() => previousRangeOf(resolved), [resolved])

  const raw = useLiveQuery(
    async () => {
      const currentTs = tsBounds(resolved)
      const previousTs = tsBounds(previous)
      const [
        habits,
        logs,
        prevLogs,
        tasksCompleted,
        prevTasksCompleted,
        tasksCreated,
        sessions,
        prevSessions,
        checkins,
        prevCheckins,
        goals,
        achievements,
      ] = await Promise.all([
        listHabits(includeArchivedHabits),
        getHabitLogsInRange(resolved.from, resolved.to),
        getHabitLogsInRange(previous.from, previous.to),
        getTasksCompletedInRange(resolved.from, resolved.to),
        getTasksCompletedInRange(previous.from, previous.to),
        getTasksCreatedInRange(resolved.from, resolved.to),
        getFocusSessionsInRange(currentTs.fromTs, currentTs.toTs),
        getFocusSessionsInRange(previousTs.fromTs, previousTs.toTs),
        getCheckInsInRange(resolved.from, resolved.to),
        getCheckInsInRange(previous.from, previous.to),
        getGoalsInRange(resolved.from, resolved.to),
        getAchievementsInRange(resolved.from, resolved.to),
      ])
      return {
        habits,
        logs,
        prevLogs,
        tasksCompleted,
        prevTasksCompleted,
        tasksCreated,
        sessions,
        prevSessions,
        checkins,
        prevCheckins,
        goals,
        achievements,
      }
    },
    [resolved.from, resolved.to, previous.from, previous.to, includeArchivedHabits],
  )

  return useMemo((): StatsData => {
    if (!raw) {
      return {
        loading: true,
        range: resolved,
        habits: [],
        points: [],
        weekdayProfile: [],
        hourHistogram: [],
        habitMatrix: [],
        estimateAccuracy: EMPTY_ESTIMATE_ACCURACY,
        kpiDeltas: [],
        habitLogs: [],
        tasksCompleted: [],
        tasksCreated: [],
        goals: [],
        achievements: [],
        checkins: [],
        focusSessions: [],
      }
    }

    const points = buildDailySeries(resolved, raw.habits, raw.logs, raw.tasksCompleted, raw.sessions, raw.checkins)
    const prevPoints = buildDailySeries(
      previous,
      raw.habits,
      raw.prevLogs,
      raw.prevTasksCompleted,
      raw.prevSessions,
      raw.prevCheckins,
    )

    return {
      loading: false,
      range: resolved,
      habits: raw.habits,
      points,
      weekdayProfile: buildWeekdayProfile(points),
      hourHistogram: buildHourHistogram(raw.sessions),
      habitMatrix: buildHabitMatrix(raw.habits, raw.logs, resolved),
      estimateAccuracy: buildEstimateAccuracy(raw.tasksCompleted),
      kpiDeltas: comparePeriods(summarizePeriod(points), summarizePeriod(prevPoints)),
      habitLogs: raw.logs,
      tasksCompleted: raw.tasksCompleted,
      tasksCreated: raw.tasksCreated,
      goals: raw.goals,
      achievements: raw.achievements,
      checkins: raw.checkins,
      focusSessions: raw.sessions,
    }
  }, [raw, resolved, previous])
}
