import type { Detector } from '../types'

const MIN_SAMPLE = 2

export const goalCompletionRate: Detector = (ctx) => {
  if (ctx.goals.length < MIN_SAMPLE) return null

  const done = ctx.goals.filter((g) => g.done).length
  const ratio = done / ctx.goals.length

  if (ratio >= 0.7) {
    return {
      key: 'goalCompletionRate',
      title: 'Buena racha con tus objetivos',
      body: `Completaste ${done} de ${ctx.goals.length} objetivos en este periodo (${Math.round(ratio * 100)}%).`,
      severity: 'good',
      confidence: Math.min(1, ctx.goals.length / 6),
    }
  }

  if (ratio <= 0.3) {
    return {
      key: 'goalCompletionRate',
      title: 'Los objetivos se están quedando atrás',
      body: `Solo completaste ${done} de ${ctx.goals.length} objetivos en este periodo (${Math.round(ratio * 100)}%). Puede que estés marcándote demasiados a la vez.`,
      severity: 'warn',
      confidence: Math.min(1, ctx.goals.length / 6),
    }
  }

  return null
}
