import { useEffect, useState } from 'react'
import { Pause, Timer } from 'lucide-react'
import { ensurePanelVisible } from '../../app/dock/ensurePanelVisible'
import { elapsedSeconds, useFocusTimerStore } from './focusTimerStore'
import { formatTime } from './format'

const MODE_LABEL = { work: 'Foco', break: 'Descanso', longBreak: 'Descanso largo' } as const

/** Cronómetro compacto en la barra superior: el foco en marcha sigue a la vista fuera del panel. */
export function FocusIndicator() {
  const timer = useFocusTimerStore()
  const [, tick] = useState(0)
  const active = timer.running || timer.accumulatedSec > 0

  useEffect(() => {
    if (!timer.running) return
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [timer.running])

  if (!active) return null
  const remaining = Math.max(0, timer.plannedSec - elapsedSeconds(timer))
  const label = MODE_LABEL[timer.mode]

  return (
    <button
      type="button"
      onClick={() => ensurePanelVisible('focus')}
      aria-label={`${label}: quedan ${formatTime(remaining)}${timer.running ? '' : ', en pausa'}. Abrir panel de enfoque`}
      className="flex h-8 items-center gap-1.5 rounded-sm border border-accent/40 bg-accent-soft px-2.5 text-[13px] font-medium tabular-nums text-accent transition-colors hover:border-accent"
    >
      {timer.running ? <Timer size={14} strokeWidth={1.75} /> : <Pause size={14} strokeWidth={1.75} />}
      <span className="hidden sm:inline">{label}</span>
      {formatTime(remaining)}
    </button>
  )
}
