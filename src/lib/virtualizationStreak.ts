// Racha de Virtualización (#97 PR2): puro, mismo criterio que `lib/streaks.ts#calculateStreak` para
// hábitos, sin el filtro de días programados (la Virtualización aplica todos los días). Camina hacia
// atrás desde `referenceDate` hasta la fecha más antigua presente en `days`.
import { subDays } from 'date-fns'
import type { VirtualizationDay } from '../db/types'
import { dateKey, parseDateKey } from './dates'

export interface StreakResult {
  current: number
  longest: number
}

export function calculateVirtualizationStreak(days: readonly VirtualizationDay[], referenceDate: Date = new Date()): StreakResult {
  if (days.length === 0) return { current: 0, longest: 0 }

  const byDate = new Map(days.map((d) => [d.date, d]))
  const earliestDate = parseDateKey(days.reduce((min, d) => (d.date < min ? d.date : min), days[0].date))

  let current = 0
  let longest = 0
  let running = 0
  let stillCountingCurrent = true
  let isToday = true
  let cursor = new Date(referenceDate)
  cursor.setHours(0, 0, 0, 0)

  while (cursor >= earliestDate) {
    const day = byDate.get(dateKey(cursor))
    if (day?.completed) {
      running += 1
      longest = Math.max(longest, running)
      if (stillCountingCurrent) current = running
    } else if (day?.shieldUsed) {
      longest = Math.max(longest, running)
      // racha preservada pero no extendida
    } else if (isToday) {
      // el día de hoy aún no ha terminado — no cuenta, no rompe
    } else {
      running = 0
      stillCountingCurrent = false
    }
    isToday = false
    cursor = subDays(cursor, 1)
  }

  return { current, longest }
}
