import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addDays } from 'date-fns'
import { ArrowRight, Check, X } from 'lucide-react'
import { Button, Dialog, Skeleton, Textarea } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { dateKey, isHabitScheduledOn, parseDateKey } from '../../lib/dates'
import { getTasksForDate, parkTask, trashTask, updateTask } from '../../db/repositories/tasks'
import { getCheckInForDate, markRitualClose, upsertCheckIn } from '../../db/repositories/checkins'
import { getDailyEntry, upsertDailyEntry } from '../../db/repositories/dailyEntries'
import { useHabitsWithStats } from '../habits/useHabitsWithStats'
import { useDayCloseStore } from './dayCloseStore'
import type { Task } from '../../db/types'
import { emit } from '../../lib/events/bus'
import { useStage } from '../../app/stage/stageStore'

/** «intention» solo forma parte de la secuencia visible cuando el día tiene una intención fijada
 * (`DayIntentionCard`/paso «Intención del día» de la rutina) — ver `steps` más abajo. */
type StepKey = 'summary' | 'intention' | 'pending' | 'reflection'
const ALL_STEPS: StepKey[] = ['summary', 'intention', 'pending', 'reflection']

export function DayCloseFlow() {
  const { open: wanted, date, close } = useDayCloseStore()
  const open = useStage('dayClose', wanted)
  const [stepIndex, setStepIndex] = useState(0)
  const [reflection, setReflection] = useState('')

  const tasksQuery = useLiveQuery(() => (date ? getTasksForDate(date) : Promise.resolve([] as Task[])), [date])
  const tasks = tasksQuery ?? []
  const doneTasks = tasks.filter((t) => t.status === 'done')
  const pendingTasks = tasks.filter((t) => t.status !== 'done')

  const habitEntries = useHabitsWithStats(date ?? '')
  const scheduledHabits = date
    ? habitEntries?.filter((e) => isHabitScheduledOn(e.habit, parseDateKey(date)))
    : undefined
  const doneHabits = scheduledHabits?.filter((e) => e.log?.completed).length ?? 0

  const checkin = useLiveQuery(
    () => (date ? getCheckInForDate(date) : Promise.resolve(null)),
    [date],
  )

  const dailyEntry = useLiveQuery(() => (date ? getDailyEntry(date) : Promise.resolve(null)), [date])
  const hasIntention = !!dailyEntry?.intention
  const steps = hasIntention ? ALL_STEPS : ALL_STEPS.filter((s) => s !== 'intention')
  const step = steps[stepIndex] ?? steps[steps.length - 1]

  useEffect(() => {
    if (open) {
      setStepIndex(0)
      setReflection(checkin?.note ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date])

  if (!date) return null

  const finish = async () => {
    await upsertCheckIn(date, { note: reflection.trim() || undefined })
    await markRitualClose(date)
    emit('day.closed', { date })
    close()
  }

  const setIntentionKept = async (kept: boolean) => {
    await upsertDailyEntry(date, { intentionKept: kept })
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  const moveToTomorrow = (task: Task) => updateTask(task.id!, { scheduledDate: dateKey(addDays(new Date(), 1)) })

  return (
    <Dialog open={open} onClose={() => void finish()} title="Cerrar el día">
      <div className="space-y-4">
        <div className="flex items-center gap-1.5">
          {steps.map((s) => (
            <div key={s} className={cn('h-1 flex-1 rounded-full', steps.indexOf(s) <= stepIndex ? 'bg-accent' : 'bg-border')} />
          ))}
        </div>

        {step === 'summary' && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Lo conseguido hoy</p>
            {tasksQuery === undefined ? (
              <Skeleton className="h-5 w-48" />
            ) : (
              <div className="flex items-center gap-2 text-sm text-text">
                <Check size={15} className="text-accent" />
                <span>
                  <span className="font-semibold text-accent">{doneTasks.length}</span> de {tasks.length} tareas
                  completadas
                </span>
              </div>
            )}
            {scheduledHabits && scheduledHabits.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-text">
                <Check size={15} className="text-accent" />
                <span>
                  <span className="font-semibold text-accent">{doneHabits}</span> de {scheduledHabits.length} hábitos
                  cumplidos
                </span>
              </div>
            )}
          </div>
        )}

        {step === 'intention' && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Tu intención de hoy</p>
            <p className="text-sm font-medium text-text">{dailyEntry?.intention}</p>
            <p className="text-xs text-text-muted">¿La cumpliste?</p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => void setIntentionKept(true)}>
                <Check size={14} strokeWidth={2} /> Sí
              </Button>
              <Button type="button" variant="secondary" onClick={() => void setIntentionKept(false)}>
                <X size={14} strokeWidth={2} /> No
              </Button>
            </div>
          </div>
        )}

        {step === 'pending' && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">¿Qué quedó sin hacer y a dónde va?</p>
            {tasksQuery === undefined ? (
              <Skeleton className="h-10 w-full" />
            ) : pendingTasks.length === 0 ? (
              <p className="text-sm text-text-muted">Nada pendiente.</p>
            ) : (
              <div className="space-y-1.5">
                {pendingTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{t.title}</span>
                    <button
                      type="button"
                      onClick={() => moveToTomorrow(t)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-text-faint hover:bg-accent-soft hover:text-accent"
                    >
                      Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => parkTask(t.id!)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-text-faint hover:bg-accent-soft hover:text-accent"
                    >
                      Aparcar
                    </button>
                    <button
                      type="button"
                      onClick={() => trashTask(t.id!)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-text-faint hover:bg-danger/10 hover:text-danger"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'reflection' && (
          <div className="space-y-3">
            <label className="block text-xs font-medium text-text-muted">¿Cómo ha ido el día? (opcional)</label>
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              rows={3}
              placeholder="Una reflexión rápida…"
              className="resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={() => void finish()}>
            Saltar
          </Button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <Button type="button" variant="secondary" onClick={() => setStepIndex((i) => i - 1)}>
                Atrás
              </Button>
            )}
            {stepIndex < steps.length - 1 ? (
              <Button type="button" onClick={() => setStepIndex((i) => i + 1)}>
                Siguiente <ArrowRight size={14} strokeWidth={2} />
              </Button>
            ) : (
              <Button type="button" onClick={() => void finish()}>
                Terminar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
