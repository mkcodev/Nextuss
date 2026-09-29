import type { LucideIcon } from 'lucide-react'

/** Identificadores de todos los plugins, núcleo incluido. El orden es el de la futura página de Plugins. */
export const PLUGIN_IDS = [
  'today',
  'tasks',
  'projects',
  'planning',
  'virtualization',
  'checkin',
  'routines',
  'dayTime',
  'habits',
  'focus',
  'gamification',
  'weeklyReview',
  'stats',
  'ai',
  'telegram',
  'launchers',
] as const

export type PluginId = (typeof PLUGIN_IDS)[number]

/** Lo que guarda `Settings.plugins`: solo los que el usuario ha cambiado. Sin definir = `defaultEnabled`. */
export type StoredPluginState = Partial<Record<PluginId, boolean>>

/** Agrupa los plugins no-núcleo en el mapa de constelación (#98/#135). Núcleo no lleva categoría: se
 * resume en el hub central del mapa. */
export const PLUGIN_CATEGORIES = {
  ritual: { label: 'Ritual de mañana', color: '#7c84e8' },
  hacer: { label: 'Hacer', color: '#42c9b8' },
  motivacion: { label: 'Motivación', color: '#f0a25e' },
  analisis: { label: 'Análisis', color: '#6fa8e0' },
  integraciones: { label: 'Integraciones', color: '#e28fce' },
} as const

export type PluginCategory = keyof typeof PLUGIN_CATEGORIES

export interface PluginManifest {
  id: PluginId
  name: string
  /** Una frase: qué aporta. La leen la página de Plugins (#98) y el test de entrada (#100). */
  description: string
  icon: LucideIcon
  /** Núcleo fijo: siempre activo, no se puede desactivar. */
  core?: boolean
  defaultEnabled: boolean
  /** Plugins que tienen que estar activos para que este funcione (dependencia dura). */
  requires?: readonly PluginId[]
  /** Grupo en el mapa de constelación; obligatoria para todo plugin no-núcleo. */
  category?: PluginCategory
  /** Plugins que este mejora sin exigirlos (dependencia blanda, solo dibuja una línea en el mapa). */
  enhances?: readonly PluginId[]
}
