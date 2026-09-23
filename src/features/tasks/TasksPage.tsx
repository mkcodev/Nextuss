import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button, Card, Checkbox, EmptyState, Select } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { todayKey } from '../../lib/dates'
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../../lib/priority'
import { listAllTasks } from '../../db/repositories/tasks'
import { listProjects } from '../../db/repositories/projects'
import { listTags } from '../../db/repositories/tags'
import {
  createTaskView,
  deleteTaskView,
  ensureDefaultTaskViews,
  listTaskViews,
  moveTaskViewBetween,
  updateTaskView,
} from '../../db/repositories/taskViews'
import { applyTaskView } from './taskViewFilter'
import { useTaskFormStore } from './taskFormStore'
import { TaskQuickMenu } from './TaskQuickMenu'
import type { Task, TaskColumnKey, TaskSortField, TaskStatus, TaskView } from '../../db/types'

const VIEW_DRAG_MIME = 'application/x-nextuss-taskview'

const STATUS_LABELS: Record<TaskStatus, string> = {
  inbox: 'Inbox',
  backlog: 'Backlog',
  planned: 'Planificada',
  done: 'Hecha',
}

const COLUMN_LABELS: Record<TaskColumnKey, string> = {
  priority: 'Prioridad',
  project: 'Proyecto',
  tags: 'Etiquetas',
  scheduledDate: 'Programada',
  dueDate: 'Límite',
  estimateMin: 'Estimación',
}

function SortIcon({ dir }: { dir: 'asc' | 'desc' }) {
  return dir === 'desc' ? <ArrowDown size={11} strokeWidth={2} /> : <ArrowUp size={11} strokeWidth={2} />
}

