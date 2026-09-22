import type { Settings } from '../../db/types'
import type { FocusMode } from './cycle'

export const DEFAULT_DURATIONS_MIN: Record<FocusMode, number> = { work: 25, break: 5, longBreak: 15 }

/** Duraciones en segundos por modo, con los defaults clásicos de pomodoro si el usuario no los ha tocado. */
export function durationsFromSettings(settings: Settings | undefined): Record<FocusMode, number> {
  return {
    work: (settings?.pomodoroWorkMin ?? DEFAULT_DURATIONS_MIN.work) * 60,
    break: (settings?.pomodoroBreakMin ?? DEFAULT_DURATIONS_MIN.break) * 60,
    longBreak: (settings?.pomodoroLongBreakMin ?? DEFAULT_DURATIONS_MIN.longBreak) * 60,
  }
}
