import { db } from '../../db/schema'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const focusSettingsSpec: PluginSettingsSpec = {
  fields: [
    { kind: 'number', key: 'pomodoroWorkMin', label: 'Foco', unit: 'min', min: 1, max: 180 },
    { kind: 'number', key: 'pomodoroBreakMin', label: 'Descanso', unit: 'min', min: 1, max: 60 },
    { kind: 'number', key: 'pomodoroLongBreakMin', label: 'Descanso largo', unit: 'min', min: 1, max: 90 },
    { kind: 'switch', key: 'pomodoroSoundEnabled', label: 'Sonido al terminar' },
  ],
  notify: ['notifyPomodoroEnd'],
  dataSummary: async () => {
    const sessions = await db.focusSessions.toArray()
    const totalMin = sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
    return [
      { label: 'Sesiones', value: String(sessions.length) },
      { label: 'Minutos de foco', value: String(Math.round(totalMin)) },
    ]
  },
}
