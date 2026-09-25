import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Archive, Check, CheckCheck, Clock, FolderKanban, ListTodo, Pencil, Target } from 'lucide-react'
import { Card, EmptyState, Icon, RingProgress, SegmentedControl, Skeleton } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { StatTile } from '../stats/charts/StatTile'
import { usePageTitle } from '../../app/pageTitleStore'
import { formatMinutes } from '../stats/format'
import { buildEstimateAccuracy } from '../stats/aggregate'
import { getProject, getProjectProgress, getTasksForProject } from '../../db/repositories/projects'
import { createTask } from '../../db/repositories/tasks'
import { listAttributes } from '../../db/repositories/gamification'
import { PRIORITY_COLORS } from '../../lib/priority'
import { toggleTaskDoneWithFeedback } from '../tasks/actions'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { TaskQuickMenu } from '../tasks/TaskQuickMenu'
import { useProjectFormStore } from './projectFormStore'

type Filter = 'pendientes' | 'completadas' | 'todas'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const projectId = Number(id)
  const project = useLiveQuery(() => getProject(projectId), [projectId])
  const progress = useLiveQuery(() => getProjectProgress(projectId), [projectId])
  const tasksQuery = useLiveQuery(() => getTasksForProject(projectId), [projectId])
  const tasks = tasksQuery ?? []
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []
  const attribute = attributes.find((a) => a.id === project?.attributeId)
  const openEditTask = useTaskFormStore((s) => s.openEdit)
  const openEditProject = useProjectFormStore((s) => s.openEdit)
  const [filter, setFilter] = useState<Filter>('pendientes')
  const [newTaskTitle, setNewTaskTitle] = useState('')

  usePageTitle(project?.name ?? null, [project?.name])

  const handleAddTask = async () => {
    const title = newTaskTitle.trim()
    if (!title) return
    await createTask({ title, projectId })
    setNewTaskTitle('')
  }

  if (project === undefined)
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-6 lg:p-8">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  if (project === null)
    return (
      <div className="mx-auto max-w-4xl p-6 lg:p-8">
        <EmptyState
          icon={FolderKanban}
          title="Proyecto no encontrado"
          description="Puede que se haya eliminado o que el enlace ya no sea válido."
          action={
            <Link to="/proyectos" className="text-xs font-medium text-accent hover:underline">
              Volver a proyectos
            </Link>
          }
        />
      </div>
    )

  const timeSpentMin = tasks.reduce((sum, t) => sum + (t.actualMin ?? 0), 0)
  const accuracy = buildEstimateAccuracy(tasks)
  const rootTasks = tasks.filter((t) => t.parentId == null)
  const visibleTasks = rootTasks.filter((t) =>
    filter === 'todas' ? true : filter === 'pendientes' ? t.status !== 'done' : t.status === 'done',
  )

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <Link to="/proyectos" className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text">
        <ArrowLeft size={13} strokeWidth={2} /> Proyectos
      </Link>
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border"
            style={{ backgroundColor: `${project.color}14`, borderColor: `${project.color}33`, color: project.color }}
          >
            <Icon name={project.icon ?? 'folder'} size={26} strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Proyecto</p>
            <h1 className="mt-0.5 flex items-center gap-2 text-2xl font-semibold text-text">
              {project.name}
              {project.archived && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text-muted">
                  <Archive size={11} /> Archivado
                </span>
              )}
            </h1>
            {project.description && <p className="mt-1 max-w-xl text-sm text-text-muted">{project.description}</p>}
            {attribute && (
              <span className="mt-1.5 inline-flex items-center gap-1 text-xs" style={{ color: attribute.color }}>
                <Icon name={attribute.icon} size={12} /> {attribute.name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => openEditProject(project)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-text-muted hover:text-text"
        >
          <Pencil size={12} strokeWidth={2} /> Editar
        </button>
      </header>

      <Card glow className="flex items-center gap-4 border-accent/40 p-5">
        <RingProgress value={progress?.ratio ?? 0} size={64} strokeWidth={5} className="shrink-0">
          <Target size={22} className="text-accent" />
        </RingProgress>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">Progreso</p>
          <p className="mt-0.5 text-lg font-semibold text-text">
            {progress?.done ?? 0} / {progress?.total ?? 0} tareas
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Tareas totales" value={String(rootTasks.length)} icon={<ListTodo size={14} />} />
        <StatTile
          label="Completadas"
          value={String(rootTasks.filter((t) => t.status === 'done').length)}
          icon={<CheckCheck size={14} />}
        />
        <StatTile label="Tiempo invertido" value={formatMinutes(timeSpentMin)} icon={<Clock size={14} />} />
        <StatTile
          label="Precisión de estimación"
          value={accuracy.biasLabel ?? 'Sin datos suficientes'}
          icon={<Target size={14} />}
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Tareas</h2>
          <SegmentedControl
            options={[
              { value: 'pendientes', label: 'Pendientes' },
              { value: 'completadas', label: 'Completadas' },
              { value: 'todas', label: 'Todas' },
            ]}
            value={filter}
            onChange={setFilter}
          />
        </div>

        {tasksQuery === undefined ? (
          <Skeleton className="h-16 w-full" />
        ) : visibleTasks.length === 0 ? (
          <p className="text-sm text-text-faint">Nada aquí.</p>
        ) : (
          <div className="space-y-1.5">
            {visibleTasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <button
                  onClick={() => toggleTaskDoneWithFeedback(t.id!, t.title)}
                  aria-label={t.status === 'done' ? `Reabrir "${t.title}"` : `Completar "${t.title}"`}
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    t.status === 'done' ? 'border-accent bg-accent text-white' : 'border-text-faint',
                  )}
                >
                  {t.status === 'done' && <Check size={10} strokeWidth={3} />}
                </button>
                {t.priority && (
                  <span
                    className="shrink-0 rounded px-1 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: PRIORITY_COLORS[t.priority] }}
                  >
                    P{t.priority}
                  </span>
                )}
                <button
                  onClick={() => openEditTask(t)}
                  className={cn(
                    'min-w-0 flex-1 truncate text-left text-sm hover:underline',
                    t.status === 'done' ? 'text-text-faint line-through' : 'text-text',
                  )}
                >
                  {t.title}
                </button>
                <TaskQuickMenu task={t} />
              </div>
            ))}
          </div>
        )}

        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void handleAddTask()
            }
          }}
          placeholder="Añadir tarea al proyecto…"
          aria-label="Añadir tarea al proyecto"
          className="mt-2 w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
        />
      </div>
    </div>
  )
}
