import { useEffect, useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion, useReducedMotion } from 'framer-motion'
import { CalendarClock, Check, CheckCheck, Play, Plus } from 'lucide-react'
import { Button } from '../../design/primitives'
import { getTasksForDate, moveTasksToDateBulk } from '../../db/repositories/tasks'
import { getProject } from '../../db/repositories/projects'
import { getGoalForTask } from '../../db/repositories/goals'
import { nextRelativeDate, timeToMinutes } from '../../lib/dates'
import { PRIORITY_NAMES } from '../../lib/priority'
import { PriorityBars } from '../tasks/PriorityBars'
import { cn } from '../../lib/cn'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import { startFocusOnTask } from '../focus/startFocusOnTask'
import { toggleTaskDoneWithFeedback } from '../tasks/actions'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { useQuickAddStore } from '../tasks/quickAddStore'
import type { EnergyLevel, Task } from '../../db/types'
import { pickNowTask } from './pickNowTask'

const ENERGY_NAMES: Record<EnergyLevel, string> = { low: 'Baja', medium: 'Media', high: 'Alta' }

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

function useNowMinutes() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now.getHours() * 60 + now.getMinutes()
}

/** Bloque "Ahora" de Hoy (DESIGN.md, componente firma): la tarea que toca, cuánto dura y cuánto
 *  llevas, medido como en un plano; debajo, sus propiedades en casillas y las tres acciones. */
