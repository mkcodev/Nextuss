import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, Dialog, Icon, Textarea } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { DEFAULT_PROJECT_ICON_KEY, PROJECT_ICON_KEYS } from '../../design/icons'
import { archiveProject, createProject, trashProject, updateProject } from '../../db/repositories/projects'
import { useAttributesWithCreate } from '../gamification/useAttributesWithCreate'
import { useProjectFormStore } from './projectFormStore'
import { ENTITY_COLORS } from '../../lib/colors'


/** Único diálogo global (montado en AppShell), mismo patrón que `HabitForm`/`GoalForm`. */
export function ProjectForm() {
  const { open, project, close } = useProjectFormStore()
  const isEdit = !!project
  const { attributes, createAndSelect } = useAttributesWithCreate()

  const [name, setName] = useState(project?.name ?? '')
  const [icon, setIcon] = useState(project?.icon ?? DEFAULT_PROJECT_ICON_KEY)
  const [color, setColor] = useState(project?.color ?? ENTITY_COLORS[0])
  const [description, setDescription] = useState(project?.description ?? '')
  const [attributeId, setAttributeId] = useState<number | undefined>(project?.attributeId)
  const [newAttrName, setNewAttrName] = useState('')

  const reset = () => {
    setName('')
    setIcon(DEFAULT_PROJECT_ICON_KEY)
    setColor(ENTITY_COLORS[0])
    setDescription('')
    setAttributeId(undefined)
    setNewAttrName('')
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const handleAddAttribute = async () => {
    const trimmed = newAttrName.trim()
    if (!trimmed) return
    const id = await createAndSelect(trimmed)
    setAttributeId(id)
    setNewAttrName('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name: name.trim(),
      icon,
      color,
      description: description.trim() || undefined,
      attributeId,
    }

    if (isEdit && project?.id) {
      await updateProject(project.id, payload)
    } else {
      await createProject(payload)
    }
    handleClose()
  }

  const handleArchive = async () => {
    if (!project?.id) return
    await archiveProject(project.id, !project.archived)
    handleClose()
  }

  const handleDelete = async () => {
    if (!project?.id) return
    await trashProject(project.id)
    handleClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Nombre</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Lanzamiento web"
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Icono</label>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_ICON_KEYS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setIcon(opt)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                  icon === opt
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-border text-text-muted hover:text-text',
                )}
              >
                <Icon name={opt} size={16} strokeWidth={1.75} />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Color</label>
          <div className="flex gap-1.5">
            {ENTITY_COLORS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setColor(opt)}
                className={cn(
                  'h-7 w-7 rounded-full border-2',
                  color === opt ? 'border-text' : 'border-transparent',
                )}
                style={{ backgroundColor: opt }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Descripción (opcional)</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="¿De qué trata este proyecto?"
            rows={2}
            className="resize-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-muted">Atributo (opcional)</label>
          <p className="mb-1.5 text-xs text-text-faint">
            Las tareas de este proyecto suman XP a este atributo al completarse.
          </p>
          <select
            value={attributeId ?? ''}
            onChange={(e) => setAttributeId(e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
          >
            <option value="">Sin atributo</option>
            {attributes.map((attr) => (
              <option key={attr.id} value={attr.id}>
                {attr.name}
              </option>
            ))}
          </select>
          <div className="mt-1.5 flex gap-1.5">
            <input
              value={newAttrName}
              onChange={(e) => setNewAttrName(e.target.value)}
              placeholder="Crear atributo nuevo…"
              className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-xs text-text outline-none focus:border-accent"
            />
            <Button type="button" variant="secondary" onClick={handleAddAttribute} className="px-2.5 py-1.5 text-xs">
              Añadir
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {isEdit ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" onClick={handleArchive} className="px-2.5 text-xs">
                {project?.archived ? 'Reactivar' : 'Archivar'}
              </Button>
              <Button type="button" variant="danger" onClick={handleDelete} className="px-2.5 text-xs">
                <Trash2 size={13} /> Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit">{isEdit ? 'Guardar' : 'Crear proyecto'}</Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
