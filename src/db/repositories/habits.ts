import { db } from '../schema'
import type { Habit, HabitLog } from '../types'
import { isLogCompleted } from '../../lib/habits'
import { calculateStreak, findYesterdayMiss } from '../../lib/streaks'
import { XP_PER_COMPLETION } from '../../lib/xp'
import { isPeriodicHabit, parseDateKey } from '../../lib/dates'
import { STREAK_ACHIEVEMENT_THRESHOLDS, LEVEL_ACHIEVEMENT_THRESHOLDS } from '../../lib/achievementThresholds'
import { trashRows } from '../trash'
import {
  applyAttributeXpDelta,
  applyXpDelta,
  consumeShield,
  refillShieldsIfNewMonth,
  unlockAchievement,
} from './gamification'

export async function listHabits(includeArchived = false): Promise<Habit[]> {
  const all = await db.habits.toArray()
  return all
    .filter((h) => h.deletedAt === 0 && (includeArchived || !h.archived))
    .sort((a, b) => a.sortKey - b.sortKey)
}

/** Reordena un hábito entre sus dos vecinos actuales (mismo patrón que `tasks.ts#moveTaskBetween`). */
export function moveHabitBetween(habitId: number, beforeSortKey: number | null, afterSortKey: number | null) {
  let sortKey: number
  if (beforeSortKey == null && afterSortKey == null) sortKey = Date.now()
  else if (beforeSortKey == null) sortKey = afterSortKey! - 1000
  else if (afterSortKey == null) sortKey = beforeSortKey + 1000
  else sortKey = (beforeSortKey + afterSortKey) / 2
  return db.habits.update(habitId, { sortKey })
}

/** Vacaciones: rango inclusive durante el cual el hábito no cuenta como programado (ni rompe racha). */
export function pauseHabit(id: number, pausedFrom: string, pausedUntil: string) {
  return db.habits.update(id, { pausedFrom, pausedUntil })
}

export function resumeHabit(id: number) {
  return db.habits.update(id, { pausedFrom: undefined, pausedUntil: undefined })
}

export async function addSkipDate(id: number, date: string) {
  const habit = await db.habits.get(id)
  if (!habit || habit.skipDates?.includes(date)) return
  await db.habits.update(id, { skipDates: [...(habit.skipDates ?? []), date].sort() })
}

export async function removeSkipDate(id: number, date: string) {
  const habit = await db.habits.get(id)
  if (!habit) return
  await db.habits.update(id, { skipDates: (habit.skipDates ?? []).filter((d) => d !== date) })
}

export function getHabit(id: number) {
  return db.habits.get(id)
}

export async function createHabit(
  input: Omit<Habit, 'id' | 'createdAt' | 'archived' | 'deletedAt' | 'sortKey'>,
): Promise<number> {
  const isFirst = (await db.habits.count()) === 0
  const id = (await db.habits.add({
    ...input,
    archived: false,
    createdAt: Date.now(),
    deletedAt: 0,
    sortKey: Date.now(),
  })) as number
  if (isFirst) await unlockAchievement('first_habit')
  return id
}

export function updateHabit(id: number, changes: Partial<Omit<Habit, 'id'>>) {
  return db.habits.update(id, changes)
}

export function archiveHabit(id: number, archived = true) {
  return db.habits.update(id, { archived })
}

/** Mueve el hábito a la papelera. Su historial (`habitLogs`) se queda intacto y oculto hasta que se
 * restaure, y se borra de verdad solo cuando la papelera lo purga a los 30 días. */
export async function trashHabit(id: number): Promise<void> {
  const habit = await db.habits.get(id)
  if (!habit) return
  await trashRows('habits', [id], `Hábito eliminado: "${habit.name}"`)
}

export function getHabitLogs(habitId: number) {
  return db.habitLogs.where('habitId').equals(habitId).toArray()
}

/** Logs de varios hábitos en una sola consulta indexada — evita el N+1 de pedirlos uno a uno por hábito. */
export function getHabitLogsForHabits(habitIds: number[]): Promise<HabitLog[]> {
  if (habitIds.length === 0) return Promise.resolve([])
  return db.habitLogs.where('habitId').anyOf(habitIds).toArray()
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
  return db.transaction(
    'rw',
    db.habits,
    db.habitLogs,
    db.progress,
    db.attributes,
    db.achievements,
    async () => {
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
        for (const t of STREAK_ACHIEVEMENT_THRESHOLDS) {
          if (current >= t.streak) await tryUnlock(t.key)
        }
      }

      if (leveledUp) {
        for (const t of LEVEL_ACHIEVEMENT_THRESHOLDS) {
          if (newLevel >= t.level) await tryUnlock(t.key)
        }
      }

      return { completed, leveledUp, newLevel, streak: current, unlockedAchievements }
    },
  )
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
    // "X veces/semana|mes" siempre es "elegible" (ver `isHabitScheduledOn`), así que "ayer sin
    // registrar" no significa nada para él — su noción de fallo es semanal/mensual, no diaria, y
    // gastar un escudo cada día sin log sería un bug real, no una vacación legítima.
    if (isPeriodicHabit(habit)) continue
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
