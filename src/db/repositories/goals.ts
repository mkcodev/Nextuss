import { db } from '../schema'
import type { Goal, GoalPeriod } from '../types'
import { XP_PER_GOAL_MONTH, XP_PER_GOAL_WEEK } from '../../lib/xp'
import { shiftPeriodKey } from '../../lib/periods'
import { NORTH_STAR_STREAK_ACHIEVEMENT_THRESHOLD } from '../../lib/achievementThresholds'
import { applyAttributeXpDelta, applyXpDelta, unlockAchievement } from './gamification'
import { trashRows } from '../trash'
import {
  computeGoalProgress,
  computeGoalSegments,
  computeNorthStarStreak,
  type GoalProgressResult,
} from '../../features/planner/goalProgress'

export async function listGoalsForPeriod(period: GoalPeriod, periodKey: string): Promise<Goal[]> {
  const goals = await db.goals.where('[period+periodKey]').equals([period, periodKey]).toArray()
  return goals.filter((g) => g.deletedAt === 0)
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
    deletedAt: 0,
    sortKey: Date.now(),
  })) as number
  // El logro 'first_goal' se dispara al *completar* el primer objetivo (toggleGoalDone), no al
  // crearlo — un disparador aquí también era redundante y premiaba crear, no cumplir.
  return id
}

export function updateGoal(id: number, changes: Partial<Omit<Goal, 'id'>>) {
  return db.goals.update(id, changes)
}

/** Mueve el objetivo a la papelera. Sus hijos (si los tiene) siguen apuntando a él vía
 * `parentGoalId` — no se promueven a raíz en silencio, ya no hace falta: si el objetivo se restaura
 * la relación vuelve sola, y si se purga de verdad pasados 30 días, `purgeTrashEntry` es quien
 * entonces sí los promueve. */
export async function trashGoal(id: number): Promise<void> {
  const goal = await db.goals.get(id)
  if (!goal) return
  await trashRows('goals', [id], `Objetivo eliminado: "${goal.title}"`)
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
  return db.transaction('rw', db.goals, db.progress, db.attributes, db.achievements, async () => {
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
        if (streak >= NORTH_STAR_STREAK_ACHIEVEMENT_THRESHOLD) await tryUnlock('north_star_4')
      }
    }

    return {
      done,
      xpDelta,
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.level,
      unlockedAchievements,
    }
  })
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

export async function getChildGoals(parentGoalId: number): Promise<Goal[]> {
  const goals = await db.goals.where('parentGoalId').equals(parentGoalId).toArray()
  return goals.filter((g) => g.deletedAt === 0)
}

/** Rolls up from child goals (one level — week goals under a month goal) when present, else from linked tasks. */
export async function getGoalProgress(goalId: number): Promise<GoalProgressResult> {
  const goal = await db.goals.get(goalId)
  if (!goal) return { done: 0, total: 0, ratio: 0, source: 'self' }

  const children = await getChildGoals(goalId)
  const tasks = goal.taskIds.length ? await db.tasks.bulkGet(goal.taskIds) : []
  return computeGoalProgress(goal, computeGoalSegments(tasks, children))
}

const NORTH_STAR_STREAK_LOOKBACK = 104

/**
 * Consecutive periods (walking back from `currentKey`) that had a completed priority
 * goal. The current period doesn't break the streak while still incomplete/in progress.
 *
 * One bounded range read over `[period+periodKey]` instead of up to 104 separate queries — the
 * lexicographic order of `periodKey` ('YYYY-Www' | 'YYYY-MM') matches chronological order, so the
 * lookback window is a single `between`.
 */
export async function getNorthStarStreak(period: GoalPeriod, currentKey: string): Promise<number> {
  const lookbackKey = shiftPeriodKey(period, currentKey, -NORTH_STAR_STREAK_LOOKBACK)
  const rows = await db.goals
    .where('[period+periodKey]')
    .between([period, lookbackKey], [period, currentKey], true, true)
    .toArray()
  const completedKeys = new Set(
    rows.filter((g) => g.deletedAt === 0 && g.isPriority && g.done).map((g) => g.periodKey),
  )
  return computeNorthStarStreak(period, currentKey, (k) => completedKeys.has(k), NORTH_STAR_STREAK_LOOKBACK)
}

/** Copies an incomplete goal into a new period (used by the guided weekly review), re-linking only open tasks. */
export async function carryOverGoal(goalId: number, targetPeriodKey: string): Promise<number> {
  const goal = await db.goals.get(goalId)
  if (!goal) throw new Error(`Goal ${goalId} not found`)

  const openTaskIds: number[] = []
  if (goal.taskIds.length) {
    const tasks = await db.tasks.bulkGet(goal.taskIds)
    for (const t of tasks) {
      if (t?.id != null && t.deletedAt === 0 && t.status !== 'done') openTaskIds.push(t.id)
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
    deletedAt: 0,
    sortKey: Date.now(),
  })) as number
  return newId
}

/** Todos los objetivos vivos y no completados, sin filtrar por periodo — usado por el buscador difuso
 * del quick-add (`@objetivo`), donde no importa si el objetivo es de esta semana o de otra. */
export async function listOpenGoals(): Promise<Goal[]> {
  const goals = await db.goals.filter((g) => g.deletedAt === 0 && !g.done).toArray()
  return goals
}

/**
 * Returns `null` (not `undefined`) when the task has no linked goal, so a `useLiveQuery` consumer
 * can tell "still loading" (`undefined`) apart from "resolved, no goal linked" (`null`).
 */
export async function getGoalForTask(taskId: number): Promise<Goal | null> {
  // Índice multiEntry `*taskIds`: búsqueda directa en vez de recorrer todos los objetivos.
  const goal = await db.goals.where('taskIds').equals(taskId).filter((g) => g.deletedAt === 0).first()
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
  const goals = await db.goals.where('taskIds').equals(taskId).toArray()
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
