import type { Habit } from '../db/types'

/** A day "counts" when the logged value clears the habit's bar. */
export function isLogCompleted(habit: Pick<Habit, 'type' | 'targetValue'>, value: number): boolean {
  if (habit.type === 'binary' || habit.type === 'negative') {
    return value >= 1
  }
  return value >= (habit.targetValue ?? 1)
}

export function defaultLogValue(habit: Pick<Habit, 'type'>): number {
  return habit.type === 'binary' || habit.type === 'negative' ? 1 : 0
}
