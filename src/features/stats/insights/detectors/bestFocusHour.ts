import type { Detector } from '../types'

const MIN_TOTAL_FOCUS_MIN = 60

export const bestFocusHour: Detector = (ctx) => {
  const totalFocusMin = ctx.hourHistogram.reduce((sum, h) => sum + h.focusMin, 0)
  if (totalFocusMin < MIN_TOTAL_FOCUS_MIN) return null

  const best = ctx.hourHistogram.reduce((a, b) => (b.focusMin > a.focusMin ? b : a))
  if (best.focusMin === 0) return null

  const share = best.focusMin / totalFocusMin

  return {
    key: 'bestFocusHour',
    title: `Tu mejor franja de foco es a las ${String(best.hour).padStart(2, '0')}:00`,
    body: `Un ${Math.round(share * 100)}% de tus minutos de foco caen en esa hora — si puedes, reserva ahí tu tarea más exigente.`,
    severity: 'good',
    confidence: Math.min(1, share * 2),
    evidence: {
      kind: 'bar',
      points: ctx.hourHistogram
        .filter((h) => h.focusMin > 0)
        .map((h) => ({ label: `${String(h.hour).padStart(2, '0')}h`, value: h.focusMin })),
    },
  }
}
