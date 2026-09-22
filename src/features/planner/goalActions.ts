import { toggleGoalDone } from '../../db/repositories/goals'
import { useToastStore } from '../../lib/toastStore'
import { ACHIEVEMENTS_BY_KEY } from '../../lib/achievements'

/** Thin wrapper around toggleGoalDone that surfaces the XP/celebration and unlocked achievements as toasts. */
export async function toggleGoalDoneWithFeedback(id: number, title: string) {
  const result = await toggleGoalDone(id)
  const push = useToastStore.getState().push

  if (result.done) {
    push({
      title: '¡Objetivo cumplido!',
      description: `"${title}" — +${result.xpDelta} XP`,
      icon: 'trophy',
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
