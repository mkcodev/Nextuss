import { db } from '../../db/schema'
import { listRoutines } from '../../db/repositories/routines'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const routinesSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'segmented',
      key: 'routineView',
      label: 'Vista del reproductor',
      group: 'Vista',
      options: [
        { value: 'step', label: 'Paso' },
        { value: 'timeline', label: 'Línea' },
      ],
    },
    {
      kind: 'segmented',
      key: 'routineStepStyle',
      label: 'Estilo de los pasos con tipo',
      group: 'Vista',
      options: [
        { value: 'direct', label: 'Directo' },
        { value: 'card', label: 'Tarjeta' },
        { value: 'journal', label: 'Diario' },
      ],
    },
    {
      kind: 'switch',
      key: 'routineSoundEnabled',
      label: 'Sonido al cambiar de paso',
    },
  ],
  notify: ['notifyRoutines'],
  dataSummary: async () => {
    const [routines, runs] = await Promise.all([listRoutines(), db.routineRuns.toArray()])
    return [
      { label: 'Rutinas activas', value: String(routines.length) },
      { label: 'Veces completadas', value: String(runs.filter((r) => r.finished).length) },
    ]
  },
}
