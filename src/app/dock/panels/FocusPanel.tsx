import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Pause, Play, RotateCcw, TriangleAlert } from 'lucide-react'
import { Button, IconButton, RingProgress, Select, Tabs } from '../../../design/primitives'
import { listActiveTasks } from '../../../db/repositories/tasks'
import { getOrCreateSettings } from '../../../db/repositories/settings'
import { cn } from '../../../lib/cn'
import type { FocusMode } from '../../../features/focus/cycle'
import { durationsFromSettings } from '../../../features/focus/durations'
import { elapsedSeconds, useFocusTimerStore } from '../../../features/focus/focusTimerStore'
import { formatTime } from '../../../features/focus/format'
import { logWorkSegmentIfSignificant } from '../../../features/focus/logSegment'

const MODE_TABS = [
  { key: 'work' as FocusMode, label: 'Foco' },
  { key: 'break' as FocusMode, label: 'Descanso' },
  { key: 'longBreak' as FocusMode, label: 'D. largo' },
]

/** Isolates the once-per-second re-render to just the ring + countdown text, so the rest of the
 * panel (tabs, task select, buttons) doesn't re-render 60 times a minute along with it. */
function Countdown({ plannedSec }: { plannedSec: number }) {
  const [, forceTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsed = elapsedSeconds(useFocusTimerStore.getState())
  const secondsLeft = Math.max(0, Math.round(plannedSec - elapsed))
  const pct = plannedSec > 0 ? Math.min(1, elapsed / plannedSec) : 0

  return (
    <RingProgress value={pct} size={112} strokeWidth={6}>
      <span className="text-xl font-semibold tabular-nums text-text">{formatTime(secondsLeft)}</span>
    </RingProgress>
  )
}

export function FocusPanel() {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const durations = durationsFromSettings(settings)
  const tasks = useLiveQuery(() => listActiveTasks(), []) ?? []

  const mode = useFocusTimerStore((s) => s.mode)
  const cyclesCompleted = useFocusTimerStore((s) => s.cyclesCompleted)
  const taskId = useFocusTimerStore((s) => s.taskId)
  const interruptions = useFocusTimerStore((s) => s.interruptions)
  const running = useFocusTimerStore((s) => s.running)
  const plannedSec = useFocusTimerStore((s) => s.plannedSec)

  const togglePlay = () => {
    const store = useFocusTimerStore.getState()
    if (store.running) store.pause()
    else store.start()
  }

  const switchMode = async (next: FocusMode) => {
    const s = useFocusTimerStore.getState()
    if (next === s.mode) return
    if (s.mode === 'work') await logWorkSegmentIfSignificant(elapsedSeconds(s), s.taskId, s.interruptions)
    useFocusTimerStore.getState().goToMode(next, durations[next], s.cyclesCompleted)
  }

  const reset = async () => {
    const s = useFocusTimerStore.getState()
    if (s.mode === 'work') await logWorkSegmentIfSignificant(elapsedSeconds(s), s.taskId, s.interruptions)
    useFocusTimerStore.getState().restartSegment(durations[s.mode])
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <Tabs tabs={MODE_TABS} value={mode} onChange={switchMode} />

      <div className="flex items-center gap-1.5" title={`${mode === 'longBreak' ? 4 : cyclesCompleted % 4}/4 pomodoros de este ciclo`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn('h-1.5 w-1.5 rounded-full', i < (mode === 'longBreak' ? 4 : cyclesCompleted % 4) ? 'bg-accent' : 'bg-border')}
          />
        ))}
      </div>

      {mode === 'work' && (
        <Select
          aria-label="Tarea vinculada al foco"
          value={taskId ?? ''}
          onChange={(e) => useFocusTimerStore.getState().setTaskId(e.target.value ? Number(e.target.value) : undefined)}
          className="max-w-[220px]"
        >
          <option value="">Sin tarea vinculada</option>
          {tasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.title}
            </option>
          ))}
        </Select>
      )}

      <Countdown plannedSec={plannedSec} />

      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={togglePlay} className="h-9 w-9 rounded-full p-0">
          {running ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
        </Button>
        <Button variant="ghost" onClick={reset} className="h-9 w-9 rounded-full p-0">
          <RotateCcw size={14} strokeWidth={2} />
        </Button>
        {mode === 'work' && (
          <IconButton
            label="Registrar interrupción"
            onClick={() => useFocusTimerStore.getState().recordInterruption()}
            className={cn(interruptions > 0 && 'text-warning')}
          >
            <TriangleAlert size={15} strokeWidth={1.75} />
            {interruptions > 0 && <span className="ml-0.5 text-[10px] font-semibold">{interruptions}</span>}
          </IconButton>
        )}
      </div>

      <p className="text-center text-[11px] text-text-faint">
        {mode !== 'work'
          ? 'El tiempo sigue corriendo aunque cambies de pestaña o recargues.'
          : taskId
            ? 'El tiempo de foco se suma al tiempo real de la tarea.'
            : 'Vincula una tarea para registrar el tiempo dedicado.'}
      </p>
    </div>
  )
}
