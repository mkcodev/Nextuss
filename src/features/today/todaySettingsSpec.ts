import type { PluginSettingsSpec } from '../plugins/settings/types'

export const todaySettingsSpec: PluginSettingsSpec = {
  fields: [
    { kind: 'time', key: 'morningSummaryTime', label: 'Resumen de la mañana' },
    { kind: 'time', key: 'eveningSummaryTime', label: 'Cierre del día' },
  ],
  notify: ['notifyMorningSummary', 'notifyEveningSummary'],
}
