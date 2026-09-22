import { dateKey } from '../../../../lib/dates'
import type { Detector } from '../types'

const NEW_HABIT_WINDOW_DAYS = 14
const MIN_SCHEDULED_DAYS = 3
const STALLING_COMPLIANCE = 0.4

export const newHabitStalling: Detector = (ctx) => {
  const cutoff = new Date(ctx.now)
  cutoff.setDate(cutoff.getDate() - NEW_HABIT_WINDOW_DAYS)
  const cutoffKey = dateKey(cutoff)

  const candidates = ctx.habitMatrix.filter((row) => {
    const habit = ctx.habits.find((h) => h.id === row.habitId)
    if (!habit) return false
    return (
      dateKey(new Date(habit.createdAt)) >= cutoffKey &&
      row.scheduledDays >= MIN_SCHEDULED_DAYS &&
      row.complianceRatio < STALLING_COMPLIANCE
    )
  })
  if (candidates.length === 0) return null

  const worst = candidates.reduce((a, b) => (b.complianceRatio < a.complianceRatio ? b : a))

  return {
    key: 'newHabitStalling',
    title: `"${worst.name}" está costando arrancar`,
    body: `Lo creaste hace poco y solo llevas un ${Math.round(worst.complianceRatio * 100)}% de cumplimiento. Los primeros días son los que más cuestan — considera bajarle el listón al principio.`,
    severity: 'neutral',
    confidence: Math.min(1, 1 - worst.complianceRatio),
  }
}
