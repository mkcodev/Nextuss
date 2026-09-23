import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { FolderKanban, Tag as TagIcon, Trash2 } from 'lucide-react'
import { Card, EmptyState, Input } from '../../design/primitives'
import { deleteTag, listTags, updateTag } from '../../db/repositories/tags'
import { deleteProject, listProjects, updateProject } from '../../db/repositories/projects'

/** Gestión ligera de proyectos y etiquetas — se crean sobre la marcha desde `TaskForm`/quick-add,
 * esto es solo para renombrar o borrar lo que ya no hace falta (Fase 8.3). */
export function ProjectsTagsSection() {
  const projects = useLiveQuery(() => listProjects(), [])
  const tags = useLiveQuery(() => listTags(), [])

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
          <FolderKanban size={15} strokeWidth={1.75} /> Proyectos
        </h3>
        <p className="mb-3 text-xs text-text-faint">Se crean desde el formulario de tarea, al vuelo.</p>
        {projects != null && projects.length === 0 && <EmptyState icon={FolderKanban} title="Sin proyectos todavía" />}
        {projects != null && projects.length > 0 && (
          <div className="space-y-1.5">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                <Input
                  defaultValue={p.name}
                  onBlur={(e) => {
                    const name = e.target.value.trim()
                    if (name && name !== p.name) updateProject(p.id!, { name })
                  }}
                  className="!py-1 flex-1 !border-transparent !bg-transparent px-1 focus:!border-accent"
                />
                <button
                  onClick={() => deleteProject(p.id!)}
                  className="shrink-0 text-text-faint hover:text-danger"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
          <TagIcon size={15} strokeWidth={1.75} /> Etiquetas
        </h3>
        <p className="mb-3 text-xs text-text-faint">Se crean desde el formulario de tarea o el quick-add (#etiqueta).</p>
        {tags != null && tags.length === 0 && <EmptyState icon={TagIcon} title="Sin etiquetas todavía" />}
        {tags != null && tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <TagChip key={t.id} name={t.name} onRename={(name) => updateTag(t.id!, { name })} onDelete={() => deleteTag(t.id!)} />
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

function TagChip({ name, onRename, onDelete }: { name: string; onRename: (name: string) => void; onDelete: () => void }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(name)

  if (editing) {
    return (
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => {
          const trimmed = value.trim()
          if (trimmed && trimmed !== name) onRename(trimmed)
          setEditing(false)
        }}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className="!w-28 !py-1"
      />
    )
  }

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border bg-bg-soft px-2.5 py-1 text-xs text-text">
      <button onClick={() => setEditing(true)}>{name}</button>
      <button onClick={onDelete} className="text-text-faint hover:text-danger">
        <Trash2 size={11} strokeWidth={1.75} />
      </button>
    </span>
  )
}
