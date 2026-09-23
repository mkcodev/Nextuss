import { useLiveQuery } from 'dexie-react-hooks'
import type { Habit, HabitLog } from '../../db/types'
import { getHabitLogsForHabits, getLogsForDate, listHabits } from '../../db/repositories/habits'
import { calculateStreak } from '../../lib/streaks'
import { parseDateKey } from '../../lib/dates'

export interface HabitWithStats {
  habit: Habit
  log?: HabitLog
  streak: { current: number; longest: number }
}

/** Habits (archived included on request), each paired with its log for `date` (if any) and its current/longest streak as of that date. */
export function useHabitsWithStats(date: string, includeArchived = false): HabitWithStats[] | undefined {
  return useLiveQuery(async () => {
    const habits = await listHabits(includeArchived)
    const logsForDate = await getLogsForDate(date)
    const logByHabitId = new Map(logsForDate.map((log) => [log.habitId, log]))
    const referenceDate = parseDateKey(date)

    // Una sola consulta indexada para todos los hábitos en vez de una por hábito (N+1).
    const allLogs = await getHabitLogsForHabits(habits.map((h) => h.id!))
    const logsByHabit = new Map<number, HabitLog[]>()
    for (const log of allLogs) {
      const arr = logsByHabit.get(log.habitId)
      if (arr) arr.push(log)
      else logsByHabit.set(log.habitId, [log])
    }

    return habits.map((habit) => ({
      habit,
      log: logByHabitId.get(habit.id!),
      streak: calculateStreak(habit, logsByHabit.get(habit.id!) ?? [], referenceDate),
    }))
  }, [date, includeArchived])
}
