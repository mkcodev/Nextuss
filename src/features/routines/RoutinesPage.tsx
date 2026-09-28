import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Check, Pencil, Play, Plus, Repeat } from 'lucide-react'
import { Button, DropIndicator, EmptyState, Icon, IconButton, Skeleton } from '../../design/primitives'
import { getRoutineRunsForDate, listRoutines, moveRoutineBetween } from '../../db/repositories/routines'
import type { Routine, RoutineRun } from '../../db/types'
import { cn } from '../../lib/cn'
import { todayKey, WEEKDAY_LABELS_ES, WEEKDAY_ORDER_MON_FIRST } from '../../lib/dates'
import { reorderNeighbors, type DropPosition } from '../../lib/reorder'
import { useDragReorder } from '../../lib/useDragReorder'
import { useListNav } from '../../app/shortcuts/listNavStore'
import { startRoutine } from './actions'
import { useRoutineFormStore } from './routineFormStore'
import { useRoutinePlayerStore } from './routinePlayerStore'
import { formatMinutes, isRoutineDone, routineTotalMin } from './schedule'

const ROUTINE_DRAG_MIME = 'application/x-nextuss-routine'

function scheduleLabel(routine: Routine): string {
  const days =
    routine.weekdays.length === 0 || routine.weekdays.length === 7
      ? 'todos los días'
      : routine.weekdays.length === 5 && [1, 2, 3, 4, 5].every((d) => routine.weekdays.includes(d))
        ? 'L-V'
        : WEEKDAY_ORDER_MON_FIRST.filter((d) => routine.weekdays.includes(d))
            .map((d) => WEEKDAY_LABELS_ES[d])
            .join(' ')
  return routine.startTime ? `${days} · ${routine.startTime}` : routine.weekdays.length ? days : 'sin hora'
}

export function RoutinesPage() {
  const routines = useLiveQuery(() => listRoutines(), [])
  const today = todayKey()
  const runsToday = useLiveQuery(() => getRoutineRunsForDate(today), [today]) ?? []
  const openCreate = useRoutineFormStore((s) => s.openCreate)
  const list = routines ?? []

  const handleMove = (draggedId: number, targetId: number, position: DropPosition) => {
    const n = reorderNeighbors(list, (r) => r.id, draggedId, targetId, position)
    if (n) void moveRoutineBetween(draggedId, n.before, n.after)
  }
  const dnd = useDragReorder({
    mime: ROUTINE_DRAG_MIME,
    onMove: handleMove,
    ids: list.map((r) => r.id!),
    labelOf: (id) => list.find((r) => r.id === id)?.name ?? 'Rutina',
  })

  // j/k/Enter/c como en Proyectos: Enter empieza la rutina marcada.
  const [cursor, setCursor] = useState(0)
  const cursorIndex = Math.min(cursor, Math.max(list.length - 1, 0))
  useListNav({
    onNext: () => setCursor(Math.min(cursorIndex + 1, Math.max(list.length - 1, 0))),
    onPrev: () => setCursor(Math.max(cursorIndex - 1, 0)),
    onActivate: () => {
      const r = list[cursorIndex]
      if (r) void startRoutine(r)
    },
    onCreate: () => openCreate(),
  })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 lg:p-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Rutinas</h1>
          <p className="mt-0.5 text-sm text-text-muted">Secuencias de pasos con tiempo, para seguirlas sin pensar.</p>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus size={14} strokeWidth={2} /> Nueva rutina
        </Button>
      </header>

      {routines === undefined && (
        <div className="space-y-2" aria-hidden="true">
          <Skeleton className="h-[66px] w-full" />
          <Skeleton className="h-[66px] w-full" />
        </div>
      )}

      {routines !== undefined && list.length === 0 && (
        <EmptyState
          icon={Repeat}
          title="Todavía no tienes rutinas"
          description="Por ejemplo, «Mañana»: vestirse 5 min, desayunar 15 min, preparar la mochila 5 min. Luego la sigues paso a paso con un temporizador."
          action={
            <Button onClick={() => openCreate()} className="text-xs">
              <Plus size={13} strokeWidth={2} /> Crear rutina
            </Button>
          }
        />
      )}

      <ul className="space-y-2">
        {list.map((routine, i) => (
          <li
            key={routine.id}
            {...dnd.rowProps(routine.id!)}
            className={cn(
              'relative cursor-grab rounded-md transition-opacity active:cursor-grabbing',
              dnd.dragging(routine.id!) && 'opacity-40',
              i === cursorIndex && list.length > 1 && 'ring-1 ring-border-strong',
            )}
          >
            <RoutineRow routine={routine} runsToday={runsToday} />
            <DropIndicator position={dnd.dropPosition(routine.id!)} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function RoutineRow({ routine, runsToday }: { routine: Routine; runsToday: RoutineRun[] }) {
  const openEdit = useRoutineFormStore((s) => s.openEdit)
  const activeId = useRoutinePlayerStore((s) => (s.finished ? null : s.routineId))
  const done = isRoutineDone(routine.id!, runsToday)
  const inProgress = activeId === routine.id
  const steps = routine.steps.length

  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-md border"
        style={{ backgroundColor: `${routine.color}14`, borderColor: `${routine.color}33`, color: routine.color }}
      >
        <Icon name={routine.icon} size={17} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{routine.name}</p>
        <p className="truncate text-xs tabular-nums text-text-muted">
          {steps} {steps === 1 ? 'paso' : 'pasos'} · {formatMinutes(routineTotalMin(routine))} · {scheduleLabel(routine)}
        </p>
      </div>
      {done && !inProgress && (
        <span className="hidden items-center gap-1 text-xs font-medium text-success sm:inline-flex">
          <Check size={13} strokeWidth={2.25} aria-hidden="true" /> Hecha hoy
        </span>
      )}
      <IconButton label={`Editar ${routine.name}`} onClick={() => openEdit(routine)}>
        <Pencil size={14} strokeWidth={1.75} />
      </IconButton>
      <Button size="sm" variant={done && !inProgress ? 'secondary' : 'primary'} onClick={() => void startRoutine(routine)}>
        <Play size={13} strokeWidth={2} /> {inProgress ? 'Continuar' : done ? 'Repetir' : 'Empezar'}
      </Button>
    </div>
  )
}
