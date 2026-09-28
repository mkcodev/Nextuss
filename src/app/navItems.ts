import {
  BarChart3,
  CalendarRange,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  ListTodo,
  Repeat,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { usePluginsStore } from '../features/plugins/pluginsStore'
import type { PluginId } from '../features/plugins/types'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
  goKey: string // letra del acorde "g" para navegar (g h, g p, ...)
  paletteLabel?: string // texto del ítem en la paleta de comandos; por defecto "Ir a {label}"
  pluginId?: PluginId // sin él (Ajustes) se ve siempre
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoy', icon: LayoutGrid, end: true, goKey: 'h', pluginId: 'today' },
  { to: '/planificacion', label: 'Planificación', icon: CalendarRange, end: false, goKey: 'p', pluginId: 'planning' },
  { to: '/habitos', label: 'Hábitos', icon: ListChecks, end: false, goKey: 'b', pluginId: 'habits' },
  { to: '/rutinas', label: 'Rutinas', icon: Repeat, end: false, goKey: 'u', pluginId: 'routines' },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3, end: false, goKey: 's', pluginId: 'stats' },
  { to: '/tareas', label: 'Tareas', icon: ListTodo, end: false, goKey: 't', pluginId: 'tasks' },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban, end: false, goKey: 'r', pluginId: 'projects' },
  { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon, end: false, goKey: 'a' },
]

/** Entradas de navegación que no son una ruta de `NAV_ITEMS` (sub-tabs, anclas): acorde `g`, paleta y ayuda. */
export const EXTRA_GO_ITEMS = [
  { goKey: 'o', to: '/planificacion?tab=objetivos', label: 'Objetivos', pluginId: 'planning' as PluginId },
]

/** Solo lo de plugins activos. Lo desactivado desaparece de la navegación pero su ruta sigue existiendo. */
export function selectNav<T extends { pluginId?: PluginId }>(items: readonly T[], enabled: ReadonlySet<PluginId>): T[] {
  return items.filter((item) => !item.pluginId || enabled.has(item.pluginId))
}

export function useNavItems(): NavItem[] {
  const enabled = usePluginsStore((s) => s.enabled)
  return selectNav(NAV_ITEMS, enabled)
}
