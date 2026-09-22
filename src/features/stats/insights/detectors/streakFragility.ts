import type { Detector } from '../types'

const MIN_STREAK = 3
const FRAGILE_COMPLIANCE = 0.6

/** Una racha viva que no refleja consistencia real de fondo — se sostiene, pero el hábito falla
 * a menudo fuera de esa racha. Distinto de `habitAtRisk`, que mira la tendencia, no el contraste
 * entre la racha actual y el cumplimiento general. */
export const streakFragility: Detector = (ctx) => {
  const candidates = ctx.habitMatrix.filter((h) => h.currentStreak >= MIN_STREAK && h.complianceRatio < FRAGILE_COMPLIANCE)
  if (candidates.length === 0) return null

  const worst = candidates.reduce((a, b) => (b.complianceRatio < a.complianceRatio ? b : a))

  return {
    key: 'streakFragility',
    title: `La racha de "${worst.name}" pende de un hilo`,
    body: `Llevas ${worst.currentStreak} días seguidos, pero en todo el periodo solo cumpliste un ${Math.round(worst.complianceRatio * 100)}% — un fallo más y vuelves a empezar de una base floja.`,
    severity: 'neutral',
    confidence: Math.min(1, worst.currentStreak / 10),
  }
}
