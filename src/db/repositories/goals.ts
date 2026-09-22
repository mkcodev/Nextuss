import { db } from '../schema'
import type { Goal, GoalPeriod } from '../types'
import { XP_PER_GOAL_MONTH, XP_PER_GOAL_WEEK } from '../../lib/xp'
import { applyAttributeXpDelta, applyXpDelta, unlockAchievement } from './gamification'
import {
  computeGoalProgress,
  computeGoalSegments,
  computeNorthStarStreak,
  previousPeriodKey,
  type GoalProgressResult,
} from '../../features/planner/goalProgress'

export function listGoalsForPeriod(period: GoalPeriod, periodKey: string) {
  return db.goals.where('[period+periodKey]').equals([period, periodKey]).toArray()
}

/**
 * Returns `null` (not `undefined`) when there's no priority goal, so a `useLiveQuery` consumer can
 * tell "still loading" (`undefined`) apart from "resolved, nothing set" (`null`).
 */
export async function getPriorityGoal(period: GoalPeriod, periodKey: string): Promise<Goal | null> {
  const goals = await listGoalsForPeriod(period, periodKey)
  return goals.find((g) => g.isPriority) ?? null
}

export function getGoal(id: number) {
  return db.goals.get(id)
}

export interface CreateGoalInput {
  period: GoalPeriod
  periodKey: string
  title: string
  notes?: string
  parentGoalId?: number
  attributeId?: number
  carriedFromGoalId?: number
}

export async function createGoal(input: CreateGoalInput): Promise<number> {
  const title = input.title.trim()
  const isFirst = (await db.goals.count()) === 0
  const id = (await db.goals.add({
    period: input.period,
    periodKey: input.periodKey,
    title,
    notes: input.notes?.trim() || undefined,
    parentGoalId: input.parentGoalId,
    attributeId: input.attributeId,
    carriedFromGoalId: input.carriedFromGoalId,
    taskIds: [],
    done: false,
    isPriority: false,
    createdAt: Date.now(),
  })) as number
  if (isFirst) await unlockAchievement('first_goal')
  return id
}

export function updateGoal(id: number, changes: Partial<Omit<Goal, 'id'>>) {
  return db.goals.update(id, changes)
}

/** Deleting a goal promotes its children to top-level rather than orphaning their parentGoalId. */
export function deleteGoal(id: number) {
  return db.transaction('rw', db.goals, async () => {
    await db.goals.where('parentGoalId').equals(id).modify({ parentGoalId: undefined })
    await db.goals.delete(id)
  })
}

export interface ToggleGoalResult {
  done: boolean
  xpDelta: number
  leveledUp: boolean
  newLevel: number
  unlockedAchievements: string[]
}

function xpForGoal(period: GoalPeriod): number {
  return period === 'week' ? XP_PER_GOAL_WEEK : XP_PER_GOAL_MONTH
}

/** Same reversible delta-on-toggle pattern as `setHabitLog` — un-completing a goal gives back the XP it granted. */
export async function toggleGoalDone(id: number): Promise<ToggleGoalResult> {
  const goal = await db.goals.get(id)
  if (!goal) throw new Error(`Goal ${id} not found`)

  const done = !goal.done
  const delta = done ? 1 : -1
  const xpDelta = delta * xpForGoal(goal.period)

  await db.goals.update(id, { done, completedAt: done ? Date.now() : undefined })
  const xpResult = await applyXpDelta(xpDelta)
  await applyAttributeXpDelta(goal.attributeId, xpDelta)

  const unlockedAchievements: string[] = []
  const tryUnlock = async (key: string) => {
    if (await unlockAchievement(key)) unlockedAchievements.push(key)
  }

  if (done) {
    await tryUnlock('first_goal')
    if (goal.isPriority) {
      await tryUnlock('first_priority_goal')
      const streak = await getNorthStarStreak(goal.period, goal.periodKey)
      if (streak >= 4) await tryUnlock('north_star_4')
    }
  }

  return {
    done,
    xpDelta,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.level,
    unlockedAchievements,
  }
}

/** Marking a goal priority un-sets any other priority goal in the same period+periodKey (exclusive North Star). */
export async function setPriorityGoal(id: number): Promise<boolean> {
  return db.transaction('rw', db.goals, async () => {
    const goal = await db.goals.get(id)
    if (!goal) return false
    const nextValue = !goal.isPriority
    if (nextValue) {
      const siblings = await db.goals
        .where('[period+periodKey]')
        .equals([goal.period, goal.periodKey])
        .toArray()
      await Promise.all(
        siblings
          .filter((s) => s.id !== id && s.isPriority)
          .map((s) => db.goals.update(s.id!, { isPriority: false })),
      )
    }
    await db.goals.update(id, { isPriority: nextValue })
    return nextValue
  })
}

