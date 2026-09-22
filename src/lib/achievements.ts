import type { IconKey } from '../design/icons'

export interface AchievementDef {
  key: string
  title: string
  description: string
  icon: IconKey
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { key: 'first_habit', title: 'El comienzo', description: 'Creaste tu primer hábito.', icon: 'leaf' },
  { key: 'first_completion', title: 'Primer paso', description: 'Completaste un hábito por primera vez.', icon: 'sparkles' },
  { key: 'streak_7', title: 'Una semana', description: 'Alcanzaste una racha de 7 días.', icon: 'flame' },
  { key: 'streak_30', title: 'Un mes', description: 'Alcanzaste una racha de 30 días.', icon: 'trophy' },
  { key: 'streak_100', title: 'Imparable', description: 'Alcanzaste una racha de 100 días.', icon: 'gem' },
  { key: 'level_5', title: 'Nivel 5', description: 'Tu personaje alcanzó el nivel 5.', icon: 'star' },
  { key: 'level_10', title: 'Nivel 10', description: 'Tu personaje alcanzó el nivel 10.', icon: 'award' },
  { key: 'first_goal', title: 'Rumbo fijado', description: 'Completaste tu primer objetivo.', icon: 'target' },
  {
    key: 'first_priority_goal',
    title: 'Norte claro',
    description: 'Marcaste tu primer objetivo principal.',
    icon: 'compass',
  },
  {
    key: 'north_star_4',
    title: 'Constancia',
    description: 'Cumpliste tu objetivo principal 4 periodos seguidos.',
    icon: 'flag',
  },
]

export const ACHIEVEMENTS_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]))
