import type { PluginSettingsSpec } from '../plugins/settings/types'

export const focusSettingsSpec: PluginSettingsSpec = {
  fields: [
    { kind: 'number', key: 'pomodoroWorkMin', label: 'Foco', unit: 'min', min: 1, max: 180 },
    { kind: 'number', key: 'pomodoroBreakMin', label: 'Descanso', unit: 'min', min: 1, max: 60 },
    { kind: 'number', key: 'pomodoroLongBreakMin', label: 'Descanso largo', unit: 'min', min: 1, max: 90 },
    { kind: 'switch', key: 'pomodoroSoundEnabled', label: 'Sonido al terminar' },
  ],
  notify: ['notifyPomodoroEnd'],
  presets: [
    { id: 'classic', label: 'Clásico', values: { pomodoroWorkMin: 25, pomodoroBreakMin: 5, pomodoroLongBreakMin: 15 } },
    { id: 'deep', label: 'Profundo', values: { pomodoroWorkMin: 50, pomodoroBreakMin: 10, pomodoroLongBreakMin: 30 } },
    { id: 'adhd', label: 'TDAH', values: { pomodoroWorkMin: 15, pomodoroBreakMin: 3, pomodoroLongBreakMin: 10 } },
  ],
}
