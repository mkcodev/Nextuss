import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, LayoutTemplate, Trash2, X } from 'lucide-react'
import { Dialog, EmptyState } from '../../design/primitives'
import { formatMinutes } from '../stats/format'
import { useToastStore } from '../../lib/toastStore'
import {
  createProjectFromTemplate,
  createTaskFromTemplate,
  deleteProjectTemplate,
  deleteTaskTemplate,
  listProjectTemplates,
  listTaskTemplates,
} from '../../db/repositories/templates'
import { useTemplatePickerStore } from './templatePickerStore'
import type { ProjectTemplate, TaskTemplate, TemplateChild } from '../../db/types'

function totalEstimate(children: TemplateChild[]): number {
  return children.reduce((sum, c) => sum + (c.estimateMin ?? 0), 0)
}

/** Selector de plantillas (Fase 13.5): lista, materializa y borra — sin renombrar ni edición aparte,
 * para eso se vuelve a guardar la tarea/proyecto tal como se quiera. Único diálogo global (montado en
 * AppShell), mismo patrón que `LogTimeDialog`/`ProjectForm`. */
export function TemplatePickerDialog() {
  const { open, mode, close } = useTemplatePickerStore()
  const push = useToastStore((s) => s.push)
  const [confirmingId, setConfirmingId] = useState<number | null>(null)

  const taskTemplates = useLiveQuery(() => listTaskTemplates(), [])
  const projectTemplates = useLiveQuery(() => listProjectTemplates(), [])
  const templates = mode === 'task' ? taskTemplates : projectTemplates

  const handleClose = () => {
    setConfirmingId(null)
    close()
  }

  const handleUseTask = async (template: TaskTemplate) => {
    await createTaskFromTemplate(template.id!)
    push({ title: 'Tarea creada', description: `Desde la plantilla "${template.title}"`, variant: 'success' })
    handleClose()
  }

  const handleUseProject = async (template: ProjectTemplate) => {
    await createProjectFromTemplate(template.id!)
    push({ title: 'Proyecto creado', description: `Desde la plantilla "${template.name}"`, variant: 'success' })
    handleClose()
  }

  const handleDelete = async (id: number) => {
    if (mode === 'task') await deleteTaskTemplate(id)
    else await deleteProjectTemplate(id)
    setConfirmingId(null)
  }

  return (
    <Dialog open={open} onClose={handleClose} title={mode === 'task' ? 'Tarea desde plantilla' : 'Proyecto desde plantilla'}>
      {templates && templates.length === 0 && (
        <EmptyState
          icon={LayoutTemplate}
          title="Todavía no has guardado ninguna plantilla"
          description={
            mode === 'task'
              ? 'Guarda una tarea como plantilla desde su menú "···" para reutilizarla aquí.'
              : 'Guarda un proyecto como plantilla desde su menú "···" para reutilizarlo aquí.'
          }
        />
      )}

      {templates && templates.length > 0 && (
        <ul className="space-y-1.5">
          {templates.map((template) => {
            const children = mode === 'task' ? (template as TaskTemplate).subtasks : (template as ProjectTemplate).tasks
            const label = mode === 'task' ? (template as TaskTemplate).title : (template as ProjectTemplate).name
            const estimate = totalEstimate(children)
            const isConfirming = confirmingId === template.id

            return (
              <li
                key={template.id}
                className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-3 py-2"
              >
                <button
                  onClick={() => void (mode === 'task' ? handleUseTask(template as TaskTemplate) : handleUseProject(template as ProjectTemplate))}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-medium text-text">{label}</p>
                  <p className="text-xs text-text-faint">
                    {children.length} {mode === 'task' ? 'subtarea' : 'tarea'}
                    {children.length === 1 ? '' : 's'}
                    {estimate > 0 && ` · ${formatMinutes(estimate)}`}
                  </p>
                </button>

                {isConfirming ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => void handleDelete(template.id!)}
                      aria-label="Confirmar eliminar"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-danger hover:bg-danger/10"
                    >
                      <Check size={14} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      aria-label="Cancelar"
                      className="flex h-6 w-6 items-center justify-center rounded-md text-text-faint hover:bg-surface-hover"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmingId(template.id!)}
                    aria-label="Eliminar plantilla"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Dialog>
  )
}
