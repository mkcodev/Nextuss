// Registro central de plugins: la única lista de módulos de la app. Desactivar uno oculta todo lo que
// aporta (páginas, navegación, atajos, paleta, tarjetas, avisos), pero nunca borra sus datos.
import {
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  Clock,
  FolderKanban,
  LayoutGrid,
  ListChecks,
  ListTodo,
  Radar,
  Repeat,
  Send,
  Sparkles,
  Timer,
  Trophy,
  Workflow,
  NotebookPen,
} from 'lucide-react'
import type { PluginId, PluginManifest } from './types'

export const PLUGINS: readonly PluginManifest[] = [
  { id: 'today', name: 'Hoy', description: 'Tu día de un vistazo: qué toca ahora y qué queda.', icon: LayoutGrid, core: true, defaultEnabled: true },
  { id: 'tasks', name: 'Tareas', description: 'Captura, organiza y termina tareas.', icon: ListTodo, core: true, defaultEnabled: true },
  { id: 'projects', name: 'Proyectos', description: 'Agrupa tareas en proyectos con su progreso.', icon: FolderKanban, core: true, defaultEnabled: true },
  { id: 'planning', name: 'Planificación', description: 'Calendario, bloques de tiempo y objetivos.', icon: CalendarRange, core: true, defaultEnabled: true },
  {
    id: 'virtualization',
    name: 'Virtualización',
    description: 'Ritual de entrada al día: transmisión, escaneo, presencia y arranque de la rutina.',
    icon: Radar,
    defaultEnabled: true,
  },
  { id: 'checkin', name: 'Check-in', description: 'Energía, ánimo y foco al empezar el día.', icon: ClipboardCheck, defaultEnabled: true },
  { id: 'routines', name: 'Rutinas', description: 'Secuencias de pasos con temporizador a pantalla completa.', icon: Repeat, defaultEnabled: true },
  { id: 'dayTime', name: 'Tiempo de hoy', description: 'Cuánto día queda y avisos entre bloques.', icon: Clock, defaultEnabled: true },
  { id: 'habits', name: 'Hábitos', description: 'Hábitos diarios con rachas y recordatorios.', icon: ListChecks, defaultEnabled: true },
  { id: 'focus', name: 'Foco', description: 'Pomodoro y sesiones de foco sobre una tarea.', icon: Timer, defaultEnabled: true },
  { id: 'gamification', name: 'Gamificación', description: 'XP, niveles, atributos y logros.', icon: Trophy, defaultEnabled: true },
  {
    id: 'weeklyReview',
    name: 'Revisión semanal',
    description: 'Cierra la semana y prepara la siguiente.',
    icon: NotebookPen,
    defaultEnabled: true,
    requires: ['planning'],
  },
  { id: 'stats', name: 'Estadísticas', description: 'Gráficas, tendencias e insights.', icon: BarChart3, defaultEnabled: true },
  { id: 'ai', name: 'IA', description: 'Divide tareas y sugiere pasos con Claude (necesita clave).', icon: Sparkles, defaultEnabled: true },
  { id: 'telegram', name: 'Telegram', description: 'Captura y avisos desde un bot de Telegram.', icon: Send, defaultEnabled: true },
  { id: 'launchers', name: 'Lanzadores', description: 'Reglas «cuando pase X, haz Y».', icon: Workflow, defaultEnabled: true },
]

const BY_ID = new Map(PLUGINS.map((p) => [p.id, p]))

export function getPlugin(id: PluginId): PluginManifest {
  const plugin = BY_ID.get(id)
  if (!plugin) throw new Error(`Plugin desconocido: ${id}`)
  return plugin
}
