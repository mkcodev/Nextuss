import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

/** La hora del aviso no es propia: se comparte con «Hoy» (`morningSummaryTime`), aquí solo se
 * referencia como lectura. */
export const weeklyReviewSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'custom',
      id: 'weeklyReviewHistory',
      label: 'Historial',
      group: 'Historial',
      keywords: ['revisión', 'historial', 'semana'],
      component: lazyNamed(() => import('./WeeklyReviewSettings'), 'WeeklyReviewSettings'),
    },
  ],
  notify: ['notifyWeeklyReviewNudge'],
}
