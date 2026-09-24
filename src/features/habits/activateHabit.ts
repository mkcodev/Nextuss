import { logHabitWithFeedback } from './actions'
import { useToastStore } from '../../lib/toastStore'
import type { HabitWithStats } from './useHabitsWithStats'

/** Shared "Enter" behavior for a keyboard-selected habit: toggle for binary/negative, bump one step for quantity/duration.
 * Los callers lo disparan sin `await` (atajo de teclado), así que el fallo se avisa aquí con un toast:
 * sin esto, un error de escritura dejaba el hábito sin marcar y sin ninguna señal. */
export async function activateHabitEntry(entry: HabitWithStats, date: string): Promise<void> {
  const { habit, log } = entry
  try {
    if (habit.type === 'binary' || habit.type === 'negative') {
      await logHabitWithFeedback(habit.id!, date, log?.completed ? 0 : 1)
    } else {
      const step = habit.unit === 'min' ? 5 : 1
      await logHabitWithFeedback(habit.id!, date, (log?.value ?? 0) + step)
    }
  } catch {
    useToastStore.getState().push({
      title: 'No se pudo registrar el hábito',
      description: `"${habit.name}" no se ha guardado. Inténtalo de nuevo.`,
      variant: 'error',
    })
  }
}
