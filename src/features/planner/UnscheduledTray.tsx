import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus } from 'lucide-react'
import { getUnscheduledTasks, createTask } from '../../db/repositories/tasks'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { TASK_DRAG_MIME } from './constants'

export function UnscheduledTray({ date }: { date: string }) {
  const tasks = useLiveQuery(() => getUnscheduledTasks(date), [date])
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const [quickTitle, setQuickTitle] = useState('')

  const handleQuickAdd = async () => {
    const title = quickTitle.trim()
    if (!title) return
    await createTask({ title, status: 'planned' })
    setQuickTitle('')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        <input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleQuickAdd()}
          placeholder="Añadir tarea…"
          className="flex-1 rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
        />
        <button
          onClick={handleQuickAdd}
          className="flex items-center justify-center rounded-lg border border-border px-2 text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <Plus size={15} strokeWidth={2} />
        </button>
      </div>

      {tasks?.length === 0 && (
        <p className="text-xs text-text-faint">Sin tareas pendientes de planificar.</p>
      )}

      <div className="space-y-1.5">
        {tasks?.map((t) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(TASK_DRAG_MIME, String(t.id))
              e.dataTransfer.effectAllowed = 'move'
            }}
            onClick={() => openEdit(t)}
            title="Arrastra al timeline para programarla"
            className="flex cursor-grab items-center gap-2 rounded-lg border border-l-[3px] border-border bg-surface px-3 py-2 transition-colors hover:border-border-strong active:cursor-grabbing"
            style={{ borderLeftColor: t.color ?? '#5EC8FF' }}
          >
            <span className="min-w-0 flex-1 truncate text-sm text-text">{t.title}</span>
            <span className="shrink-0 text-xs tabular-nums text-text-faint">
              {t.estimateMin ?? 30} min
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
