import { pearsonCorrelation } from '../correlation'
import type { Detector } from '../types'

const MIN_SAMPLE = 6

export const moodVsHabits: Detector = (ctx) => {
  const pairs = ctx.points.filter((p) => p.mood != null && p.habitsScheduled > 0)
  if (pairs.length < MIN_SAMPLE) return null

  const mood = pairs.map((p) => p.mood!)
  const compliance = pairs.map((p) => p.complianceRatio)
  const { r, n, strengthLabel } = pearsonCorrelation(mood, compliance)
  if (strengthLabel === 'ninguna' || strengthLabel === 'débil') return null

  return {
    key: 'moodVsHabits',
    title: 'Tu ánimo se refleja en tus hábitos',
    body: `Tu ánimo y el cumplimiento de tus hábitos tienen una correlación ${strengthLabel} (n=${n}) — ${r > 0 ? 'mejor ánimo, más hábitos cumplidos' : 'peor ánimo, menos hábitos cumplidos'}.`,
    severity: 'neutral',
    confidence: Math.min(1, Math.abs(r)),
    evidence: {
      kind: 'line',
      points: pairs.map((p) => ({ label: p.date.slice(5), value: p.mood! })),
    },
  }
}
