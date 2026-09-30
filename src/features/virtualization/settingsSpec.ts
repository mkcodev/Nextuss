import { lazyNamed } from '../../app/lazy'
import type { PluginSettingsSpec } from '../plugins/settings/types'

export const virtualizationSettingsSpec: PluginSettingsSpec = {
  fields: [
    {
      kind: 'switch',
      key: 'virtualizationEnabled',
      label: 'Abrirla sola al empezar el día',
      help: 'Antes de la hora límite, la app arranca directa en el ritual en vez de en Hoy',
      group: 'Apertura',
    },
    {
      kind: 'number',
      key: 'virtualizationWindowEndHour',
      label: 'Hasta las',
      unit: 'h',
      min: 1,
      max: 23,
      group: 'Apertura',
    },
    {
      kind: 'segmented',
      key: 'meditationPattern',
      label: 'Patrón de respiración',
      group: 'Presencia',
      options: [
        { value: 'box4444', label: 'Caja 4-4-4-4' },
        { value: '478', label: '4-7-8' },
        { value: 'coherence55', label: 'Coherencia 5-5' },
      ],
    },
    {
      kind: 'number',
      key: 'meditationDurationSec',
      label: 'Duración de Presencia',
      unit: 'min',
      min: 1,
      max: 5,
      toUi: (sec) => Math.round(sec / 60),
      fromUi: (min) => min * 60,
      group: 'Presencia',
    },
    {
      kind: 'segmented',
      key: 'virtualizationTheme',
      label: 'Tema',
      group: 'Aspecto',
      options: [
        { value: 'a', label: 'Nítido' },
        { value: 'b', label: 'Orgánico' },
        { value: 'c', label: 'Terminal' },
      ],
    },
    {
      kind: 'switch',
      key: 'virtualizationSoundEnabled',
      label: 'Sonido del ritual',
      help: 'Zumbido, barrido y destello final',
      group: 'Aspecto',
    },
    {
      kind: 'custom',
      id: 'virtualizationRoutineId',
      label: 'Rutina',
      group: 'Rutina',
      keywords: ['rutina', 'mañana consciente', 'receta'],
      component: lazyNamed(() => import('./RoutineSettings'), 'RoutineSettings'),
    },
  ],
}