export function NowBlock({ date }: { date: string }) {
  const nowMin = useNowMinutes()
  const tasks = useLiveQuery(() => getTasksForDate(date), [date])
  const pick = tasks ? pickNowTask(tasks, nowMin) : null
  const task = pick?.task
  const project = useLiveQuery(
    () => (task?.projectId ? getProject(task.projectId) : Promise.resolve(null)),
    [task?.projectId],
  )
  const goal = useLiveQuery(() => (task?.id ? getGoalForTask(task.id) : Promise.resolve(null)), [task?.id])
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const [movingToTomorrow, moveToTomorrow] = useSubmitGuard((t: Task) => moveTasksToDateBulk([t.id!], nextRelativeDate(t.scheduledDate, date, 1)))

  if (!tasks) return null
  if (!pick || !task) return <NowEmpty allDone={tasks.some((t) => t.status === 'done' && !t.parentId)} />

  const slotted = pick.mode !== 'pick'
  const current = pick.mode === 'current'
  const start = slotted ? timeToMinutes(task.scheduledStart!) : 0
  const end = slotted ? timeToMinutes(task.scheduledEnd!) : 0
  const total = Math.max(end - start, 1)
  const elapsed = current ? Math.min(Math.max(nowMin - start, 0), total) : 0
  const progress = (elapsed / total) * 100
  const meta = current
    ? `quedan ${formatDuration(end - nowMin)}`
    : slotted
      ? `empieza en ${formatDuration(start - nowMin)}`
      : task.estimateMin
        ? `unos ${formatDuration(task.estimateMin)}`
        : 'sin hora'
  const heading = current ? 'Ahora' : slotted ? 'A continuación' : 'Lo siguiente'

  const cells: { label: string; value: string; dot?: string; bars?: number }[] = [
    { label: 'Proyecto', value: project?.name ?? '—', dot: project?.color },
    { label: 'Prioridad', value: task.priority ? PRIORITY_NAMES[task.priority] : '—', bars: task.priority },
    { label: 'Energía', value: task.energy ? ENERGY_NAMES[task.energy] : '—' },
    { label: 'Objetivo', value: goal?.title ?? '—' },
  ]

  return (
    <motion.section
      key={task.id}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: [0.25, 1, 0.5, 1] }}
      aria-labelledby={titleId}
      className="rounded-md border border-border bg-surface p-5"
    >
      <div className="flex items-center gap-2 text-sm">
        <span
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 rounded-full border-[1.5px]',
            current ? 'border-accent bg-[conic-gradient(var(--color-accent)_0_50%,transparent_0)]' : 'border-text-faint',
          )}
        />
        <span className="font-semibold text-text-muted">{heading}</span>
        <span className="ml-auto tabular-nums text-text-muted">{meta}</span>
      </div>

      <h2 id={titleId} className="mt-2 text-xl font-semibold tracking-tight text-balance text-text">
        <button type="button" onClick={() => openEdit(task)} className="text-left hover:underline hover:decoration-border-strong hover:underline-offset-4">
          {task.title}
        </button>
      </h2>

      {/* Línea de medida: los extremos marcan inicio y fin, el tramo relleno lo que ya ha pasado. */}
      {slotted ? (
        <div
          role="meter"
          aria-label="Tiempo de la tarea"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={elapsed}
          aria-valuetext={`${formatDuration(elapsed)} de ${formatDuration(total)}, de ${task.scheduledStart} a ${task.scheduledEnd}`}
          className="relative mt-5 mb-8 h-0.5 rounded-full bg-border"
        >
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${progress}%` }} />
          <span className="absolute -top-[5px] left-0 h-3 w-[1.5px] rounded-full bg-text-faint" />
          <span className="absolute -top-[5px] right-0 h-3 w-[1.5px] rounded-full bg-text-faint" />
          <span className="absolute left-1/2 -top-2.5 -translate-x-1/2 bg-surface px-2 text-[13px] font-medium tabular-nums text-text">
            {formatDuration(total)}
          </span>
          <span className="absolute left-0 top-2.5 text-xs tabular-nums text-text-muted">{task.scheduledStart}</span>
          <span className="absolute right-0 top-2.5 text-xs tabular-nums text-text-muted">{task.scheduledEnd}</span>
        </div>
      ) : (
        <p className="mt-1 mb-4 text-sm text-text-muted">La más prioritaria de hoy sin hora. Empieza por aquí.</p>
      )}

      <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-border sm:grid-cols-4">
        {cells.map((c, i) => (
          <div
            key={c.label}
            className={cn(
              'min-w-0 px-3 py-2',
              i > 0 && 'sm:border-l sm:border-border',
              i % 2 === 1 && 'border-l border-border',
              i > 1 && 'border-t border-border sm:border-t-0',
            )}
          >
            <dt className="text-xs text-text-muted">{c.label}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 truncate text-sm font-medium text-text">
              {c.dot && <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c.dot }} />}
              {c.bars && <PriorityBars p={c.bars} />}
              <span className="truncate" title={c.value}>
                {c.value}
              </span>
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button onClick={() => void startFocusOnTask(task.id!)}>
          <Play size={14} strokeWidth={2} /> Empezar foco
        </Button>
        <Button variant="secondary" onClick={() => void toggleTaskDoneWithFeedback(task.id!, task.title)}>
          <Check size={14} strokeWidth={2} /> Hecha
        </Button>
        <Button variant="ghost" loading={movingToTomorrow} onClick={() => void moveToTomorrow(task)}>
          <CalendarClock size={14} strokeWidth={1.75} /> Pasar a mañana
        </Button>
      </div>
    </motion.section>
  )
}

function NowEmpty({ allDone }: { allDone: boolean }) {
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface p-5">
      {allDone ? (
        <>
          <CheckCheck size={18} strokeWidth={1.75} className="text-success" aria-hidden="true" />
          <p className="flex-1 text-sm text-text">Todo lo de hoy está hecho. Buen trabajo.</p>
        </>
      ) : (
        <p className="flex-1 text-sm text-text">¿Qué es lo único que quieres hacer hoy?</p>
      )}
      <Button variant={allDone ? 'ghost' : 'primary'} onClick={() => openQuickAdd()}>
        <Plus size={14} strokeWidth={2} /> {allDone ? 'Añadir otra' : 'Añadir tarea'}
      </Button>
    </section>
  )
}
