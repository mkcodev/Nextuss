import { addDays } from 'date-fns'
import { dateKey, isHabitScheduledOn, isPeriodicHabit, parseDateKey } from '../../../../lib/dates'
import type { Detector } from '../types'

const MIN_RECOVERY_EVENTS = 3

/** Cuántos días programados tardas, de media, en volver a completar un hábito después de fallarlo. */
export const recoverySpeed: Detector = (ctx) => {
  const gaps: number[] = []

  for (const habit of ctx.habits) {
    // "X veces/semana|mes" no tiene un "día fallado" — es "elegible" todos los días (ver
    // `isHabitScheduledOn`), así que este detector no tiene una señal real que medir en él.
    if (isPeriodicHabit(habit)) continue
    const logByDate = new Map(ctx.habitLogs.filter((l) => l.habitId === habit.id).map((l) => [l.date, l]))

    let missStreak = 0
    for (
      let cursor = parseDateKey(ctx.range.from);
      dateKey(cursor) <= ctx.range.to;
      cursor = addDays(cursor, 1)
    ) {
      if (!isHabitScheduledOn(habit, cursor)) continue
      const completed = logByDate.get(dateKey(cursor))?.completed ?? false
      if (completed) {
        if (missStreak > 0) gaps.push(missStreak)
        missStreak = 0
      } else {
        missStreak += 1
      }
    }
  }

  if (gaps.length < MIN_RECOVERY_EVENTS) return null

  const avgGap = gaps.reduce((s, g) => s + g, 0) / gaps.length

  return {
    key: 'recoverySpeed',
    title: avgGap <= 1.5 ? 'Te recuperas rápido tras un fallo' : 'Te cuesta retomar tras un fallo',
    body: `De media tardas ${avgGap.toFixed(1)} días programados en volver a completar un hábito después de fallarlo (${gaps.length} casos en este periodo).`,
    severity: avgGap <= 1.5 ? 'good' : 'neutral',
    confidence: Math.min(1, gaps.length / 10),
  }
}
