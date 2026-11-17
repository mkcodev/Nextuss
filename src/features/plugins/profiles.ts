import { PLUGINS } from './registry'
import type { PluginId } from './types'

export interface PluginProfile {
  id: string
  label: string
  description: string
  /** Plugins no-núcleo que quedan ENCENDIDOS al aplicar el perfil; el resto de no-núcleo se apaga.
   * El núcleo (Hoy/Tareas/Proyectos/Planificación) nunca cambia, no hace falta listarlo. */
  plugins: PluginId[]
}

const ADHD_FOCUS: PluginId[] = ['virtualization', 'checkin', 'routines', 'dayTime', 'habits', 'focus', 'gamification']
const ALL_NON_CORE: PluginId[] = PLUGINS.filter((p) => !p.core).map((p) => p.id)

/** 4 perfiles del Objetivo 4 (#98 P7) — aplican/quitan un conjunto de plugins de golpe, no campos de
 * ajustes (eso son los presets por plugin, #154). Reutilizable en la pantalla 4 del test de entrada
 * (#100), que elegirá un perfil como punto de partida en vez de activar plugin a plugin. */
export const PLUGIN_PROFILES: PluginProfile[] = [
  { id: 'minimal', label: 'Mínimo', description: 'Solo el núcleo: Hoy, Tareas, Proyectos, Planificación.', plugins: [] },
  { id: 'tasksOnly', label: 'Solo tareas', description: 'Núcleo + Tiempo de hoy.', plugins: ['dayTime'] },
  {
    id: 'adhd',
    label: 'Enfoque TDAH',
    description: 'Ritual de mañana, rutinas, hábitos, foco y gamificación — sin análisis ni integraciones.',
    plugins: ADHD_FOCUS,
  },
  { id: 'full', label: 'Completo', description: 'Todos los plugins activos.', plugins: ALL_NON_CORE },
]
