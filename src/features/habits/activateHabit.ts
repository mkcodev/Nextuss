import { logHabitWithFeedback } from './actions'
import type { HabitWithStats } from './useHabitsWithStats'

/** Shared "Enter" behavior for a keyboard-selected habit: toggle for binary/negative, bump one step for quantity/duration. */
export function activateHabitEntry(entry: HabitWithStats, date: string) {
  const { habit, log } = entry
  if (habit.type === 'binary' || habit.type === 'negative') {
    logHabitWithFeedback(habit.id!, date, log?.completed ? 0 : 1)
  } else {
    const step = habit.unit === 'min' ? 5 : 1
    logHabitWithFeedback(habit.id!, date, (log?.value ?? 0) + step)
  }
}
