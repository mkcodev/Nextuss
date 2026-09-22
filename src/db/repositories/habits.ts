import { db } from '../schema'
import type { Habit } from '../types'
import { isLogCompleted } from '../../lib/habits'
import { calculateStreak, findYesterdayMiss } from '../../lib/streaks'
import { XP_PER_COMPLETION } from '../../lib/xp'
import { parseDateKey } from '../../lib/dates'
import {
  applyAttributeXpDelta,
  applyXpDelta,
  consumeShield,
  refillShieldsIfNewMonth,
  unlockAchievement,
} from './gamification'

export async function listHabits(includeArchived = false): Promise<Habit[]> {
  const all = await db.habits.toArray()
  return includeArchived ? all : all.filter((h) => !h.archived)
}

export function getHabit(id: number) {
  return db.habits.get(id)
}

export async function createHabit(
  input: Omit<Habit, 'id' | 'createdAt' | 'archived'>,
): Promise<number> {
  const isFirst = (await db.habits.count()) === 0
  const id = (await db.habits.add({ ...input, archived: false, createdAt: Date.now() })) as number
  if (isFirst) await unlockAchievement('first_habit')
  return id
}

export function updateHabit(id: number, changes: Partial<Omit<Habit, 'id'>>) {
  return db.habits.update(id, changes)
}

export function archiveHabit(id: number, archived = true) {
  return db.habits.update(id, { archived })
}

export function deleteHabit(id: number) {
  return db.transaction('rw', db.habits, db.habitLogs, async () => {
    await db.habitLogs.where('habitId').equals(id).delete()
    await db.habits.delete(id)
  })
}

export function getHabitLogs(habitId: number) {
  return db.habitLogs.where('habitId').equals(habitId).toArray()
}

export function getLogsForDate(date: string) {
  return db.habitLogs.where('date').equals(date).toArray()
}

export function getLog(habitId: number, date: string) {
  return db.habitLogs.where('[habitId+date]').equals([habitId, date]).first()
}

export async function getStreakForHabit(habitId: number, referenceDate: Date = new Date()) {
  const habit = await db.habits.get(habitId)
  if (!habit) return { current: 0, longest: 0 }
  const logs = await getHabitLogs(habitId)
  return calculateStreak(habit, logs, referenceDate)
}

export interface LogHabitResult {
  completed: boolean
  leveledUp: boolean
  newLevel: number
  streak: number
  unlockedAchievements: string[]
}

/** Records (or overwrites) today's value for a habit, then reconciles XP, level and achievements around the change. */
export async function setHabitLog(
  habitId: number,
  date: string,
  value: number,
  note?: string,
): Promise<LogHabitResult> {
  const habit = await db.habits.get(habitId)
  if (!habit) throw new Error(`Habit ${habitId} not found`)

  const completed = isLogCompleted(habit, value)
  const existing = await getLog(habitId, date)
  const wasCompleted = existing?.completed ?? false

  const loggedAt = Date.now()
  if (existing) {
    await db.habitLogs.update(existing.id!, { value, completed, note, shieldUsed: false, loggedAt })
  } else {
    await db.habitLogs.add({ habitId, date, value, completed, note, shieldUsed: false, loggedAt })
  }

  let leveledUp = false
  let newLevel = 1
  const delta = (completed ? 1 : 0) - (wasCompleted ? 1 : 0)
  if (delta !== 0) {
    const xpDelta = delta * XP_PER_COMPLETION
    const result = await applyXpDelta(xpDelta)
    leveledUp = result.leveledUp
    newLevel = result.level
    await applyAttributeXpDelta(habit.attributeId, xpDelta)
  }

  const logs = await getHabitLogs(habitId)
  const { current } = calculateStreak(habit, logs, parseDateKey(date))

  const unlockedAchievements: string[] = []
  const tryUnlock = async (key: string) => {
    if (await unlockAchievement(key)) unlockedAchievements.push(key)
  }

  if (completed && !wasCompleted) {
    await tryUnlock('first_completion')
    if (current >= 7) await tryUnlock('streak_7')
    if (current >= 30) await tryUnlock('streak_30')
    if (current >= 100) await tryUnlock('streak_100')
  }

  if (leveledUp) {
    if (newLevel >= 5) await tryUnlock('level_5')
    if (newLevel >= 10) await tryUnlock('level_10')
  }

  return { completed, leveledUp, newLevel, streak: current, unlockedAchievements }
}

/**
 * Refills the monthly shield pool if needed, then checks each active habit
 * for an un-logged miss on *yesterday* and auto-absorbs it with a shield
 * while any remain. Intended to run once per app session/day.
 */
export async function reconcileShields(today: Date = new Date()): Promise<void> {
  await refillShieldsIfNewMonth()
  const habits = await listHabits()
  for (const habit of habits) {
    const logs = await getHabitLogs(habit.id!)
    const missDate = findYesterdayMiss(habit, logs, today)
    if (!missDate) continue
    const granted = await consumeShield()
    if (granted) {
      await db.habitLogs.add({
        habitId: habit.id!,
        date: missDate,
        value: 0,
        completed: false,
        shieldUsed: true,
        loggedAt: Date.now(),
      })
    }
  }
}
