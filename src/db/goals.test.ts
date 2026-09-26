import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  carryOverGoal,
  createGoal,
  getGoalForTask,
  getNorthStarStreak,
  getPriorityGoal,
  listGoalsForPeriod,
  listOpenGoals,
  setGoalForTask,
  setPriorityGoal,
  toggleGoalDone,
  trashGoal,
} from './repositories/goals'
import { createTask, toggleTaskDone } from './repositories/tasks'
import { createAttribute, getOrCreateProgress } from './repositories/gamification'
import { XP_PER_GOAL_MONTH, XP_PER_GOAL_WEEK } from '../lib/xp'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
})

const week = (periodKey: string, title = 'Objetivo') => createGoal({ period: 'week', periodKey, title })

describe('createGoal / listGoalsForPeriod', () => {
  it('trims input and scopes the list to one period, without trashed goals', async () => {
    const id = await createGoal({ period: 'week', periodKey: '2026-W39', title: '  Terminar informe ', notes: '   ' })
    await week('2026-W40', 'Otra semana')
    const trashed = await week('2026-W39', 'Borrado')
    await trashGoal(trashed)

    const goals = await listGoalsForPeriod('week', '2026-W39')
    expect(goals.map((g) => g.id)).toEqual([id])
    expect(goals[0]).toMatchObject({ title: 'Terminar informe', notes: undefined, done: false, isPriority: false })
  })
})

describe('toggleGoalDone', () => {
  it('grants week/month XP, unlocks first_goal once, and reverts on undo', async () => {
    const attributeId = (await createAttribute({ name: 'Trabajo', icon: 'briefcase', color: '#000' })) as number
    const w = await createGoal({ period: 'week', periodKey: '2026-W39', title: 'Semana', attributeId })
    const m = await createGoal({ period: 'month', periodKey: '2026-09', title: 'Mes' })

    const r1 = await toggleGoalDone(w)
    expect(r1).toMatchObject({ done: true, xpDelta: XP_PER_GOAL_WEEK })
    expect(r1.unlockedAchievements).toEqual(['first_goal'])
    expect((await db.goals.get(w))!.completedAt).toBeTypeOf('number')
    expect((await db.attributes.get(attributeId))!.xp).toBe(XP_PER_GOAL_WEEK)

    const r2 = await toggleGoalDone(m)
    expect(r2.xpDelta).toBe(XP_PER_GOAL_MONTH)
    expect(r2.unlockedAchievements).toEqual([])
    expect((await getOrCreateProgress()).totalXp).toBe(XP_PER_GOAL_WEEK + XP_PER_GOAL_MONTH)

    const undo = await toggleGoalDone(w)
    expect(undo).toMatchObject({ done: false, xpDelta: -XP_PER_GOAL_WEEK })
    expect((await db.goals.get(w))!.completedAt).toBeUndefined()
    expect((await getOrCreateProgress()).totalXp).toBe(XP_PER_GOAL_MONTH)
  })
})

describe('priority (North Star)', () => {
  it('is exclusive within a period and toggles off', async () => {
    const a = await week('2026-W39', 'A')
    const b = await week('2026-W39', 'B')
    const other = await week('2026-W40', 'C')
    await setPriorityGoal(other)

    expect(await getPriorityGoal('week', '2026-W39')).toBeNull()
    expect(await setPriorityGoal(a)).toBe(true)
    expect(await setPriorityGoal(b)).toBe(true)
    expect((await getPriorityGoal('week', '2026-W39'))!.id).toBe(b)
    expect((await db.goals.get(a))!.isPriority).toBe(false)
    expect((await db.goals.get(other))!.isPriority).toBe(true)

    expect(await setPriorityGoal(b)).toBe(false)
    expect(await getPriorityGoal('week', '2026-W39')).toBeNull()
  })

  it('counts consecutive completed priority weeks and unlocks north_star_4', async () => {
    const keys = ['2026-W36', '2026-W37', '2026-W38', '2026-W39']
    let last
    for (const k of keys) {
      const id = await week(k)
      await setPriorityGoal(id)
      last = await toggleGoalDone(id)
    }
    expect(await getNorthStarStreak('week', '2026-W39')).toBe(4)
    expect(last!.unlockedAchievements).toContain('north_star_4')
    // The in-progress current week doesn't break the streak.
    expect(await getNorthStarStreak('week', '2026-W40')).toBe(4)
  })
})

describe('task links', () => {
  it('moves a task between goals and finds it through the multiEntry index', async () => {
    const task = await createTask({ title: 'Escribir' })
    const a = await week('2026-W39', 'A')
    const b = await week('2026-W39', 'B')

    await setGoalForTask(task, a)
    expect((await getGoalForTask(task))!.id).toBe(a)
    await setGoalForTask(task, a) // idempotent
    expect((await db.goals.get(a))!.taskIds).toEqual([task])

    await setGoalForTask(task, b)
    expect((await db.goals.get(a))!.taskIds).toEqual([])
    expect((await getGoalForTask(task))!.id).toBe(b)

    await setGoalForTask(task, undefined)
    expect(await getGoalForTask(task)).toBeNull()
  })
})

describe('carryOverGoal', () => {
  it('copies the goal into the new period with only its open tasks', async () => {
    const open = await createTask({ title: 'Pendiente' })
    const done = await createTask({ title: 'Hecha' })
    await toggleTaskDone(done)
    const id = await week('2026-W39', 'Seguir')
    await setGoalForTask(open, id)
    await setGoalForTask(done, id)
    await setPriorityGoal(id)

    const copy = await carryOverGoal(id, '2026-W40')
    expect(await db.goals.get(copy)).toMatchObject({
      periodKey: '2026-W40',
      title: 'Seguir',
      carriedFromGoalId: id,
      taskIds: [open],
      done: false,
      isPriority: false,
    })
    expect((await listOpenGoals()).map((g) => g.id).sort()).toEqual([id, copy].sort())
  })
})
