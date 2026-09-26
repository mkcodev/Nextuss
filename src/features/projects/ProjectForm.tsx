import { useId, useRef, useState } from 'react'
import { Archive, ArchiveRestore, Trash2 } from 'lucide-react'
import { Button, ColorPicker, Dialog, FormRow, FormRows, IconPicker, NotesField, TitleField } from '../../design/primitives'
import { DEFAULT_PROJECT_ICON_KEY, PROJECT_ICON_KEYS } from '../../design/icons'
import { archiveProject, createProject, trashProject, updateProject } from '../../db/repositories/projects'
import { AttributePicker } from '../gamification/AttributePicker'
import { useProjectFormStore } from './projectFormStore'
import { ENTITY_COLORS } from '../../lib/colors'
import { useSubmitGuard } from '../../lib/useSubmitGuard'

/** Único diálogo global (montado en AppShell), mismo patrón que `HabitForm`/`GoalForm`. */
export function ProjectForm() {
  const { open, project, close } = useProjectFormStore()
  const isEdit = !!project
  const nameRef = useRef<HTMLInputElement>(null)
  const attrId = useId()

  const [name, setName] = useState(project?.name ?? '')
  const [icon, setIcon] = useState<string>(project?.icon ?? DEFAULT_PROJECT_ICON_KEY)
  const [color, setColor] = useState(project?.color ?? ENTITY_COLORS[0])
  const [description, setDescription] = useState(project?.description ?? '')
  const [attributeId, setAttributeId] = useState<number | undefined>(project?.attributeId)
  const [nameError, setNameError] = useState(false)

  const snapshot = () => JSON.stringify([name.trim(), icon, color, description.trim(), attributeId])
  const [initialSnapshot] = useState(snapshot)

  const reset = () => {
    setName('')
    setIcon(DEFAULT_PROJECT_ICON_KEY)
    setColor(ENTITY_COLORS[0])
    setDescription('')
    setAttributeId(undefined)
  }

  const handleClose = () => {
    if (!isEdit) reset()
    close()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      // Antes no pasaba nada y no decía por qué.
      setNameError(true)
      nameRef.current?.focus()
      return
    }

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
  const [saving, guardedSubmit] = useSubmitGuard(handleSubmit)

  // Archivar no tira los cambios sin guardar: si los hay y el nombre es válido, se guardan antes.
  const [, handleArchive] = useSubmitGuard(async () => {
    if (!project?.id) return
    if (snapshot() !== initialSnapshot && name.trim()) {
      await updateProject(project.id, { name: name.trim(), icon, color, description: description.trim() || undefined, attributeId })
    }
    await archiveProject(project.id, !project.archived)
    handleClose()
  })

  const handleDelete = async () => {
    if (!project?.id) return
    await trashProject(project.id)
    handleClose()
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={isEdit ? 'Editar proyecto' : 'Nuevo proyecto'}
      size="md"
      dirty={snapshot() !== initialSnapshot}
    >
      <form
        onSubmit={guardedSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void guardedSubmit(e)
          }
        }}
      >
        <TitleField
          ref={nameRef}
          label="Nombre del proyecto"
          autoFocus
          value={name}
          onChange={(v) => {
            setName(v)
            if (nameError) setNameError(false)
          }}
          placeholder="Nombre del proyecto…"
          error={nameError ? 'Ponle un nombre para poder guardarlo.' : undefined}
        />
        <NotesField label="Descripción" value={description} onChange={setDescription} placeholder="¿De qué trata? (opcional)" />

        <div className="mt-4">
          <FormRows>
            <FormRow label="Icono" top>
              <IconPicker options={PROJECT_ICON_KEYS} value={icon} onChange={setIcon} label="Icono del proyecto" />
            </FormRow>
            <FormRow label="Color">
              <ColorPicker value={color} onChange={setColor} label="Color del proyecto" />
            </FormRow>
            <FormRow label="Atributo" htmlFor={attrId} hint="Las tareas de este proyecto suman XP a este atributo al completarse.">
              <AttributePicker id={attrId} value={attributeId} onChange={setAttributeId} />
            </FormRow>
          </FormRows>
        </div>

        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-6 py-3">
          {isEdit ? (
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleArchive()}>
                {project?.archived ? <ArchiveRestore size={14} strokeWidth={1.75} /> : <Archive size={14} strokeWidth={1.75} />}
                {project?.archived ? 'Reactivar' : 'Archivar'}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete()} className="hover:text-danger">
                <Trash2 size={14} strokeWidth={1.75} /> Eliminar
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} title="Ctrl + Enter" aria-keyshortcuts="Control+Enter">
              {isEdit ? 'Guardar proyecto' : 'Crear proyecto'}
                <kbd aria-hidden="true" className="ml-1 rounded-xs bg-black/15 px-1 text-xs font-medium">
                  Ctrl&nbsp;↵
                </kbd>
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
