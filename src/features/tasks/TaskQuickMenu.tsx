import { addDays } from 'date-fns'
import {
  MoreHorizontal,
  CalendarX,
  CalendarClock,
  CalendarPlus,
  Play,
  Trash2,
  Sparkles,
  TimerReset,
  Archive,
} from 'lucide-react'
import { Menu, MenuItem, MenuSeparator } from '../../design/primitives'
import { dateKey } from '../../lib/dates'
import { ZOMBIE_THRESHOLD, parkTask, trashTask, unscheduleTask, updateTask } from '../../db/repositories/tasks'
import { startFocusOnTask } from '../focus/startFocusOnTask'
import { useAiAvailable } from '../ai/useAiAvailable'
import { useTaskBreakdownStore } from '../ai/taskBreakdownStore'
import type { Task } from '../../db/types'

/** Menú contextual de reprogramado rápido (Fase 8.5) — mismas acciones que la sección "Reprogramar"
 * de `TaskForm`, pero sin abrir el diálogo completo. */
export function TaskQuickMenu({ task }: { task: Task }) {
  const { available: aiAvailable } = useAiAvailable()
  const openBreakdown = useTaskBreakdownStore((s) => s.openFor)
  const isZombie = task.postponedCount >= ZOMBIE_THRESHOLD

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
      {isZombie && (
        <>
          <MenuSeparator />
          {aiAvailable && (
            <MenuItem
              icon={<Sparkles size={14} strokeWidth={1.75} />}
              onSelect={() => openBreakdown({ parentTaskId: task.id!, title: task.title, notes: task.notes })}
            >
              Desglosar con IA
            </MenuItem>
          )}
          <MenuItem
            icon={<TimerReset size={14} strokeWidth={1.75} />}
            onSelect={() => updateTask(task.id!, { estimateMin: Math.max(15, (task.estimateMin ?? 30) - 15) })}
          >
            Reducir 15 min
          </MenuItem>
          <MenuItem icon={<Archive size={14} strokeWidth={1.75} />} onSelect={() => parkTask(task.id!)}>
            Aparcar
          </MenuItem>
        </>
      )}
      <MenuItem icon={<Trash2 size={14} strokeWidth={1.75} />} destructive onSelect={() => trashTask(task.id!)}>
        Eliminar
      </MenuItem>
    </Menu>
  )
}
