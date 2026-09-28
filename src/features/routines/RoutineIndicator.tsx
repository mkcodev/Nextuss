import { useEffect, useState } from 'react'
import { Pause, Repeat } from 'lucide-react'
import { formatTime } from '../focus/format'
import { stepRemainingSec } from './player'
import { useRoutinePlayerStore } from './routinePlayerStore'

/** Rutina minimizada en la barra superior (mismo formato que `FocusIndicator`): sigue a la vista y
 * un clic vuelve a la pantalla completa. */
export function RoutineIndicator() {
  const s = useRoutinePlayerStore()
  const [now, setNow] = useState(() => Date.now())
  const show = s.routineId != null && !s.visible && !s.finished

  useEffect(() => {
    if (!show) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [show])

  if (!show) return null
  const remaining = stepRemainingSec(s, now)
  const step = s.steps[s.index]

  return (
    <button
      type="button"
      onClick={() => s.setVisible(true)}
      aria-label={`Rutina ${s.name}, paso ${s.index + 1} de ${s.steps.length}: ${step?.title ?? ''}. Quedan ${formatTime(remaining)}${s.running ? '' : ', en pausa'}. Volver a la rutina`}
      className="flex h-8 max-w-56 items-center gap-1.5 rounded-sm border border-accent/40 bg-accent-soft px-2.5 text-ui font-medium tabular-nums text-accent transition-colors hover:border-accent"
    >
      {s.running ? <Repeat size={14} strokeWidth={1.75} className="shrink-0" /> : <Pause size={14} strokeWidth={1.75} className="shrink-0" />}
      <span className="hidden truncate sm:inline">{step?.title}</span>
      <span className="shrink-0">{formatTime(remaining)}</span>
    </button>
  )
}
