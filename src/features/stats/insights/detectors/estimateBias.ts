import { buildEstimateAccuracy } from '../../aggregate'
import type { Detector } from '../types'

const MIN_SAMPLE = 5

export const estimateBias: Detector = (ctx) => {
  const result = buildEstimateAccuracy(ctx.tasksCompleted)
  if (result.sampleSize < MIN_SAMPLE || result.medianRatio == null) return null

  const accurate = result.medianRatio >= 0.9 && result.medianRatio <= 1.1
  if (accurate) return null

  const ratios = ctx.tasksCompleted
    .filter((t) => t.estimateMin && t.estimateMin > 0 && t.actualMin != null)
    .map((t) => t.actualMin! / t.estimateMin!)

  return {
    key: 'estimateBias',
    title: result.medianRatio > 1 ? 'Sueles subestimar cuánto tardas' : 'Sueles sobrestimar cuánto tardas',
    body: `${result.biasLabel} (mediana sobre ${result.sampleSize} tareas). Ajusta tus estimaciones futuras con este factor.`,
    severity: 'neutral',
    confidence: Math.min(1, Math.abs(result.medianRatio - 1)),
    evidence: {
      kind: 'bar',
      points: ratios.map((r, i) => ({ label: String(i + 1), value: Math.round(r * 100) })),
    },
  }
}
