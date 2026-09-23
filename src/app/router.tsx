import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { TodayView } from '../features/today/TodayView'
import { HabitsPage } from '../features/habits/HabitsPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { PlanningPage } from '../features/planner/PlanningPage'
import { StatsPage } from '../features/stats/StatsPage'
import { ProjectsPage } from '../features/projects/ProjectsPage'
import { ProjectDetailPage } from '../features/projects/ProjectDetailPage'
import { TasksPage } from '../features/tasks/TasksPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <TodayView /> },
      { path: '/planificacion', element: <PlanningPage /> },
      { path: '/habitos', element: <HabitsPage /> },
      { path: '/estadisticas', element: <StatsPage /> },
      { path: '/proyectos', element: <ProjectsPage /> },
      { path: '/proyectos/:id', element: <ProjectDetailPage /> },
      { path: '/tareas', element: <TasksPage /> },
      { path: '/ajustes', element: <SettingsPage /> },
    ],
  },
])
