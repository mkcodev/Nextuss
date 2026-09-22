import type { Detector } from '../types'

const MIN_SCHEDULED_DAYS = 7
const RISK_BEST_STREAK = 5
const RISK_COMPLIANCE = 0.5

/** Distinto de "racha rota": detecta un hábito que fue consistente y ahora está cayendo, aunque
 * su racha actual todavía no haya llegado a cero — el patrón, no solo el fallo puntual. */
export const habitAtRisk: Detector = (ctx) => {
  const candidates = ctx.habitMatrix.filter(
    (h) =>
      h.scheduledDays >= MIN_SCHEDULED_DAYS &&
      h.trend === 'down' &&
      h.bestStreak >= RISK_BEST_STREAK &&
      h.complianceRatio < RISK_COMPLIANCE,
  )
  if (candidates.length === 0) return null

  const worst = candidates.reduce((a, b) => (b.complianceRatio < a.complianceRatio ? b : a))

  return {
    key: 'habitAtRisk',
    title: `"${worst.name}" está perdiendo fuelle`,
    body: `Llegaste a una racha de ${worst.bestStreak} días, pero tu cumplimiento ha caído al ${Math.round(worst.complianceRatio * 100)}% y sigue bajando.`,
    severity: 'warn',
    confidence: Math.min(1, 1 - worst.complianceRatio),
    evidence: {
      kind: 'line',
      points: worst.streakSeries.map((s) => ({ label: s.date.slice(5), value: s.streak })),
    },
    action: { label: 'Revisar el hábito', kind: 'reschedule', payload: { habitId: worst.habitId } },
  }
}
