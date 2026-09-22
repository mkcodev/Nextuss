import { describe, expect, it } from 'vitest'
import { durationsFromSettings } from './durations'
import type { Settings } from '../../db/types'

function settings(overrides: Partial<Settings> = {}): Settings {
  return { id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22, ...overrides }
}

describe('durationsFromSettings', () => {
  it('falls back to the classic 25/5/15 pomodoro split when unset', () => {
    expect(durationsFromSettings(settings())).toEqual({ work: 1500, break: 300, longBreak: 900 })
  })

  it('honors configured minutes, converted to seconds', () => {
    const s = settings({ pomodoroWorkMin: 50, pomodoroBreakMin: 10, pomodoroLongBreakMin: 30 })
    expect(durationsFromSettings(s)).toEqual({ work: 3000, break: 600, longBreak: 1800 })
  })

  it('falls back to defaults when settings is undefined (not yet loaded)', () => {
    expect(durationsFromSettings(undefined)).toEqual({ work: 1500, break: 300, longBreak: 900 })
  })
})
