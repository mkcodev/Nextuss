import type { LucideIcon } from 'lucide-react'

/** Identificadores de todos los plugins, núcleo incluido. El orden es el de la futura página de Plugins. */
export const PLUGIN_IDS = [
  'today',
  'tasks',
  'projects',
  'planning',
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

export interface PluginManifest {
  id: PluginId
  name: string
  /** Una frase: qué aporta. La leen la página de Plugins (#98) y el test de entrada (#100). */
  description: string
  icon: LucideIcon
  /** Núcleo fijo: siempre activo, no se puede desactivar. */
  core?: boolean
  defaultEnabled: boolean
  /** Plugins que tienen que estar activos para que este funcione. */
  requires?: readonly PluginId[]
}
