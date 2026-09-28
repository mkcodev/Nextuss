import { setHabitLog } from '../../db/repositories/habits'
import { useToastStore } from '../../lib/toastStore'
import { ACHIEVEMENTS_BY_KEY } from '../../lib/achievements'
import { XP_PER_COMPLETION } from '../../lib/xp'

/** Thin wrapper around setHabitLog that surfaces level-ups and unlocked achievements as toasts. */
export async function logHabitWithFeedback(
  habitId: number,
  date: string,
  value: number,
  note?: string,
) {
  const result = await setHabitLog(habitId, date, value, note)
  const push = useToastStore.getState().push

  if (result.newlyCompleted) {
    const streak = result.streak > 1 ? ` · racha de ${result.streak} días` : ''
    push({
      title: result.habitName,
      description: `+${XP_PER_COMPLETION} XP${streak}`,
      icon: 'flame',
      variant: 'success',
      action: { label: 'Deshacer', onClick: () => void setHabitLog(habitId, date, result.previousValue, note) },
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
