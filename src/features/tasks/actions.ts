import { toggleTaskDone } from '../../db/repositories/tasks'
import { useToastStore } from '../../lib/toastStore'
import { ACHIEVEMENTS_BY_KEY } from '../../lib/achievements'

/** Thin wrapper around toggleTaskDone that surfaces the XP/celebration and unlocked achievements as
 * toasts — mismo patrón que `logHabitWithFeedback`/`toggleGoalDoneWithFeedback`. */
export async function toggleTaskDoneWithFeedback(id: number, title: string) {
  const result = await toggleTaskDone(id)
  const push = useToastStore.getState().push

  if (result.done && result.xpDelta > 0) {
    push({
      title: '¡Tarea completada!',
      description: `"${title}" — +${result.xpDelta} XP`,
      icon: 'zap',
      variant: 'celebrate',
    })
  }

  if (result.leveledUp) {
    push({ title: `¡Nivel ${result.newLevel}!`, description: 'Subiste de nivel.', icon: 'star' })
  }
  for (const key of result.unlockedAchievements) {
    const def = ACHIEVEMENTS_BY_KEY.get(key)
    if (def) push({ title: def.title, description: def.description, icon: def.icon })
  }

  return result
}
