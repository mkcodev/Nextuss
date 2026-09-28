import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Play } from 'lucide-react'
import { Button, Icon } from '../../design/primitives'
import { getRoutineRunsForDate, listRoutines } from '../../db/repositories/routines'
import { minutesToTime, timeToMinutes } from '../../lib/dates'
import { startRoutine } from './actions'
import { useRoutinePlayerStore } from './routinePlayerStore'
import { formatMinutes, routineDueNow, routineTotalMin } from './schedule'

function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** "Rutina de ahora" en Hoy: la rutina con hora cuya ventana está abierta y aún no se ha hecho. */
export function RoutineNowCard({ date }: { date: string }) {
  const now = useNow()
  const routines = useLiveQuery(() => listRoutines(), [])
  const runs = useLiveQuery(() => getRoutineRunsForDate(date), [date])
  const activeId = useRoutinePlayerStore((s) => (s.finished ? null : s.routineId))
  if (!routines || !runs) return null

  const routine = routineDueNow(routines, runs, now)
  if (!routine) return null
  const total = routineTotalMin(routine)
  const start = timeToMinutes(routine.startTime!)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const inProgress = activeId === routine.id
  const when = inProgress
    ? 'en marcha'
    : nowMin < start
      ? `empieza en ${formatMinutes(start - nowMin)}`
      : `desde las ${routine.startTime}`

  return (
    <section aria-label="Rutina de ahora" className="flex items-center gap-3 rounded-md border border-accent/40 bg-accent-soft px-4 py-3">
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-md border bg-surface"
        style={{ borderColor: `${routine.color}33`, color: routine.color }}
      >
        <Icon name={routine.icon} size={17} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-text">Rutina de ahora: {routine.name}</p>
        <p className="truncate text-xs tabular-nums text-text-muted" title={`${routine.steps.length} pasos · ${formatMinutes(total)}`}>
          {routine.startTime}–{minutesToTime(start + total)} · {when}
        </p>
      </div>
      <Button className="shrink-0" onClick={() => void startRoutine(routine)}>
        <Play size={14} strokeWidth={2} /> {inProgress ? 'Continuar' : 'Empezar'}
      </Button>
    </section>
  )
}
