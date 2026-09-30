import type { PluginSettingsSpec } from '../plugins/settings/types'

/** `ReviewsHistorySection` (historial) es una pieza a medida — llega en P5. La hora del aviso no es
 * propia: se comparte con «Hoy» (`morningSummaryTime`), aquí solo se referencia como lectura. */
export const weeklyReviewSettingsSpec: PluginSettingsSpec = {
  fields: [],
  notify: ['notifyWeeklyReviewNudge'],
}