function toggleInArray<T>(arr: T[] | undefined, value: T): T[] {
  const current = arr ?? []
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

export function TasksPage() {
  const today = todayKey()
  const views = useLiveQuery(() => listTaskViews(), []) ?? []
  const allTasks = useLiveQuery(() => listAllTasks(), []) ?? []
  const projects = useLiveQuery(() => listProjects(true), []) ?? []
  const tags = useLiveQuery(() => listTags(), []) ?? []
  const openEditTask = useTaskFormStore((s) => s.openEdit)

  const [activeViewId, setActiveViewId] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(true)
  const [renamingId, setRenamingId] = useState<number | null>(null)

  useEffect(() => {
    void ensureDefaultTaskViews(today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sin efecto de "selecciona la primera vista por defecto": si no se ha elegido ninguna todavía,
  // se deriva directamente de `views[0]` en cada render — evita depender de la referencia (nueva en
  // cada emisión de `useLiveQuery`) dentro de un efecto.
  const effectiveViewId = activeViewId ?? views[0]?.id ?? null
  const activeView = views.find((v) => v.id === effectiveViewId)
  const projectsById = new Map(projects.map((p) => [p.id!, p]))
  const tagsById = new Map(tags.map((t) => [t.id!, t]))
  const rows = activeView ? applyTaskView(allTasks, activeView, today) : []

  const patchFilters = (changes: Partial<TaskView['filters']>) => {
    if (!activeView) return
    updateTaskView(activeView.id!, { filters: { ...activeView.filters, ...changes } })
  }

  const toggleColumn = (col: TaskColumnKey) => {
    if (!activeView) return
    updateTaskView(activeView.id!, { columns: toggleInArray(activeView.columns, col) })
  }

  const toggleSort = (field: TaskSortField) => {
    if (!activeView) return
    if (activeView.sortField === field) {
      updateTaskView(activeView.id!, { sortDir: activeView.sortDir === 'asc' ? 'desc' : 'asc' })
    } else {
      updateTaskView(activeView.id!, { sortField: field, sortDir: 'asc' })
    }
  }

  const handleNewView = async () => {
    const base = activeView
    const id = await createTaskView({
      name: 'Nueva vista',
      filters: base?.filters ?? {},
      sortField: base?.sortField ?? 'createdAt',
      sortDir: base?.sortDir ?? 'desc',
      columns: base?.columns ?? ['priority', 'project', 'scheduledDate'],
    })
    setActiveViewId(id)
  }

  const handleReorderDrop = (draggedId: number, target: TaskView) => {
    const targetIndex = views.findIndex((v) => v.id === target.id)
    const prev = views[targetIndex - 1]
    const beforeSortKey = prev && prev.id !== draggedId ? prev.sortKey : null
    moveTaskViewBetween(draggedId, beforeSortKey, target.sortKey)
  }

  const handleDeleteView = async (view: TaskView) => {
    await deleteTaskView(view.id!)
    if (activeViewId === view.id) setActiveViewId(null)
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Gestión</p>
          <h1 className="mt-1 text-2xl font-semibold text-text">Tareas</h1>
        </div>
        <Button onClick={handleNewView}>
          <Plus size={14} strokeWidth={2} /> Nueva vista
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        {views.map((view) => (
          <div
            key={view.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(VIEW_DRAG_MIME, String(view.id))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              const draggedId = Number(e.dataTransfer.getData(VIEW_DRAG_MIME))
              if (draggedId && draggedId !== view.id) handleReorderDrop(draggedId, view)
            }}
            className={cn(
              'flex cursor-grab items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium active:cursor-grabbing',
              effectiveViewId === view.id
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-border text-text-muted hover:text-text',
            )}
          >
            {renamingId === view.id ? (
              <input
                autoFocus
                defaultValue={view.name}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name) updateTaskView(view.id!, { name })
                  setRenamingId(null)
                }}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-24 border-b border-accent bg-transparent outline-none"
              />
            ) : (
              <button onClick={() => setActiveViewId(view.id!)}>{view.name}</button>
            )}
            <button onClick={() => setRenamingId(view.id!)} className="text-text-faint hover:text-text">
              <Pencil size={10} strokeWidth={2} />
            </button>
            <button onClick={() => handleDeleteView(view)} className="text-text-faint hover:text-danger">
              <Trash2 size={10} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>

      {activeView && (
        <>
          <Card className="p-3.5">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-text-muted"
            >
              Filtros y columnas
              {showFilters ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
            </button>

            {showFilters && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-text-muted">Estado</label>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(STATUS_LABELS) as TaskStatus[]).map((s) => (
                      <button
                        key={s}
                        onClick={() => patchFilters({ status: toggleInArray(activeView.filters.status, s) })}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[11px] font-medium',
                          activeView.filters.status?.includes(s)
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-faint',
                        )}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-text-muted">Prioridad</label>
                  <div className="flex flex-wrap gap-1">
                    {[1, 2, 3, 4].map((p) => (
                      <button
                        key={p}
                        onClick={() => patchFilters({ priority: toggleInArray(activeView.filters.priority, p) })}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[11px] font-semibold',
                          activeView.filters.priority?.includes(p)
                            ? 'text-white'
                            : 'border-border text-text-faint',
                        )}
                        style={activeView.filters.priority?.includes(p) ? { backgroundColor: PRIORITY_COLORS[p], borderColor: PRIORITY_COLORS[p] } : undefined}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-text-muted">Proyecto</label>
                  <Select
                    value={activeView.filters.projectId === null ? '__none__' : (activeView.filters.projectId ?? '')}
                    onChange={(e) => {
                      const v = e.target.value
                      patchFilters({ projectId: v === '' ? undefined : v === '__none__' ? null : Number(v) })
                    }}
                  >
                    <option value="">Todos</option>
                    <option value="__none__">Sin proyecto</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-text-muted">Etiquetas</label>
                  <div className="flex flex-wrap gap-1">
                    {tags.length === 0 && <span className="text-[11px] text-text-faint">Sin etiquetas todavía.</span>}
                    {tags.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => patchFilters({ tagIds: toggleInArray(activeView.filters.tagIds, t.id!) })}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px]',
                          activeView.filters.tagIds?.includes(t.id!)
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-faint',
                        )}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-text-muted">Rango de fechas</label>
                  <div className="flex items-center gap-1">
                    <Select
                      value={activeView.filters.dateField ?? 'scheduledDate'}
                      onChange={(e) => patchFilters({ dateField: e.target.value as 'scheduledDate' | 'dueDate' })}
                      className="!py-1.5 text-xs"
                    >
                      <option value="scheduledDate">Programada</option>
                      <option value="dueDate">Límite</option>
                    </Select>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <input
                      type="date"
                      value={activeView.filters.dateFrom ?? ''}
                      onChange={(e) => patchFilters({ dateFrom: e.target.value || undefined })}
                      className="w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
                    />
                    <span className="text-text-faint">→</span>
                    <input
                      type="date"
                      value={activeView.filters.dateTo ?? ''}
                      onChange={(e) => patchFilters({ dateTo: e.target.value || undefined })}
                      className="w-full rounded-lg border border-border bg-bg-soft px-2 py-1.5 text-xs text-text outline-none focus:border-accent"
                    />
                  </div>
                  <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-muted">
                    <Checkbox
                      checked={!!activeView.filters.overdueOnly}
                      onChange={(e) => patchFilters({ overdueOnly: e.target.checked })}
                    />
                    Solo atrasadas
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium text-text-muted">Columnas visibles</label>
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(COLUMN_LABELS) as TaskColumnKey[]).map((c) => (
                      <button
                        key={c}
                        onClick={() => toggleColumn(c)}
                        className={cn(
                          'rounded-md border px-2 py-1 text-[11px] font-medium',
                          activeView.columns.includes(c)
                            ? 'border-accent bg-accent-soft text-accent'
                            : 'border-border text-text-faint',
                        )}
                      >
                        {COLUMN_LABELS[c]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>

          {rows.length === 0 ? (
            <EmptyState icon={ListTodo} title="Nada aquí" description="Ninguna tarea cumple los filtros de esta vista." />
          ) : (
            <Card className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-text-faint">
                      <th className="px-4 py-2.5 font-medium">
                        <button onClick={() => toggleSort('title')} className="flex items-center gap-1">
                          Título {activeView.sortField === 'title' && <SortIcon dir={activeView.sortDir} />}
                        </button>
                      </th>
                      {activeView.columns.map((col) => {
                        const sortable = col === 'priority' || col === 'scheduledDate' || col === 'dueDate' || col === 'estimateMin'
                        return (
                          <th key={col} className="px-3 py-2.5 font-medium">
                            {sortable ? (
                              <button
                                onClick={() => toggleSort(col as TaskSortField)}
                                className="flex items-center gap-1"
                              >
                                {COLUMN_LABELS[col]}
                                {activeView.sortField === col && <SortIcon dir={activeView.sortDir} />}
                              </button>
                            ) : (
                              COLUMN_LABELS[col]
                            )}
                          </th>
                        )
                      })}
                      <th className="px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((task) => (
                      <TaskViewRow
                        key={task.id}
                        task={task}
                        columns={activeView.columns}
                        project={task.projectId ? projectsById.get(task.projectId) : undefined}
                        taskTags={task.tagIds.map((id) => tagsById.get(id)).filter((t): t is NonNullable<typeof t> => !!t)}
                        onOpen={() => openEditTask(task)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

function TaskViewRow({
  task,
  columns,
  project,
  taskTags,
  onOpen,
}: {
  task: Task
  columns: TaskColumnKey[]
  project?: { name: string; color: string }
  taskTags: { id?: number; name: string }[]
  onOpen: () => void
}) {
  return (
    <tr className="border-b border-border last:border-0 hover:bg-surface-hover">
      <td className="px-4 py-2">
        <button
          onClick={onOpen}
          className={cn('truncate text-left hover:underline', task.status === 'done' && 'text-text-faint line-through')}
        >
          {task.title}
        </button>
      </td>
      {columns.map((col) => (
        <td key={col} className="px-3 py-2 text-xs text-text-muted">
          {col === 'priority' && task.priority && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
            >
              {PRIORITY_LABELS[task.priority]}
            </span>
          )}
          {col === 'project' && project && (
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: project.color }} />
              {project.name}
            </span>
          )}
          {col === 'tags' && taskTags.length > 0 && (
            <span className="flex flex-wrap gap-1">
              {taskTags.map((t) => (
                <span key={t.id} className="rounded-full border border-border px-1.5 py-0.5 text-[10px]">
                  {t.name}
                </span>
              ))}
            </span>
          )}
          {col === 'scheduledDate' && task.scheduledDate}
          {col === 'dueDate' && task.dueDate}
          {col === 'estimateMin' && task.estimateMin != null && `${task.estimateMin} min`}
        </td>
      ))}
      <td className="px-3 py-2 text-right">
        <TaskQuickMenu task={task} />
      </td>
    </tr>
  )
}
