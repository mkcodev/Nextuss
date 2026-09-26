import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { differenceInCalendarDays } from 'date-fns'
import { ArrowRight, Target } from 'lucide-react'
import { carryOverToToday, getOverdueTasks, moveTasksToDateBulk, parkTasksBulk, ZOMBIE_THRESHOLD } from '../../db/repositories/tasks'
import { getGoalForTask } from '../../db/repositories/goals'
import { nextRelativeDate, parseDateKey } from '../../lib/dates'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { TaskQuickMenu } from '../tasks/TaskQuickMenu'

/** Cuántas atrasadas se ven sin desplegar: suficiente para decidir, no tanto como para agobiar. */
const VISIBLE = 3

/** Tracks which zombie tasks already have a linked goal, so the "link it?" nudge only shows where it's useful. */
function useZombieGoalLinks(taskIds: number[]) {
  return useLiveQuery(async () => {
    const entries = await Promise.all(taskIds.map(async (id) => [id, await getGoalForTask(id)] as const))
    return new Map(entries.map(([id, goal]) => [id, goal != null]))
  }, [taskIds.join(',')])
}

function daysLate(scheduledDate: string | undefined, today: string): string {
  if (!scheduledDate) return ''
  const days = differenceInCalendarDays(parseDateKey(today), parseDateKey(scheduledDate))
  return days === 1 ? 'ayer' : `hace ${days} días`
}

/** Atrasadas de Hoy: informan, no castigan (PRODUCT.md, "progreso honesto y tranquilo"). Tono neutro,
 *  solo unas pocas a la vista y acciones en bloque para resolverlas de una vez. */
export function OverdueTasks({ date }: { date: string }) {
  const tasks = useLiveQuery(() => getOverdueTasks(date), [date])
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const [expanded, setExpanded] = useState(false)
  const zombieTaskIds = (tasks ?? [])
    .filter((t) => t.postponedCount >= ZOMBIE_THRESHOLD)
    .map((t) => t.id!)
  const goalLinks = useZombieGoalLinks(zombieTaskIds)

  if (!tasks || tasks.length === 0) return null

  // Las más recientes primero: son las que aún tienen sentido rescatar hoy.
  const ordered = [...tasks].reverse()
  const visible = expanded ? ordered : ordered.slice(0, VISIBLE)
  const ids = tasks.map((t) => t.id!)
  const tomorrow = nextRelativeDate(date, date, 1)

  return (
    <section aria-labelledby="overdue-title">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="overdue-title" className="text-sm font-semibold text-text">
          Atrasadas <span className="font-normal tabular-nums text-text-muted">{tasks.length}</span>
        </h2>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => void moveTasksToDateBulk(ids, tomorrow)}
            className="rounded-sm px-2 py-1 text-[13px] font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            Mover todas a mañana
          </button>
          <button
            type="button"
            onClick={() => void parkTasksBulk(ids)}
            className="rounded-sm px-2 py-1 text-[13px] font-medium text-text-muted hover:bg-surface-hover hover:text-text"
          >
            Aparcar todas
          </button>
        </div>
      </div>

      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
        {visible.map((t) => {
          const isZombie = t.postponedCount >= ZOMBIE_THRESHOLD
          return (
            <li key={t.id} className="flex h-10 items-center gap-2 px-3">
              <button
                type="button"
                onClick={() => openEdit(t)}
                className="min-w-0 flex-1 truncate text-left text-sm text-text hover:underline hover:decoration-border-strong hover:underline-offset-4"
              >
                {t.title}
              </button>
              {isZombie && (
                <span className="shrink-0 text-xs text-text-muted" title="Usa el menú ··· para desglosarla, reducirla o aparcarla">
                  aplazada {t.postponedCount} veces
                </span>
              )}
              {isZombie && goalLinks?.get(t.id!) === false && (
                <button
                  type="button"
                  onClick={() => openEdit(t)}
                  className="flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium text-text-muted hover:bg-surface-hover hover:text-text"
                >
                  <Target size={12} strokeWidth={2} /> Vincular a un objetivo
                </button>
              )}
              <span className="shrink-0 text-xs tabular-nums text-warning">{daysLate(t.scheduledDate, date)}</span>
              <button
                type="button"
                onClick={() => void carryOverToToday(t.id!, date)}
                aria-label={`Mover "${t.title}" a hoy`}
                className="flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium text-accent hover:bg-accent-soft"
              >
                A hoy <ArrowRight size={12} strokeWidth={2} />
              </button>
              <TaskQuickMenu task={t} />
            </li>
          )
        })}
      </ul>

      {tasks.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-1.5 rounded-sm px-1 text-[13px] font-medium text-text-muted hover:text-text"
        >
          {expanded ? 'Ver menos' : `Ver las ${tasks.length - VISIBLE} restantes`}
        </button>
      )}
    </section>
  )
}
