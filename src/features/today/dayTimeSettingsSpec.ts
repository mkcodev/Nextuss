import type { PluginSettingsSpec } from '../plugins/settings/types'

export const dayTimeSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'segmented',
      key: 'dayTimeView',
      label: 'Estilo',
      options: [
        { value: 'ruler', label: 'Regla' },
        { value: 'ring', label: 'Anillo' },
        { value: 'blocks', label: 'Bloques' },
      ],
    },
  ],
  notify: ['notifyTransitions'],
}
