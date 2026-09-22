import type { Detector } from '../types'

const MIN_SAMPLE = 6

function average(values: number[]): number {
  return values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0
}

export const interruptionTrend: Detector = (ctx) => {
  const sessions = [...ctx.focusSessions].sort((a, b) => a.start - b.start)
  if (sessions.length < MIN_SAMPLE) return null

  const half = Math.floor(sessions.length / 2)
  const firstHalf = average(sessions.slice(0, half).map((s) => s.interruptions))
  const secondHalf = average(sessions.slice(half).map((s) => s.interruptions))
  const delta = secondHalf - firstHalf
  if (Math.abs(delta) < 0.4) return null

  const worse = delta > 0

  return {
    key: 'interruptionTrend',
    title: worse ? 'Te interrumpen más que antes' : 'Cada vez te interrumpen menos',
    body: `Las interrupciones por sesión de foco pasaron de ${firstHalf.toFixed(1)} a ${secondHalf.toFixed(1)} en este periodo.`,
    severity: worse ? 'warn' : 'good',
    confidence: Math.min(1, Math.abs(delta) / 2),
    evidence: {
      kind: 'line',
      points: sessions.map((s, i) => ({ label: String(i + 1), value: s.interruptions })),
    },
  }
}
