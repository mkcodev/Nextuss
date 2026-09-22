import { useLiveQuery } from 'dexie-react-hooks'
import type { Habit, HabitLog } from '../../db/types'
import { getHabitLogs, getLogsForDate, listHabits } from '../../db/repositories/habits'
import { calculateStreak } from '../../lib/streaks'
import { parseDateKey } from '../../lib/dates'

export interface HabitWithStats {
  habit: Habit
  log?: HabitLog
  streak: { current: number; longest: number }
}

/** All non-archived habits, each paired with its log for `date` (if any) and its current/longest streak as of that date. */
export function useHabitsWithStats(date: string): HabitWithStats[] | undefined {
  return useLiveQuery(async () => {
    const habits = await listHabits()
    const logsForDate = await getLogsForDate(date)
    const logByHabitId = new Map(logsForDate.map((log) => [log.habitId, log]))
    const referenceDate = parseDateKey(date)

    const rows: HabitWithStats[] = []
    for (const habit of habits) {
      const allLogs = await getHabitLogs(habit.id!)
      rows.push({
        habit,
        log: logByHabitId.get(habit.id!),
        streak: calculateStreak(habit, allLogs, referenceDate),
      })
    }
    return rows
  }, [date])
}
