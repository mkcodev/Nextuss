import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../../db/schema'
import { getOverdueTasks, ZOMBIE_THRESHOLD } from '../../../db/repositories/tasks'
import { todayKey } from '../../../lib/dates'
import { useStatsData } from '../useStatsData'
import type { ResolvedRange, StatsRange } from '../range'
import { evaluateInsights } from './index'
import type { Insight, InsightContext } from './types'
import type { InsightFeedbackRecord, Task } from '../../../db/types'

export interface UseInsightsResult {
  loading: boolean
  insights: Insight[]
  dismiss: (key: string) => Promise<void>
}

const EMPTY_TASKS: Task[] = []
const EMPTY_FEEDBACK: InsightFeedbackRecord[] = []

export function useInsights(range: StatsRange | ResolvedRange): UseInsightsResult {
  const data = useStatsData(range)
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const overdueTasks = useLiveQuery(() => getOverdueTasks(todayKey()), []) ?? EMPTY_TASKS
  const dismissedKeys = useLiveQuery(() => db.insightFeedback.toArray(), []) ?? EMPTY_FEEDBACK

  const dismissedSet = useMemo(() => new Set(dismissedKeys.map((d) => d.key)), [dismissedKeys])

  const insights = useMemo((): Insight[] => {
    if (data.loading || !settings) return []

    const dayCapacityMin = Math.max(0, (settings.dayEndHour - settings.dayStartHour) * 60)
    const zombieCount = overdueTasks.filter((t) => t.postponedCount >= ZOMBIE_THRESHOLD).length

    const ctx: InsightContext = {
      range: data.range,
      points: data.points,
      habits: data.habits,
      habitMatrix: data.habitMatrix,
      habitLogs: data.habitLogs,
      checkins: data.checkins,
      focusSessions: data.focusSessions,
      hourHistogram: data.hourHistogram,
      tasksCompleted: data.tasksCompleted,
      tasksCreated: data.tasksCreated,
      goals: data.goals,
      dayCapacityMin,
      zombieCount,
      now: new Date(),
    }

    return evaluateInsights(ctx).filter((insight) => !dismissedSet.has(insight.key))
  }, [data, settings, overdueTasks, dismissedSet])

  const dismiss = async (key: string) => {
    // `key` es único en la tabla — si ya se descartó (doble clic, dos pestañas), ignora el conflicto.
    try {
      await db.insightFeedback.add({ key, dismissedAt: Date.now() })
    } catch {
      // ya estaba descartado
    }
  }

  return { loading: data.loading || !settings, insights, dismiss }
}
