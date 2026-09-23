import { addDays } from 'date-fns'
import { MoreHorizontal, CalendarX, CalendarClock, CalendarPlus, Play, Trash2 } from 'lucide-react'
import { Menu, MenuItem } from '../../design/primitives'
import { dateKey } from '../../lib/dates'
import { trashTask, unscheduleTask, updateTask } from '../../db/repositories/tasks'
import { startFocusOnTask } from '../focus/startFocusOnTask'
import type { Task } from '../../db/types'

/** Menú contextual de reprogramado rápido (Fase 8.5) — mismas acciones que la sección "Reprogramar"
 * de `TaskForm`, pero sin abrir el diálogo completo. */
export function TaskQuickMenu({ task }: { task: Task }) {
  return (
    <Menu
      trigger={(props) => (
        <button
          {...props}
          onClick={(e) => {
            e.stopPropagation()
            props.onClick()
          }}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-text-faint hover:bg-surface-hover hover:text-text"
          aria-label="Más acciones"
        >
          <MoreHorizontal size={14} strokeWidth={2} />
        </button>
      )}
    >
      {task.status !== 'done' && (
        <MenuItem icon={<Play size={14} strokeWidth={1.75} />} onSelect={() => void startFocusOnTask(task.id!)}>
          Empezar foco
        </MenuItem>
      )}
      <MenuItem icon={<CalendarClock size={14} strokeWidth={1.75} />} onSelect={() => updateTask(task.id!, { scheduledDate: dateKey(addDays(new Date(), 1)) })}>
        Mañana
      </MenuItem>
      <MenuItem icon={<CalendarPlus size={14} strokeWidth={1.75} />} onSelect={() => updateTask(task.id!, { scheduledDate: dateKey(addDays(new Date(), 7)) })}>
        Próxima semana
      </MenuItem>
      {task.scheduledDate && (
        <MenuItem icon={<CalendarX size={14} strokeWidth={1.75} />} onSelect={() => unscheduleTask(task.id!)}>
          Quitar del calendario
        </MenuItem>
      )}
      <MenuItem icon={<Trash2 size={14} strokeWidth={1.75} />} destructive onSelect={() => trashTask(task.id!)}>
        Eliminar
      </MenuItem>
    </Menu>
  )
}
