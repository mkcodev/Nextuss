import type { Settings } from '../../db/types'
import { readSetting, SETTINGS_DEFAULTS } from '../../db/settingsDefaults'
import type { FocusMode } from './cycle'

export const DEFAULT_DURATIONS_MIN: Record<FocusMode, number> = {
  work: SETTINGS_DEFAULTS.pomodoroWorkMin,
  break: SETTINGS_DEFAULTS.pomodoroBreakMin,
  longBreak: SETTINGS_DEFAULTS.pomodoroLongBreakMin,
}

/** Duraciones en segundos por modo, con los defaults clásicos de pomodoro si el usuario no los ha tocado. */
export function durationsFromSettings(settings: Settings | undefined): Record<FocusMode, number> {
  return {
    work: readSetting(settings, 'pomodoroWorkMin') * 60,
    break: readSetting(settings, 'pomodoroBreakMin') * 60,
    longBreak: readSetting(settings, 'pomodoroLongBreakMin') * 60,
  }
}
