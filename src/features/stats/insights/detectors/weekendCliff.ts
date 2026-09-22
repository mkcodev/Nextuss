import { buildWeekdayProfile } from '../../aggregate'
import type { Detector } from '../types'

const MIN_GAP = 0.2

function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

export const weekendCliff: Detector = (ctx) => {
  const profile = buildWeekdayProfile(ctx.points)
  const weekend = profile.filter((p) => (p.weekday === 0 || p.weekday === 6) && p.sampleSize >= 2)
  const weekdays = profile.filter((p) => p.weekday >= 1 && p.weekday <= 5 && p.sampleSize >= 2)
  if (weekend.length < 2 || weekdays.length < 3) return null

  const weekendAvg = average(weekend.map((p) => p.avgCompliance))
  const weekdayAvg = average(weekdays.map((p) => p.avgCompliance))
  const gap = weekdayAvg - weekendAvg
  if (gap < MIN_GAP) return null

  return {
    key: 'weekendCliff',
    title: 'Tus fines de semana son otro mundo',
    body: `Cumples un ${Math.round(weekdayAvg * 100)}% entre semana, pero solo un ${Math.round(weekendAvg * 100)}% en fin de semana.`,
    severity: 'neutral',
    confidence: Math.min(1, gap * 1.5),
    evidence: {
      kind: 'bar',
      points: [
        { label: 'Entre semana', value: Math.round(weekdayAvg * 100) },
        { label: 'Fin de semana', value: Math.round(weekendAvg * 100) },
      ],
    },
  }
}
