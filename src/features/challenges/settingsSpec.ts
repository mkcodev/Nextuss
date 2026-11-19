import { db } from '../../db/schema'
import { DAILY_MISSION_KIND } from '../../lib/challenges/missionCatalog'
import { CUSTOM_KIND } from '../../lib/challenges/custom'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const challengesSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'segmented',
      key: 'missionsPerDay',
      label: 'Misiones al día',
      help: 'Se generan con lo que ya registras: tareas, foco, check-in y hábitos. Sin historial, no hay misiones.',
      keywords: ['misiones', 'retos', 'diarias'],
      options: [
        { value: '1', label: '1' },
        { value: '2', label: '2' },
        { value: '3', label: '3' },
      ],
    },
  ],
  dataSummary: async () => {
    const rows = (await db.challenges.toArray()).filter((c) => c.deletedAt === 0)
    const active = rows.filter((c) => c.kind === CUSTOM_KIND && c.status === 'active').length
    const missionsDone = rows.filter((c) => c.kind === DAILY_MISSION_KIND && c.status === 'done').length
    return [
      { label: 'Retos activos', value: String(active) },
      { label: 'Misiones cumplidas', value: String(missionsDone) },
    ]
  },
  /** Último día marcado, escudo o «Hoy no» de un reto propio. */
  lastActivityAt: async () => (await db.challengeDays.orderBy('at').last())?.at ?? null,
}
