import type { PluginSettingsSpec } from '../plugins/settings/types'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))

export const planningSettingsSpec: PluginSettingsSpec = {
  fields: [
    { kind: 'select', key: 'dayStartHour', label: 'El día empieza a las', options: HOUR_OPTIONS },
    { kind: 'select', key: 'dayEndHour', label: 'El día termina a las', options: HOUR_OPTIONS },
    {
      kind: 'segmented',
      key: 'weekStartsOn',
      label: 'La semana empieza en',
      options: [
        { value: '1', label: 'Lunes' },
        { value: '0', label: 'Domingo' },
      ],
    },
  ],
  notify: ['notifyTaskStart'],
}
