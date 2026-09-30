import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { TodayView } from '../features/today/TodayView'
import { lazyNamed } from './lazy'
import { PluginGate } from '../features/plugins/PluginGate'

// Solo "Hoy" (la ruta de entrada) va en el bundle inicial; el resto se descarga al visitarla. Recharts
// vive entero detrás de `/estadisticas`.
const HabitsPage = lazyNamed(() => import('../features/habits/HabitsPage'), 'HabitsPage')
const SettingsPage = lazyNamed(() => import('../features/settings/SettingsPage'), 'SettingsPage')
const PlanningPage = lazyNamed(() => import('../features/planner/PlanningPage'), 'PlanningPage')
const StatsPage = lazyNamed(() => import('../features/stats/StatsPage'), 'StatsPage')
const ProjectsPage = lazyNamed(() => import('../features/projects/ProjectsPage'), 'ProjectsPage')
const ProjectDetailPage = lazyNamed(() => import('../features/projects/ProjectDetailPage'), 'ProjectDetailPage')
const TasksPage = lazyNamed(() => import('../features/tasks/TasksPage'), 'TasksPage')
const RoutinesPage = lazyNamed(() => import('../features/routines/RoutinesPage'), 'RoutinesPage')
const PluginsPage = lazyNamed(() => import('../features/plugins/PluginsPage'), 'PluginsPage')

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <TodayView /> },
      { path: '/planificacion', element: <PlanningPage /> },
      { path: '/habitos', element: <PluginGate id="habits"><HabitsPage /></PluginGate> },
      { path: '/rutinas', element: <PluginGate id="routines"><RoutinesPage /></PluginGate> },
      { path: '/estadisticas', element: <PluginGate id="stats"><StatsPage /></PluginGate> },
      { path: '/proyectos', element: <ProjectsPage /> },
      { path: '/proyectos/:id', element: <ProjectDetailPage /> },
      { path: '/tareas', element: <TasksPage /> },
      { path: '/plugins', element: <PluginsPage /> },
      { path: '/plugins/:id', element: <PluginsPage /> },
      { path: '/ajustes', element: <SettingsPage /> },
    ],
  },
])
