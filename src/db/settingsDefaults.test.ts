import { describe, expect, it } from 'vitest'
import { isModified, readSetting, SETTINGS_DEFAULTS } from './settingsDefaults'
import type { Settings } from './types'

/** Fija los valores por defecto documentados en el plan de #98 (Objetivo 3) — si este test cambia,
 * cambia el comportamiento real de la app para quien nunca ha tocado ese ajuste. */
describe('SETTINGS_DEFAULTS (fijación)', () => {
  it('coincide con los defaults ya vigentes en el código', () => {
    expect(SETTINGS_DEFAULTS).toMatchObject({
      dayStartHour: 7,
      dayEndHour: 22,
      weekStartsOn: 1,
      pomodoroWorkMin: 25,
      pomodoroBreakMin: 5,
      pomodoroLongBreakMin: 15,
      pomodoroSoundEnabled: false,
      dayTimeView: 'ruler',
      routineView: 'step',
      routineStepStyle: 'direct',
      routineSoundEnabled: true,
      virtualizationEnabled: true,
      virtualizationWindowEndHour: 12,
      virtualizationTheme: 'a',
      meditationPattern: 'box4444',
      meditationDurationSec: 120,
      virtualizationSoundEnabled: true,
      morningSummaryTime: '08:00',
      eveningSummaryTime: '21:00',
      aiModel: 'claude-sonnet-5',
    })
    for (const key of [
      'notifyHabitReminders',
      'notifyTaskStart',
      'notifyTransitions',
      'notifyMorningSummary',
      'notifyEveningSummary',
      'notifyWeeklyReviewNudge',
      'notifyZombieTasks',
      'notifyPomodoroEnd',
      'notifyRoutines',
    ] as const) {
      expect(SETTINGS_DEFAULTS[key], key).toBe(true)
    }
  })

  it('nunca lleva notificationsEnabled (bug de #notificationsEnabled, no se unifica aquí)', () => {
    expect('notificationsEnabled' in SETTINGS_DEFAULTS).toBe(false)
  })
})

describe('readSetting', () => {
  it('devuelve el default con Settings vacío', () => {
    const empty = { id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22 } as Settings
    expect(readSetting(empty, 'pomodoroWorkMin')).toBe(25)
    expect(readSetting(empty, 'dayTimeView')).toBe('ruler')
    expect(readSetting(empty, 'routineSoundEnabled')).toBe(true)
    expect(readSetting(undefined, 'virtualizationWindowEndHour')).toBe(12)
  })

  it('devuelve el valor guardado sin cambios cuando existe, incluido `false`', () => {
    const s = { id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22, pomodoroWorkMin: 50, virtualizationEnabled: false } as Settings
    expect(readSetting(s, 'pomodoroWorkMin')).toBe(50)
    expect(readSetting(s, 'virtualizationEnabled')).toBe(false)
  })
})

describe('isModified', () => {
  it('false sin definir o igual al default; true solo si difiere', () => {
    const s = { id: 1, theme: 'system', dayStartHour: 7, dayEndHour: 22, pomodoroWorkMin: 25, pomodoroBreakMin: 10 } as Settings
    expect(isModified(s, 'pomodoroWorkMin')).toBe(false) // igual al default, aunque esté guardado
    expect(isModified(s, 'pomodoroBreakMin')).toBe(true)
    expect(isModified(s, 'routineView')).toBe(false) // sin definir
    expect(isModified(undefined, 'routineView')).toBe(false)
  })
})
