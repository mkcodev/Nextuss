import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const statsSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'custom',
      id: 'dismissedInsights',
      label: 'Insights descartados',
      group: 'Descartados',
      keywords: ['insights', 'descartados', 'restaurar'],
      component: lazyNamed(() => import('./DismissedInsightsSettings'), 'DismissedInsightsSettings'),
    },
  ],
}
