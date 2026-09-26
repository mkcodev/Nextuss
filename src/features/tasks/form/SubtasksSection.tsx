import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, X } from 'lucide-react'
import { cn } from '../../../lib/cn'
import { createTask, getSubtasks, trashTask } from '../../../db/repositories/tasks'
import { toggleTaskDoneWithFeedback } from '../actions'
import type { Task } from '../../../db/types'

interface SubtasksSectionProps {
  /** Tarea existente: las subtareas se leen y escriben en la base al momento. */
  taskId?: number
  /** Tarea nueva: las subtareas se guardan aquí y se crean al crear la tarea. */
  pending: string[]
  onPendingChange: (next: string[]) => void
  onOpen: (task: Task) => void
}

export function SubtasksSection({ taskId, pending, onPendingChange, onOpen }: SubtasksSectionProps) {
  const [draft, setDraft] = useState('')
  const stored = useLiveQuery(() => (taskId ? getSubtasks(taskId) : Promise.resolve([] as Task[])), [taskId]) ?? []

  const add = async () => {
    const title = draft.trim()
    if (!title) return
    if (taskId) await createTask({ title, parentId: taskId, status: 'backlog' })
    else onPendingChange([...pending, title])
    setDraft('')
  }

  const circle = (done: boolean) =>
    cn(
      'grid size-4 shrink-0 place-items-center rounded-full border-[1.5px]',
      done ? 'border-accent bg-accent text-on-accent' : 'border-text-muted',
    )

  return (
    <div>
      <ul className="space-y-0.5">
        {stored.map((s) => {
          const done = s.status === 'done'
          return (
            <li key={s.id} className="group flex h-8 items-center gap-2.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={`Completar "${s.title}"`}
                onClick={() => void toggleTaskDoneWithFeedback(s.id!, s.title)}
                className={circle(done)}
              >
                {done && <Check size={10} strokeWidth={3} />}
              </button>
              <button
                type="button"
                onClick={() => onOpen(s)}
                className={cn('min-w-0 flex-1 truncate text-left text-sm text-text hover:underline', done && 'text-text-muted line-through')}
              >
                {s.title}
              </button>
              <button
                type="button"
                onClick={() => void trashTask(s.id!)}
                aria-label={`Eliminar subtarea "${s.title}"`}
                className="shrink-0 rounded-sm p-1 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
              >
                <X size={14} />
              </button>
            </li>
          )
        })}
        {pending.map((title, i) => (
          <li key={`${title}-${i}`} className="group flex h-8 items-center gap-2.5">
            <span aria-hidden="true" className={circle(false)} />
            <span className="min-w-0 flex-1 truncate text-sm text-text">{title}</span>
            <button
              type="button"
              onClick={() => onPendingChange(pending.filter((_, j) => j !== i))}
              aria-label={`Quitar subtarea "${title}"`}
              className="shrink-0 rounded-sm p-1 text-text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-danger focus-visible:opacity-100"
            >
              <X size={14} />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex h-8 items-center gap-2.5">
        <Plus size={16} strokeWidth={1.75} className="shrink-0 text-text-muted" aria-hidden="true" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              // Enter añade la subtarea; no envía el formulario de la tarea.
              e.preventDefault()
              void add()
            }
          }}
          aria-label="Nueva subtarea"
          placeholder="Añadir subtarea…"
          autoComplete="off"
          className="field-bare min-w-0 flex-1 border-b border-transparent bg-transparent text-sm text-text placeholder:text-text-muted focus:border-accent"
        />
      </div>
    </div>
  )
}
