import { useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { m, useReducedMotion } from 'motion/react'
import { CalendarClock, Check, CheckCheck, Play, Plus } from 'lucide-react'
import { Button, Celebration } from '../../design/primitives'
import { getTasksForDate, moveTasksToDateBulk } from '../../db/repositories/tasks'
import { getProject } from '../../db/repositories/projects'
import { getGoalForTask } from '../../db/repositories/goals'
import { nextRelativeDate, timeToMinutes } from '../../lib/dates'
import { PRIORITY_NAMES } from '../../lib/priority'
import { PriorityBars } from '../tasks/PriorityBars'
import { cn } from '../../lib/cn'
import { useNowMinutes } from '../../lib/useNowMinutes'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import { DUR, EASE } from '../../design/motion'
import { startFocusOnTask } from '../focus/startFocusOnTask'
import { useCelebratedToggle } from '../tasks/useCelebratedToggle'
import { useTaskFormStore } from '../tasks/taskFormStore'
import { useQuickAddStore } from '../tasks/quickAddStore'
import type { EnergyLevel, Task } from '../../db/types'
import { pickNowTask } from './pickNowTask'

type NowPick = NonNullable<ReturnType<typeof pickNowTask>>

const ENERGY_NAMES: Record<EnergyLevel, string> = { low: 'Baja', medium: 'Media', high: 'Alta' }

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

/** Bloque "Ahora" de Hoy (DESIGN.md, componente firma): la tarea que toca, cuánto dura y cuánto
 *  llevas, medido como en un plano; debajo, sus propiedades en casillas y las tres acciones.
 *  El envoltorio sigue montado aunque cambie la tarea (o no quede ninguna), para que la
 *  microcelebración de «Hecha» termine sobre el bloque en vez de desaparecer con la tarjeta. */
export function NowBlock({ date }: { date: string }) {
  const nowMin = useNowMinutes()
  const tasks = useLiveQuery(() => getTasksForDate(date), [date])
  const { play, toggle } = useCelebratedToggle()

  if (!tasks) return null
  const pick = pickNowTask(tasks, nowMin)

  return (
    <div className="relative rounded-md">
      {pick ? (
        <NowCard key={pick.task.id} pick={pick} date={date} nowMin={nowMin} onDone={(t) => void toggle(t)} />
      ) : (
        <NowEmpty allDone={tasks.some((t) => t.status === 'done' && !t.parentId)} />
      )}
      <Celebration play={play} />
    </div>
  )
}

function NowCard({ pick, date, nowMin, onDone }: { pick: NowPick; date: string; nowMin: number; onDone: (t: Task) => void }) {
  const task = pick.task
  const project = useLiveQuery(
    () => (task.projectId ? getProject(task.projectId) : Promise.resolve(null)),
    [task.projectId],
  )
  const goal = useLiveQuery(() => (task.id ? getGoalForTask(task.id) : Promise.resolve(null)), [task.id])
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const [movingToTomorrow, moveToTomorrow] = useSubmitGuard((t: Task) => moveTasksToDateBulk([t.id!], nextRelativeDate(t.scheduledDate, date, 1)))

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
    <m.section
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? DUR.fast : DUR.slow, ease: EASE.standard }}
      aria-labelledby={titleId}
      className="rounded-md border border-border bg-surface p-5 shadow-card"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className={cn(
            'size-3.5 shrink-0 rounded-full border-[1.5px]',
            current ? 'border-accent bg-[conic-gradient(var(--color-accent)_0_50%,transparent_0)]' : 'border-text-faint',
          )}
        />
        <span className={cn('text-xs font-medium', current ? 'text-accent-text' : 'text-text-muted')}>{heading}</span>
        <span className="ml-auto font-mono text-xs tracking-[-0.01em] text-text-muted">{meta}</span>
      </div>

      <h2 id={titleId} className="mt-2 text-xl leading-tight font-semibold tracking-[-0.02em] text-balance text-text">
        <button
          type="button"
          onClick={() => openEdit(task)}
          className="rounded-sm text-left hover:underline hover:decoration-border-strong hover:underline-offset-4"
        >
          {task.title}
        </button>
      </h2>

      {/* Línea de medida: el tramo relleno es lo que ya ha pasado; debajo, inicio y fin. */}
      {slotted ? (
        <div className="mt-[18px] mb-3.5">
          <div
            role="meter"
            aria-label="Tiempo de la tarea"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={elapsed}
            aria-valuetext={`${formatDuration(elapsed)} de ${formatDuration(total)}, de ${task.scheduledStart} a ${task.scheduledEnd}`}
            className="relative h-0.5 rounded-full bg-border"
          >
            <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${progress}%` }} />
            <span className="absolute top-1/2 left-1/2 -translate-1/2 bg-surface px-2 font-mono text-2xs tracking-[-0.01em] text-text-muted">
              {formatDuration(total)}
            </span>
          </div>
          <div aria-hidden="true" className="mt-2 flex justify-between font-mono text-xs text-text-muted">
            <span>{task.scheduledStart}</span>
            <span>{task.scheduledEnd}</span>
          </div>
        </div>
      ) : (
        <p className="mt-1 mb-4 text-ui text-text-muted">La más prioritaria de hoy sin hora. Empieza por aquí.</p>
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
            <dt className="text-2xs text-text-faint">{c.label}</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 truncate text-ui font-medium text-text">
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
        <Button variant="secondary" onClick={() => onDone(task)}>
          <Check size={14} strokeWidth={2} /> Hecha
        </Button>
        <Button variant="ghost" loading={movingToTomorrow} onClick={() => void moveToTomorrow(task)}>
          <CalendarClock size={14} strokeWidth={1.75} /> Pasar a mañana
        </Button>
      </div>
    </m.section>
  )
}

function NowEmpty({ allDone }: { allDone: boolean }) {
  const openQuickAdd = useQuickAddStore((s) => s.openQuickAdd)
  return (
    <section className="flex flex-wrap items-center gap-3 rounded-md border border-dashed border-border-strong p-5">
      {allDone ? (
        <>
          <CheckCheck size={16} strokeWidth={1.75} className="text-success" aria-hidden="true" />
          <p className="flex-1 text-ui text-text">Todo lo de hoy está hecho. Buen trabajo.</p>
        </>
      ) : (
        <p className="flex-1 text-ui text-text">¿Qué es lo único que quieres hacer hoy?</p>
      )}
      <Button variant={allDone ? 'ghost' : 'primary'} onClick={() => openQuickAdd()}>
        <Plus size={14} strokeWidth={2} /> {allDone ? 'Añadir otra' : 'Añadir tarea'}
      </Button>
    </section>
  )
}