export function getChildGoals(parentGoalId: number) {
  return db.goals.where('parentGoalId').equals(parentGoalId).toArray()
}

/** Rolls up from child goals (one level — week goals under a month goal) when present, else from linked tasks. */
export async function getGoalProgress(goalId: number): Promise<GoalProgressResult> {
  const goal = await db.goals.get(goalId)
  if (!goal) return { done: 0, total: 0, ratio: 0, source: 'self' }

  const children = await getChildGoals(goalId)
  const tasks = goal.taskIds.length ? await db.tasks.bulkGet(goal.taskIds) : []
  return computeGoalProgress(goal, computeGoalSegments(tasks, children))
}

/**
 * Consecutive periods (walking back from `currentKey`) that had a completed priority
 * goal. The current period doesn't break the streak while still incomplete/in progress.
 */
export async function getNorthStarStreak(period: GoalPeriod, currentKey: string): Promise<number> {
  const cache = new Map<string, boolean>()
  const wasCompleted = async (key: string): Promise<boolean> => {
    if (cache.has(key)) return cache.get(key)!
    const goals = await db.goals.where('[period+periodKey]').equals([period, key]).toArray()
    const result = goals.some((g) => g.isPriority && g.done)
    cache.set(key, result)
    return result
  }

  // computeNorthStarStreak's predicate is synchronous, so pre-walk and memoize the periods we'll need.
  let key = currentKey
  const keys: string[] = []
  for (let i = 0; i < 104; i++) {
    keys.push(key)
    key = previousPeriodKey(period, key)
  }
  await Promise.all(keys.map(wasCompleted))

  return computeNorthStarStreak(period, currentKey, (k) => cache.get(k) ?? false)
}

/** Copies an incomplete goal into a new period (used by the guided weekly review), re-linking only open tasks. */
export async function carryOverGoal(goalId: number, targetPeriodKey: string): Promise<number> {
  const goal = await db.goals.get(goalId)
  if (!goal) throw new Error(`Goal ${goalId} not found`)

  const openTaskIds: number[] = []
  if (goal.taskIds.length) {
    const tasks = await db.tasks.bulkGet(goal.taskIds)
    for (const t of tasks) {
      if (t?.id != null && t.status !== 'done') openTaskIds.push(t.id)
    }
  }

  const newId = (await db.goals.add({
    period: goal.period,
    periodKey: targetPeriodKey,
    title: goal.title,
    notes: goal.notes,
    parentGoalId: goal.parentGoalId,
    attributeId: goal.attributeId,
    carriedFromGoalId: goalId,
    taskIds: openTaskIds,
    done: false,
    isPriority: false,
    createdAt: Date.now(),
  })) as number
  return newId
}

/**
 * Returns `null` (not `undefined`) when the task has no linked goal, so a `useLiveQuery` consumer
 * can tell "still loading" (`undefined`) apart from "resolved, no goal linked" (`null`).
 */
export async function getGoalForTask(taskId: number): Promise<Goal | null> {
  const goal = await db.goals.filter((g) => g.taskIds.includes(taskId)).first()
  return goal ?? null
}

/** Unlinks the task from its previous goal (if any) and links it to the new one. Pass `undefined` to just unlink. */
export async function setGoalForTask(taskId: number, goalId: number | undefined): Promise<void> {
  const previous = await getGoalForTask(taskId)
  if (previous && previous.id !== goalId) {
    await unlinkTaskFromGoal(previous.id!, taskId)
  }
  if (goalId != null) {
    await linkTaskToGoal(goalId, taskId)
  }
}

export async function unlinkTaskFromAllGoals(taskId: number): Promise<void> {
  const goals = await db.goals.filter((g) => g.taskIds.includes(taskId)).toArray()
  await Promise.all(goals.map((g) => unlinkTaskFromGoal(g.id!, taskId)))
}

export async function linkTaskToGoal(goalId: number, taskId: number) {
  const goal = await db.goals.get(goalId)
  if (!goal || goal.taskIds.includes(taskId)) return
  await db.goals.update(goalId, { taskIds: [...goal.taskIds, taskId] })
}

export async function unlinkTaskFromGoal(goalId: number, taskId: number) {
  const goal = await db.goals.get(goalId)
  if (!goal) return
  await db.goals.update(goalId, { taskIds: goal.taskIds.filter((id) => id !== taskId) })
}
