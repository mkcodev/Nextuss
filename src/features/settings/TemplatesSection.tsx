import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { LayoutTemplate, Plus, Sparkles, X } from 'lucide-react'
import { Button, Card, EmptyState } from '../../design/primitives'
import {
  deleteProjectTemplate,
  deleteTaskTemplate,
  listProjectTemplates,
  listTaskTemplates,
  updateProjectTemplate,
  updateTaskTemplate,
} from '../../db/repositories/templates'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import type { TemplateChild } from '../../db/types'
import { useAiAvailable } from '../ai/useAiAvailable'
import { useAiSuggestStore } from '../ai/aiSuggestStore'

/** Plantillas de tarea y de proyecto (Fase 18): antes solo se podían crear y borrar; aquí se renombran
 *  y se edita su lista de subtareas / tareas. */
export function TemplatesSection() {
  const taskTemplates = useLiveQuery(() => listTaskTemplates(), [])
  const projectTemplates = useLiveQuery(() => listProjectTemplates(), [])
  const empty = taskTemplates?.length === 0 && projectTemplates?.length === 0
  const { available: aiAvailable } = useAiAvailable()
  const openAiSuggest = useAiSuggestStore((s) => s.openFor)

  return (
    <Card className="p-4">
      <div className="mb-1 flex items-center gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
          <LayoutTemplate size={15} strokeWidth={1.75} aria-hidden="true" /> Plantillas
        </h2>
        {aiAvailable && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => openAiSuggest({ kind: 'template' })}>
            <Sparkles size={14} strokeWidth={1.75} className="text-accent" /> Generar plantilla de proyecto
          </Button>
        )}
      </div>
      <p className="mb-3 text-sm text-text-muted">
        Se crean desde el menú ··· de una tarea o de un proyecto. Aquí puedes renombrarlas y cambiar lo que contienen.
      </p>
      {empty && <EmptyState icon={LayoutTemplate} title="Aún no tienes plantillas" />}
      {taskTemplates && taskTemplates.length > 0 && (
        <TemplateGroup
          title="De tarea"
          childLabel="Subtareas"
          items={taskTemplates.map((t) => ({ id: t.id!, name: t.title, children: t.subtasks }))}
          onSave={(id, name, children) => updateTaskTemplate(id, { title: name, subtasks: children })}
          onDelete={deleteTaskTemplate}
        />
      )}
      {projectTemplates && projectTemplates.length > 0 && (
        <TemplateGroup
          title="De proyecto"
          childLabel="Tareas"
          items={projectTemplates.map((t) => ({ id: t.id!, name: t.name, children: t.tasks }))}
          onSave={(id, name, children) => updateProjectTemplate(id, { name, tasks: children })}
          onDelete={deleteProjectTemplate}
        />
      )}
    </Card>
  )
}

interface Item {
  id: number
  name: string
  children: TemplateChild[]
}

function TemplateGroup({
  title,
  childLabel,
  items,
  onSave,
  onDelete,
}: {
  title: string
  childLabel: string
  items: Item[]
  onSave: (id: number, name: string, children: TemplateChild[]) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  return (
    <div className="mt-3 first:mt-0">
      <h3 className="mb-1.5 text-xs font-semibold text-text-muted">{title}</h3>
      <ul className="divide-y divide-border rounded-md border border-border">
        {items.map((item) =>
          editingId === item.id ? (
            <TemplateEditor
              key={item.id}
              item={item}
              childLabel={childLabel}
              onCancel={() => setEditingId(null)}
              onSave={async (name, children) => {
                await onSave(item.id, name, children)
                setEditingId(null)
              }}
            />
          ) : (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-text">{item.name}</p>
                <p className="text-xs text-text-muted">
                  {item.children.length} {item.children.length === 1 ? childLabel.toLowerCase().replace(/s$/, '') : childLabel.toLowerCase()}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setEditingId(item.id)} aria-label={`Editar la plantilla "${item.name}"`}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" className="hover:text-danger" onClick={() => void onDelete(item.id)} aria-label={`Eliminar la plantilla "${item.name}"`}>
                Eliminar
              </Button>
            </li>
          ),
        )}
      </ul>
    </div>
  )
}

function TemplateEditor({
  item,
  childLabel,
  onCancel,
  onSave,
}: {
  item: Item
  childLabel: string
  onCancel: () => void
  onSave: (name: string, children: TemplateChild[]) => Promise<void>
}) {
  const nameId = useId()
  const [name, setName] = useState(item.name)
  const [children, setChildren] = useState<TemplateChild[]>(item.children)
  const [error, setError] = useState(false)
  const [saving, save] = useSubmitGuard(async () => {
    if (!name.trim()) {
      setError(true)
      return
    }
    await onSave(name, children)
  })

  return (
    <li className="space-y-3 bg-bg-soft px-3 py-3 text-sm">
      <div>
        <label htmlFor={nameId} className="mb-1 block text-xs font-semibold text-text-muted">
          Nombre
        </label>
        <input
          id={nameId}
          autoFocus
          value={name}
          aria-invalid={error}
          onChange={(e) => {
            setName(e.target.value)
            setError(false)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              onCancel()
            }
          }}
          className="h-8 w-full rounded-sm border border-border bg-surface px-2.5 text-sm text-text focus:border-accent aria-invalid:border-danger"
        />
        {error && (
          <p role="alert" className="mt-1 text-sm text-danger">
            Ponle un nombre.
          </p>
        )}
      </div>
      <fieldset>
        <legend className="mb-1 text-xs font-semibold text-text-muted">{childLabel}</legend>
        <ul className="space-y-1">
          {children.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <input
                value={c.title}
                aria-label={`${childLabel.replace(/s$/, '')} ${i + 1}`}
                onChange={(e) => setChildren((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                className="h-8 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm text-text focus:border-accent"
              />
              <button
                type="button"
                onClick={() => setChildren((prev) => prev.filter((_, j) => j !== i))}
                aria-label={`Quitar "${c.title || 'vacía'}"`}
                className="rounded-sm p-1.5 text-text-muted hover:text-danger"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" size="sm" variant="ghost" className="mt-1" onClick={() => setChildren((prev) => [...prev, { title: '' }])}>
          <Plus size={14} strokeWidth={2} /> Añadir
        </Button>
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" loading={saving} onClick={() => void save()}>
          Guardar plantilla
        </Button>
      </div>
    </li>
  )
}
