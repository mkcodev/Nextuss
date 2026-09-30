import type { PluginSettingsSpec } from '../plugins/settings/types'

export const focusSettingsSpec: PluginSettingsSpec = {
  fields: [
    { kind: 'number', key: 'pomodoroWorkMin', label: 'Foco', unit: 'min', min: 1, max: 180 },
    { kind: 'number', key: 'pomodoroBreakMin', label: 'Descanso', unit: 'min', min: 1, max: 60 },
    { kind: 'number', key: 'pomodoroLongBreakMin', label: 'Descanso largo', unit: 'min', min: 1, max: 90 },
    { kind: 'switch', key: 'pomodoroSoundEnabled', label: 'Sonido al terminar' },
  ],
  notify: ['notifyPomodoroEnd'],
}
