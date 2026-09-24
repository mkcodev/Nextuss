import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, Archive, ChevronDown, ChevronUp, Clock, Copy, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react'
import { Card, Icon, Menu, MenuItem, MenuSeparator, RingProgress } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { todayKey } from '../../lib/dates'
import { formatMinutes } from '../stats/format'
import { createTask } from '../../db/repositories/tasks'
import { archiveProject, getProjectProgress, getProjectTimeSpentMin, getTasksForProject, trashProject } from '../../db/repositories/projects'
import { saveProjectAsTemplate } from '../../db/repositories/templates'
import { useToastStore } from '../../lib/toastStore'
import { useProjectFormStore } from './projectFormStore'
import type { Attribute, Project } from '../../db/types'

interface ProjectCardProps {
  project: Project
  attribute?: Attribute
  expanded: boolean
  onToggleExpand: () => void
}

export function ProjectCard({ project, attribute, expanded, onToggleExpand }: ProjectCardProps) {
  const openEdit = useProjectFormStore((s) => s.openEdit)
  const push = useToastStore((s) => s.push)
  const progress = useLiveQuery(() => getProjectProgress(project.id!), [project.id])
  const timeSpent = useLiveQuery(() => getProjectTimeSpentMin(project.id!), [project.id])
  const tasks = useLiveQuery(() => getTasksForProject(project.id!), [project.id])
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const today = todayKey()
  const overdueCount = tasks?.filter((t) => t.status !== 'done' && t.scheduledDate && t.scheduledDate < today).length ?? 0
  const preview = (tasks ?? []).filter((t) => t.parentId == null).slice(0, 5)

  const handleAddTask = async () => {
    const title = newTaskTitle.trim()
    if (!title) return
    await createTask({ title, projectId: project.id })
    setNewTaskTitle('')
  }

  const handleSaveAsTemplate = async () => {
    await saveProjectAsTemplate(project.id!)
    push({ title: 'Plantilla guardada', description: `"${project.name}"`, variant: 'success' })
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3.5">
        <button
          onClick={onToggleExpand}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors"
          style={{ backgroundColor: `${project.color}14`, borderColor: `${project.color}33`, color: project.color }}
        >
          <Icon name={project.icon ?? 'folder'} size={19} strokeWidth={1.75} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={`/proyectos/${project.id}`} className="truncate text-sm font-semibold text-text hover:underline">
              {project.name}
            </Link>
            {overdueCount > 0 && (
              <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-danger">
                <AlertTriangle size={11} strokeWidth={2} /> {overdueCount}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
            {progress && progress.total > 0 && (
              <span>
                {progress.done}/{progress.total} tareas
              </span>
            )}
            {!!timeSpent && (
              <span className="flex items-center gap-1">
                <Clock size={11} strokeWidth={2} /> {formatMinutes(timeSpent)}
              </span>
            )}
            {attribute && (
              <span className="flex items-center gap-1" style={{ color: attribute.color }}>
                <Icon name={attribute.icon} size={11} /> {attribute.name}
              </span>
            )}
          </div>
        </div>

        <RingProgress value={progress?.ratio ?? 0} size={40} strokeWidth={4} className="shrink-0" />

        <Menu
          trigger={(props) => (
            <button
              {...props}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
              aria-label="Más acciones"
            >
              <MoreHorizontal size={15} strokeWidth={2} />
            </button>
          )}
        >
          <MenuItem icon={<Pencil size={14} strokeWidth={1.75} />} onSelect={() => openEdit(project)}>
            Editar
          </MenuItem>
          <MenuItem
            icon={<Archive size={14} strokeWidth={1.75} />}
            onSelect={() => archiveProject(project.id!, !project.archived)}
          >
            {project.archived ? 'Reactivar' : 'Archivar'}
          </MenuItem>
          <MenuItem icon={<Copy size={14} strokeWidth={1.75} />} onSelect={() => void handleSaveAsTemplate()}>
            Guardar como plantilla
          </MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Trash2 size={14} strokeWidth={1.75} />} destructive onSelect={() => trashProject(project.id!)}>
            Eliminar
          </MenuItem>
        </Menu>

        <button
          onClick={onToggleExpand}
          className="shrink-0 text-text-faint hover:text-text"
          aria-label={expanded ? 'Contraer' : 'Expandir'}
        >
          {expanded ? <ChevronUp size={16} strokeWidth={2} /> : <ChevronDown size={16} strokeWidth={2} />}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {project.description && <p className="text-xs text-text-muted">{project.description}</p>}

          {preview.length === 0 ? (
            <p className="text-xs text-text-faint">Sin tareas todavía.</p>
          ) : (
            <ul className="space-y-1">
              {preview.map((t) => (
                <li key={t.id} className="flex items-center gap-2 text-xs text-text-muted">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', t.status === 'done' ? 'bg-accent' : 'bg-border')} />
                  <span className={cn('truncate', t.status === 'done' && 'text-text-faint line-through')}>{t.title}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-1.5">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="+ tarea…"
              className="flex-1 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <button
              onClick={handleAddTask}
              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-text-muted hover:text-text"
            >
              <Plus size={12} strokeWidth={2} />
            </button>
          </div>

          <Link to={`/proyectos/${project.id}`} className="inline-block text-xs font-medium text-accent hover:underline">
            Ver proyecto completo →
          </Link>
        </div>
      )}
    </Card>
  )
}
