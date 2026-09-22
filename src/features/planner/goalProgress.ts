import { previousPeriodKey } from '../../lib/periods'
import type { Goal, GoalPeriod, Task } from '../../db/types'

export {
  goalElapsedRatio,
  nextPeriodKey,
  parsePeriodKey,
  periodElapsedRatio,
  previousPeriodKey,
  shiftPeriodKey,
} from '../../lib/periods'

/** A goal looks behind schedule once we're meaningfully into the period and progress lags well behind time elapsed. */
export function isGoalAtRisk(progressRatio: number, elapsedRatio: number): boolean {
  return elapsedRatio > 0.25 && elapsedRatio - progressRatio > 0.34
}

export interface GoalSegment {
  key: string
  kind: 'task' | 'week-goal'
  done: boolean
}

/**
 * One segment per existing linked task (deleted/missing tasks — a `bulkGet` gap — are skipped
 * rather than counted as incomplete) plus one segment per child (week) goal. Tasks and child
 * goals are always combined, never one in place of the other.
 */
export function computeGoalSegments(linkedTasks: (Task | undefined)[], children: Goal[]): GoalSegment[] {
  const taskSegments = linkedTasks
    .filter((t): t is Task => t != null)
    .map((t) => ({ key: `task-${t.id}`, kind: 'task' as const, done: t.status === 'done' }))
  const childSegments = children.map((c) => ({ key: `week-${c.id}`, kind: 'week-goal' as const, done: c.done }))
  return [...taskSegments, ...childSegments]
}

export interface GoalProgressResult {
  done: number
  total: number
  ratio: number
  source: 'segments' | 'self'
}

/** Progress from the combined segments; falls back to the goal's own done flag when it has none. */
export function computeGoalProgress(goal: { done: boolean }, segments: GoalSegment[]): GoalProgressResult {
  if (segments.length > 0) {
    const done = segments.filter((s) => s.done).length
    return { done, total: segments.length, ratio: done / segments.length, source: 'segments' }
  }
  const ratio = goal.done ? 1 : 0
  return { done: ratio, total: 1, ratio, source: 'self' }
}

/**
 * Consecutive periods (walking backwards from `currentKey`) with a completed priority
 * goal. The current period doesn't break the streak while incomplete — it's still in
 * progress — it simply doesn't add to it yet. A gap in any past period ends the streak.
 */
export function computeNorthStarStreak(
  period: GoalPeriod,
  currentKey: string,
  wasCompleted: (periodKey: string) => boolean,
  maxLookback = 104,
): number {
  let streak = 0
  let key = currentKey
  for (let i = 0; i < maxLookback; i++) {
    if (wasCompleted(key)) {
      streak += 1
    } else if (i > 0) {
      break
    }
    key = previousPeriodKey(period, key)
  }
  return streak
}
