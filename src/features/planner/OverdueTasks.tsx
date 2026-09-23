import { useLiveQuery } from 'dexie-react-hooks'
import { AlertTriangle, ArrowRight, Target } from 'lucide-react'
import { Card } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { carryOverToToday, getOverdueTasks, ZOMBIE_THRESHOLD } from '../../db/repositories/tasks'
import { getGoalForTask } from '../../db/repositories/goals'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { TaskQuickMenu } from '../tasks/TaskQuickMenu'

/** Tracks which zombie tasks already have a linked goal, so the "link it?" nudge only shows where it's useful. */
function useZombieGoalLinks(taskIds: number[]) {
  return useLiveQuery(async () => {
    const entries = await Promise.all(taskIds.map(async (id) => [id, await getGoalForTask(id)] as const))
    return new Map(entries.map(([id, goal]) => [id, goal != null]))
  }, [taskIds.join(',')])
}

export function OverdueTasks({ date }: { date: string }) {
  const tasks = useLiveQuery(() => getOverdueTasks(date), [date])
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const zombieTaskIds = (tasks ?? [])
    .filter((t) => t.postponedCount >= ZOMBIE_THRESHOLD)
    .map((t) => t.id!)
  const goalLinks = useZombieGoalLinks(zombieTaskIds)

  if (!tasks || tasks.length === 0) return null

  return (
    <Card className="border-warning/30 bg-warning/5 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <AlertTriangle size={14} strokeWidth={2} className="text-warning" />
        <p className="text-xs font-semibold text-text">
          {tasks.length} tarea{tasks.length > 1 ? 's' : ''} atrasada{tasks.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-1.5">
        {tasks.map((t) => {
          const isZombie = t.postponedCount >= ZOMBIE_THRESHOLD
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5"
            >
              <button
                onClick={() => openEdit(t)}
                className="min-w-0 flex-1 truncate text-left text-xs text-text hover:underline"
              >
                {t.title}
              </button>
              <span className="shrink-0 text-[10px] text-text-faint">{t.scheduledDate}</span>
              {isZombie && (
                <span
                  title={`Pospuesta ${t.postponedCount} veces — usa el menú "···" para desglosarla, reducirla, aparcarla o eliminarla`}
                  className={cn('shrink-0 text-danger')}
                >
                  <AlertTriangle size={12} strokeWidth={2} />
                </span>
              )}
              {isZombie && goalLinks?.get(t.id!) === false && (
                <button
                  onClick={() => openEdit(t)}
                  title="¿La vinculamos a un objetivo?"
                  className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-text-faint hover:bg-accent-soft hover:text-accent"
                >
                  <Target size={10} strokeWidth={2.5} /> Vincular
                </button>
              )}
              <button
                onClick={() => carryOverToToday(t.id!, date)}
                title="Mover a hoy"
                className="flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-accent hover:bg-accent-soft"
              >
                Hoy <ArrowRight size={10} strokeWidth={2.5} />
              </button>
              <TaskQuickMenu task={t} />
            </div>
          )
        })}
      </div>
    </Card>
  )
}
