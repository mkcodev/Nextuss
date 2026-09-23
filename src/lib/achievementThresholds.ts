// Umbrales de logros centralizados — antes duplicados como literales sueltos en
// `db/repositories/habits.ts`, `db/repositories/goals.ts` y `db/demoSeed.ts`. Una sola fuente de
// verdad para que un cambio de umbral no pueda desincronizar el generador de datos de ejemplo del
// código real.
export const STREAK_ACHIEVEMENT_THRESHOLDS: ReadonlyArray<{ streak: number; key: string }> = [
  { streak: 7, key: 'streak_7' },
  { streak: 30, key: 'streak_30' },
  { streak: 100, key: 'streak_100' },
]

export const LEVEL_ACHIEVEMENT_THRESHOLDS: ReadonlyArray<{ level: number; key: string }> = [
  { level: 5, key: 'level_5' },
  { level: 10, key: 'level_10' },
]

export const NORTH_STAR_STREAK_ACHIEVEMENT_THRESHOLD = 4

/** Tareas raíz completadas en total (Fase 8.6) — las subtareas no cuentan, igual que no puntúan XP. */
export const TASK_COUNT_ACHIEVEMENT_THRESHOLDS: ReadonlyArray<{ count: number; key: string }> = [
  { count: 50, key: 'tasks_50' },
  { count: 200, key: 'tasks_200' },
]
