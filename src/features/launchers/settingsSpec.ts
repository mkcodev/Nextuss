import { listLaunchers, listRecentLauncherRuns } from '../../db/repositories/launchers'
import type { PluginSettingsSpec } from '../plugins/settings/types'

/** Sin ajustes propios: la ficha enlaza a su editor (#99). */
export const launchersSettingsSpec: PluginSettingsSpec = {
  fields: [],
  dataSummary: async () => {
    const [launchers, runs] = await Promise.all([listLaunchers(), listRecentLauncherRuns(100)])
    return [
      { label: 'Activos', value: String(launchers.filter((l) => l.enabled).length) },
      { label: 'Ejecuciones recientes', value: String(runs.length) },
    ]
  },
}
