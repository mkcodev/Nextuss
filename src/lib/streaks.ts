import { subDays } from 'date-fns'
import type { Habit, HabitLog } from '../db/types'
import { dateKey, isHabitScheduledOn } from './dates'

export const SHIELDS_PER_MONTH = 2

export interface StreakResult {
  current: number
  longest: number
}

/**
 * Walks backward day by day from `referenceDate` down to the habit's
 * creation date. Only scheduled days count. A completed day extends the
 * streak; a shielded day (missed but absorbed by a streak shield) preserves
 * it without extending it; today is never allowed to break the streak since
 * it may simply not be logged yet. Any other missed scheduled day breaks it.
 */
export function calculateStreak(
  habit: Habit,
  logs: HabitLog[],
  referenceDate: Date = new Date(),
): StreakResult {
  const logsByDate = new Map(logs.map((log) => [log.date, log]))

  let current = 0
  let longest = 0
  let running = 0
  let cursor = new Date(referenceDate)
  cursor.setHours(0, 0, 0, 0)
  const createdAt = new Date(habit.createdAt)
  createdAt.setHours(0, 0, 0, 0)
  let stillCountingCurrent = true
  let isFirstScheduledDay = true

  while (cursor >= createdAt) {
    if (isHabitScheduledOn(habit, cursor)) {
      const log = logsByDate.get(dateKey(cursor))
      const isToday = isFirstScheduledDay && sameCalendarDay(cursor, referenceDate)

      if (log?.completed) {
        running += 1
        longest = Math.max(longest, running)
        if (stillCountingCurrent) current = running
      } else if (log?.shieldUsed) {
        longest = Math.max(longest, running)
        // streak preserved but not extended
      } else if (isToday) {
        // day not over yet — don't break, don't count
      } else {
        running = 0
        stillCountingCurrent = false
      }
      isFirstScheduledDay = false
    }
    cursor = subDays(cursor, 1)
  }

  return { current, longest }
}

/** True if `habit` was scheduled on `date`, has no log at all, and the date isn't today. */
function isUnloggedMiss(habit: Habit, logs: HabitLog[], date: Date, today: Date): boolean {
  if (!isHabitScheduledOn(habit, date)) return false
  if (sameCalendarDay(date, today)) return false
  const key = dateKey(date)
  return !logs.some((log) => log.date === key)
}

/**
 * Checks only yesterday for an un-logged scheduled miss (the boundary that
 * just closed). Deeper back-filling is intentionally out of scope — see
 * plan notes on shield reconciliation.
 */
export function findYesterdayMiss(
  habit: Habit,
  logs: HabitLog[],
  today: Date = new Date(),
): string | null {
  const yesterday = subDays(today, 1)
  return isUnloggedMiss(habit, logs, yesterday, today) ? dateKey(yesterday) : null
}

function sameCalendarDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b)
}
