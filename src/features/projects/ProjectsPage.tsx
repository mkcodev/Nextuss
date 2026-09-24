import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, FolderKanban, LayoutTemplate, Plus } from 'lucide-react'
import { Button, EmptyState } from '../../design/primitives'
import { listAttributes } from '../../db/repositories/gamification'
import { archiveProject, listProjects, moveProjectBetween } from '../../db/repositories/projects'
import { useProjectFormStore } from './projectFormStore'
import { useTemplatePickerStore } from '../templates/templatePickerStore'
import { ProjectCard } from './ProjectCard'
import type { Project } from '../../db/types'

const PROJECT_DRAG_MIME = 'application/x-nextuss-project'

export function ProjectsPage() {
  const [showArchived, setShowArchived] = useState(false)
  const allProjects = useLiveQuery(() => listProjects(showArchived), [showArchived])
  const activeProjects = allProjects?.filter((p) => !p.archived) ?? []
  const archivedProjects = allProjects?.filter((p) => p.archived) ?? []
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []
  const openCreate = useProjectFormStore((s) => s.openCreate)
  const openTemplatePicker = useTemplatePickerStore((s) => s.openFor)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const handleReorderDrop = (draggedId: number, target: Project) => {
    const targetIndex = activeProjects.findIndex((p) => p.id === target.id)
    const prev = activeProjects[targetIndex - 1]
    const beforeSortKey = prev && prev.id !== draggedId ? prev.sortKey : null
    moveProjectBetween(draggedId, beforeSortKey, target.sortKey)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Gestión</p>
          <h1 className="mt-1 text-2xl font-semibold text-text">Proyectos</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowArchived((v) => !v)}>
            <Archive size={14} strokeWidth={2} /> {showArchived ? 'Ocultar archivados' : 'Ver archivados'}
          </Button>
          <Button variant="ghost" onClick={() => openTemplatePicker('project')}>
            <LayoutTemplate size={14} strokeWidth={2} /> Desde plantilla
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus size={14} strokeWidth={2} /> Nuevo proyecto
          </Button>
        </div>
      </header>

      {allProjects === undefined && <p className="text-sm text-text-faint">Cargando…</p>}

      {allProjects !== undefined && activeProjects.length === 0 && (
        <EmptyState
          icon={FolderKanban}
          title="Todavía no has creado ningún proyecto"
          description="Agrupa tareas relacionadas y sigue su progreso de un vistazo."
          action={
            <Button onClick={() => openCreate()} className="text-xs">
              <Plus size={13} strokeWidth={2} /> Crear proyecto
            </Button>
          }
        />
      )}

      <div className="space-y-2">
        {activeProjects.map((project) => (
          <div
            key={project.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(PROJECT_DRAG_MIME, String(project.id))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
            }}
            onDrop={(e) => {
              e.preventDefault()
              const draggedId = Number(e.dataTransfer.getData(PROJECT_DRAG_MIME))
              if (draggedId && draggedId !== project.id) handleReorderDrop(draggedId, project)
            }}
            className="cursor-grab active:cursor-grabbing"
          >
            <ProjectCard
              project={project}
              attribute={attributes.find((a) => a.id === project.attributeId)}
              expanded={expandedId === project.id}
              onToggleExpand={() => setExpandedId((id) => (id === project.id ? null : project.id!))}
            />
          </div>
        ))}
      </div>

      {showArchived && (
        <div className="space-y-2 border-t border-border pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Archivados</p>
          {archivedProjects.length === 0 && <p className="text-sm text-text-faint">No hay proyectos archivados.</p>}
          {archivedProjects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between rounded-xl border border-border bg-bg-soft px-3.5 py-2.5"
            >
              <span className="text-sm text-text-muted">{project.name}</span>
              <Button variant="secondary" onClick={() => archiveProject(project.id!, false)} className="px-2.5 py-1 text-xs">
                Reactivar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
