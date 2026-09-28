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
  { key: 'first_task', title: 'Manos a la obra', description: 'Completaste tu primera tarea.', icon: 'zap' },
  { key: 'tasks_50', title: 'Productivo', description: 'Completaste 50 tareas.', icon: 'briefcase' },
  { key: 'tasks_200', title: 'Máquina de hacer', description: 'Completaste 200 tareas.', icon: 'gem' },
  { key: 'virtualization_streak_3', title: 'Primeras sincronizaciones', description: 'Virtualización 3 días seguidos.', icon: 'zap' },
  { key: 'virtualization_streak_7', title: 'Una semana virtualizado', description: 'Virtualización 7 días seguidos.', icon: 'flame' },
  { key: 'virtualization_streak_14', title: 'Dos semanas', description: 'Virtualización 14 días seguidos.', icon: 'sparkles' },
  { key: 'virtualization_streak_30', title: 'Un mes entero', description: 'Virtualización 30 días seguidos.', icon: 'shield' },
  { key: 'virtualization_streak_60', title: 'Dos meses', description: 'Virtualización 60 días seguidos.', icon: 'star' },
  { key: 'virtualization_streak_100', title: 'Presencia total', description: 'Virtualización 100 días seguidos.', icon: 'trophy' },
  { key: 'virtualization_streak_365', title: 'Un año entero', description: 'Virtualización 365 días seguidos.', icon: 'gem' },
]

export const ACHIEVEMENTS_BY_KEY = new Map(ACHIEVEMENTS.map((a) => [a.key, a]))
