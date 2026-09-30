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
  { id: 'today', name: 'Hoy', description: 'Tu día de un vistazo: qué toca ahora y qué queda.', icon: LayoutGrid, core: true, defaultEnabled: true, appView: { kind: 'route', path: '/' } },
  { id: 'tasks', name: 'Tareas', description: 'Captura, organiza y termina tareas.', icon: ListTodo, core: true, defaultEnabled: true, appView: { kind: 'route', path: '/tareas' } },
  { id: 'projects', name: 'Proyectos', description: 'Agrupa tareas en proyectos con su progreso.', icon: FolderKanban, core: true, defaultEnabled: true, appView: { kind: 'route', path: '/proyectos' } },
  { id: 'planning', name: 'Planificación', description: 'Calendario, bloques de tiempo y objetivos.', icon: CalendarRange, core: true, defaultEnabled: true, appView: { kind: 'route', path: '/planificacion' } },
  {
    id: 'virtualization',
    name: 'Virtualización',
    description: 'Ritual de entrada al día: transmisión, escaneo, presencia y arranque de la rutina.',
    icon: Radar,
    defaultEnabled: true,
    category: 'ritual',
    enhances: ['routines', 'checkin', 'launchers'],
    appView: { kind: 'action', label: 'Probar ahora', id: 'virtualization' },
  },
  { id: 'checkin', name: 'Check-in', description: 'Energía, ánimo y foco al empezar el día.', icon: ClipboardCheck, defaultEnabled: true, category: 'ritual', appView: { kind: 'route', path: '/' } },
  { id: 'routines', name: 'Rutinas', description: 'Secuencias de pasos con temporizador a pantalla completa.', icon: Repeat, defaultEnabled: true, category: 'ritual', appView: { kind: 'route', path: '/rutinas' } },
  { id: 'dayTime', name: 'Tiempo de hoy', description: 'Cuánto día queda y avisos entre bloques.', icon: Clock, defaultEnabled: true, category: 'hacer', appView: { kind: 'route', path: '/' } },
  { id: 'habits', name: 'Hábitos', description: 'Hábitos diarios con rachas y recordatorios.', icon: ListChecks, defaultEnabled: true, category: 'hacer', appView: { kind: 'route', path: '/habitos' } },
  {
    id: 'focus',
    name: 'Foco',
    description: 'Pomodoro y sesiones de foco sobre una tarea.',
    icon: Timer,
    defaultEnabled: true,
    category: 'hacer',
    appView: { kind: 'action', label: 'Probar ahora', id: 'focus' },
  },
  {
    id: 'gamification',
    name: 'Gamificación',
    description: 'XP, niveles, atributos y logros.',
    icon: Trophy,
    defaultEnabled: true,
    category: 'motivacion',
    appView: { kind: 'action', label: 'Ver en la app', id: 'gamification' },
  },
  {
    id: 'weeklyReview',
    name: 'Revisión semanal',
    description: 'Cierra la semana y prepara la siguiente.',
    icon: NotebookPen,
    defaultEnabled: true,
    requires: ['planning'],
    category: 'analisis',
    appView: { kind: 'route', path: '/planificacion' },
  },
  { id: 'stats', name: 'Estadísticas', description: 'Gráficas, tendencias e insights.', icon: BarChart3, defaultEnabled: true, category: 'analisis', appView: { kind: 'route', path: '/estadisticas' } },
  { id: 'ai', name: 'IA', description: 'Divide tareas y sugiere pasos con Claude (necesita clave).', icon: Sparkles, defaultEnabled: true, category: 'integraciones', appView: { kind: 'route', path: '/' } },
  { id: 'telegram', name: 'Telegram', description: 'Captura y avisos desde un bot de Telegram.', icon: Send, defaultEnabled: true, category: 'integraciones' },
  { id: 'launchers', name: 'Lanzadores', description: 'Reglas «cuando pase X, haz Y».', icon: Workflow, defaultEnabled: true, category: 'hacer' },
]

const BY_ID = new Map(PLUGINS.map((p) => [p.id, p]))

export function getPlugin(id: PluginId): PluginManifest {
  const plugin = BY_ID.get(id)
  if (!plugin) throw new Error(`Plugin desconocido: ${id}`)
  return plugin
}
