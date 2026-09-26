import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Plus, Repeat } from 'lucide-react'
import { getUnscheduledTasks, createTask, getSubtasks, moveTaskBetween } from '../../db/repositories/tasks'
import { listTags } from '../../db/repositories/tags'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { toggleTaskDoneWithFeedback } from '../tasks/actions'
import { cn } from '../../lib/cn'
import { priorityBadgeStyle } from '../../lib/priority'
import { TaskQuickMenu } from '../tasks/TaskQuickMenu'
import type { Tag, Task } from '../../db/types'
import { TASK_DRAG_MIME } from './constants'
import { DropIndicator } from '../../design/primitives'
import { useDragReorder } from '../../lib/useDragReorder'
import { reorderNeighbors, type DropPosition } from '../../lib/reorder'
import { DEFAULT_ENTITY_COLOR } from '../../lib/colors'

function SubtaskRow({ subtask, onOpen }: { subtask: Task; onOpen: (t: Task) => void }) {
  const done = subtask.status === 'done'
  return (
    <div className="ml-4 flex items-center gap-2 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5">
      <button
        onClick={() => toggleTaskDoneWithFeedback(subtask.id!, subtask.title)}
        className={cn(
          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border',
          done ? 'border-accent bg-accent text-on-accent' : 'border-text-faint',
        )}
      >
        {done && <Check size={9} strokeWidth={3} />}
      </button>
      <button
        onClick={() => onOpen(subtask)}
        className={cn('min-w-0 flex-1 truncate text-left text-xs text-text', done && 'text-text-faint line-through')}
      >
        {subtask.title}
      </button>
    </div>
  )
}

function TaskRow({
  task,
  onOpen,
  tagsById,
  dnd,
}: {
  task: Task
  onOpen: (t: Task) => void
  tagsById: Map<number, Tag>
  dnd: ReturnType<typeof useDragReorder>
}) {
  const subtasks = useLiveQuery(() => (task.id ? getSubtasks(task.id) : Promise.resolve([])), [task.id]) ?? []
  const done = subtasks.filter((s) => s.status === 'done').length
  const tags = task.tagIds.map((id) => tagsById.get(id)).filter((t): t is Tag => !!t)

  return (
    <div className="space-y-1.5">
      <div
        {...dnd.rowProps(task.id!)}
        onClick={() => onOpen(task)}
        title="Arrastra al timeline para programarla, o sobre otra tarea para reordenar"
        className={cn(
          'relative flex cursor-grab items-center gap-2 rounded-lg border border-l-[3px] border-border bg-surface px-3 py-2 transition-all hover:border-border-strong active:cursor-grabbing',
          dnd.dragging(task.id!) && 'opacity-40',
        )}
        style={{ borderLeftColor: task.color ?? DEFAULT_ENTITY_COLOR }}
      >
        {task.priority && (
          <span
            className="shrink-0 rounded px-1 py-0.5 text-xs font-semibold"
            style={priorityBadgeStyle(task.priority)}
          >
            P{task.priority}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-text">{task.title}</span>
        {task.recurrenceId && <Repeat size={11} strokeWidth={2} className="shrink-0 text-text-faint" />}
        {tags.map((tag) => (
          <span
            key={tag.id}
            className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-xs text-text-muted"
          >
            {tag.name}
          </span>
        ))}
        {subtasks.length > 0 && (
          <span className="shrink-0 text-xs tabular-nums text-text-faint">
            {done}/{subtasks.length}
          </span>
        )}
        <span className="shrink-0 text-xs tabular-nums text-text-faint">{task.estimateMin ?? 30} min</span>
        <TaskQuickMenu task={task} />
        <DropIndicator position={dnd.dropPosition(task.id!)} />
      </div>
      {subtasks.map((s) => (
        <SubtaskRow key={s.id} subtask={s} onOpen={onOpen} />
      ))}
    </div>
  )
}

export function UnscheduledTray({ date }: { date: string }) {
  const tasks = useLiveQuery(() => getUnscheduledTasks(date), [date])
  const tags = useLiveQuery(() => listTags(), []) ?? []
  const tagsById = new Map(tags.map((t) => [t.id!, t]))
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const [quickTitle, setQuickTitle] = useState('')

  const handleQuickAdd = async () => {
    const title = quickTitle.trim()
    if (!title) return
    await createTask({ title, status: 'planned' })
    setQuickTitle('')
  }

  const handleMove = (draggedId: number, targetId: number, position: DropPosition) => {
    if (!tasks) return
    const n = reorderNeighbors(tasks, (t) => t.id, draggedId, targetId, position)
    if (n) void moveTaskBetween(draggedId, n.before, n.after)
  }
  const dnd = useDragReorder({ mime: TASK_DRAG_MIME, onMove: handleMove })

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

      <div className="space-y-2">
        {tasks?.map((t) => (
          <TaskRow key={t.id} task={t} onOpen={openEdit} tagsById={tagsById} dnd={dnd} />
        ))}
      </div>
    </div>
  )
}
