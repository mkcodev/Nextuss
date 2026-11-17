import { getCheckInsForRange } from '../../db/repositories/checkins'
import { subDaysKey, todayKey } from '../../lib/dates'
import type { PluginSettingsSpec } from '../plugins/settings/types'

const answered = (c: { energy: number | null; mood: number | null; focus: number | null }) =>
  c.energy != null || c.mood != null || c.focus != null

/** Sin ajustes propios: se abre encadenado según la receta de Lanzadores. */
export const checkinSettingsSpec: PluginSettingsSpec = {
  fields: [],
  dataSummary: async () => {
    const today = todayKey()
    const last7 = await getCheckInsForRange(subDaysKey(today, 6), today)
    const last30 = await getCheckInsForRange(subDaysKey(today, 29), today)
    return [
      { label: 'Últimos 7 días', value: String(last7.filter(answered).length) },
      { label: 'Últimos 30 días', value: String(last30.filter(answered).length) },
    ]
  },
}
