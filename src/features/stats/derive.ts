// Barril de reutilización para la Fase 4: las estadísticas necesitan la misma lógica de XP/nivel,
// rachas, "¿cuenta este día?" y periodos que ya vive en hábitos/gamificación/planner — este
// archivo la re-expone bajo el namespace de `features/stats` en vez de duplicarla.
export { levelForXp, progressForXp, xpForLevel, type LevelProgress } from '../../lib/xp'
export { calculateStreak, findYesterdayMiss, SHIELDS_PER_MONTH, type StreakResult } from '../../lib/streaks'
export { isLogCompleted, defaultLogValue } from '../../lib/habits'
export {
  goalElapsedRatio,
  nextPeriodKey,
  parsePeriodKey,
  periodElapsedRatio,
  previousPeriodKey,
  shiftPeriodKey,
} from '../../lib/periods'
