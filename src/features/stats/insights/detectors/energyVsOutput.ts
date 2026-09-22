import { pearsonCorrelation } from '../correlation'
import type { Detector } from '../types'

const MIN_SAMPLE = 6

export const energyVsOutput: Detector = (ctx) => {
  const pairs = ctx.points.filter((p) => p.energy != null)
  if (pairs.length < MIN_SAMPLE) return null

  const energy = pairs.map((p) => p.energy!)
  const output = pairs.map((p) => p.tasksCompleted + p.focusMin / 30)
  const { r, n, strengthLabel } = pearsonCorrelation(energy, output)
  if (strengthLabel === 'ninguna' || strengthLabel === 'débil') return null

  const direction = r > 0 ? 'sube' : 'baja'
  return {
    key: 'energyVsOutput',
    title: `Tu energía y tu productividad van de la mano`,
    body: `Cuando tu energía ${r > 0 ? 'es alta' : 'es baja'}, tu producción (tareas + foco) ${direction} — correlación ${strengthLabel} (n=${n}).`,
    severity: 'neutral',
    confidence: Math.min(1, Math.abs(r)),
    evidence: {
      kind: 'line',
      points: pairs.map((p) => ({ label: p.date.slice(5), value: p.energy! })),
    },
  }
}
