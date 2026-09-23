import {
  BarChart3,
  CalendarRange,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  ListTodo,
  Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end: boolean
  goKey: string // letra del acorde "g" para navegar (g h, g p, ...)
  paletteLabel?: string // texto del ítem en la paleta de comandos; por defecto "Ir a {label}"
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Hoy', icon: LayoutGrid, end: true, goKey: 'h' },
  { to: '/planificacion', label: 'Planificación', icon: CalendarRange, end: false, goKey: 'p' },
  { to: '/habitos', label: 'Hábitos', icon: ListChecks, end: false, goKey: 'b' },
  { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3, end: false, goKey: 's' },
  { to: '/tareas', label: 'Tareas', icon: ListTodo, end: false, goKey: 't' },
  { to: '/proyectos', label: 'Proyectos', icon: FolderKanban, end: false, goKey: 'r' },
  { to: '/ajustes', label: 'Ajustes', icon: SettingsIcon, end: false, goKey: 'a' },
]
