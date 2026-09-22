import type { Detector } from '../types'

const MIN_DAYS_WITH_PLAN = 5
const OVER_RATIO = 0.3 // fracción de días por encima de la capacidad para avisar

export const overcommitment: Detector = (ctx) => {
  if (ctx.dayCapacityMin <= 0) return null

  const byDay = new Map<string, number>()
  for (const t of ctx.tasksCreated) {
    if (!t.scheduledDate || !t.estimateMin) continue
    byDay.set(t.scheduledDate, (byDay.get(t.scheduledDate) ?? 0) + t.estimateMin)
  }
  if (byDay.size < MIN_DAYS_WITH_PLAN) return null

  const overDays = [...byDay.values()].filter((min) => min > ctx.dayCapacityMin).length
  const ratio = overDays / byDay.size
  if (ratio < OVER_RATIO) return null

  return {
    key: 'overcommitment',
    title: 'Sueles planificar más de lo que cabe en el día',
    body: `En ${overDays} de ${byDay.size} días planificaste más minutos de los que tienes disponibles (${ctx.dayCapacityMin} min/día).`,
    severity: 'warn',
    confidence: Math.min(1, ratio),
    evidence: {
      kind: 'bar',
      points: [...byDay.entries()].map(([date, min]) => ({ label: date.slice(5), value: min })),
    },
  }
}
