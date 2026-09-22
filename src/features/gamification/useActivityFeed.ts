import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/schema'
import { ACHIEVEMENTS_BY_KEY } from '../../lib/achievements'
import type { IconKey } from '../../design/icons'

export interface ActivityItem {
  id: string
  type: 'habit' | 'achievement' | 'goal'
  time: number
  title: string
  subtitle: string
  icon: IconKey
  color?: string
}

const LIMIT = 20

export function useActivityFeed() {
  return useLiveQuery(async () => {
    const [logs, achievements, habits, goals] = await Promise.all([
      db.habitLogs.orderBy('loggedAt').reverse().limit(LIMIT).toArray(),
      db.achievements.orderBy('unlockedAt').reverse().limit(LIMIT).toArray(),
      db.habits.toArray(),
      db.goals.filter((g) => g.done && g.completedAt != null).toArray(),
    ])
    const habitById = new Map(habits.map((h) => [h.id, h]))

    const items: ActivityItem[] = []

    for (const log of logs) {
      if (!log.completed) continue
      const habit = habitById.get(log.habitId)
      if (!habit) continue
      items.push({
        id: `log-${log.id}`,
        type: 'habit',
        time: log.loggedAt,
        title: habit.name,
        subtitle: 'Completado',
        icon: habit.icon as IconKey,
        color: habit.color,
      })
    }

    for (const g of goals) {
      items.push({
        id: `goal-${g.id}`,
        type: 'goal',
        time: g.completedAt!,
        title: g.title,
        subtitle: g.period === 'week' ? 'Objetivo de semana cumplido' : 'Objetivo de mes cumplido',
        icon: 'target',
      })
    }

    for (const a of achievements) {
      const def = ACHIEVEMENTS_BY_KEY.get(a.key)
      if (!def) continue
      items.push({
        id: `ach-${a.id}`,
        type: 'achievement',
        time: a.unlockedAt,
        title: def.title,
        subtitle: 'Logro desbloqueado',
        icon: def.icon,
      })
    }

    return items.sort((a, b) => b.time - a.time).slice(0, LIMIT)
  }, [])
}
