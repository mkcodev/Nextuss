import { listProjects } from '../../db/repositories/projects'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const projectsSettingsSpec: PluginSettingsSpec = {
  fields: [],
  dataSummary: async () => {
    const all = await listProjects(true)
    const active = all.filter((p) => !p.archived).length
    const archived = all.length - active
    return [
      { label: 'Activos', value: String(active) },
      { label: 'Archivados', value: String(archived) },
    ]
  },
}
