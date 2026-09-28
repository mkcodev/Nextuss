import { useEffect, useId, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { format } from 'date-fns'
import { Check, CircleCheckBig, Minimize2, Pause, Play, Plus, SkipForward, Volume2, VolumeX, X } from 'lucide-react'
import { Button, Icon, IconButton, Kbd, ProgressBar, RingProgress, SegmentedControl } from '../../design/primitives'
import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import type { RoutineView } from '../../db/types'
import { cn } from '../../lib/cn'
import { formatTime } from '../focus/format'
import { advanceStep, exitRoutine } from './actions'
import {
  buildTimeline,
  driftMinutes,
  overallProgress,
  projectedEndAt,
  routineRemainingSec,
  stepElapsedSec,
  stepPlannedSec,
  stepRemainingSec,
  type TimelineStep,
} from './player'
import { useRoutinePlayerStore } from './routinePlayerStore'
import { formatMinutes } from './schedule'

const VIEW_OPTIONS: { value: RoutineView; label: string }[] = [
  { value: 'step', label: 'Paso' },
  { value: 'timeline', label: 'Línea' },
]

const clock = (ms: number) => format(ms, 'HH:mm')

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'),
  )
}

/** Reloj del reproductor. Sigue en pausa: la cuenta atrás se para, pero la hora de fin se va alejando. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Reproductor de rutinas a pantalla completa (Fase 28), montado una vez en AppShell. Dos vistas del
 * mismo estado: "Paso" (un paso enorme con su cuenta atrás) y "Línea" (todos los pasos con su hora).
 * Las dos llevan arriba la barra de progreso total y la hora a la que terminarás. */
export function RoutinePlayer() {
  const visible = useRoutinePlayerStore((s) => s.visible && s.routineId != null)
  return <AnimatePresence>{visible && <PlayerPanel />}</AnimatePresence>
}

function PlayerPanel() {
  const s = useRoutinePlayerStore()
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const view: RoutineView = settings?.routineView ?? 'step'
  const soundOn = settings?.routineSoundEnabled !== false
  const now = useNow()
  const reduceMotion = useReducedMotion()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const [confirmingExit, setConfirmingExit] = useState(false)

  const step = s.steps[s.index]
  const endAt = projectedEndAt(s, now)
  const drift = driftMinutes(s, now)
  const progress = s.finished ? 1 : overallProgress(s, now)
  const remainingAll = Math.ceil(routineRemainingSec(s, now) / 60)

  const togglePause = () => (s.running ? s.pause() : s.resume())
  const setView = (v: RoutineView) => void updateSettings({ routineView: v })
  const toggleSound = () => void updateSettings({ routineSoundEnabled: !soundOn })
  const minimize = () => s.setVisible(false)
  const requestExit = () => {
    if (s.finished) void exitRoutine()
    else setConfirmingExit(true)
  }

  // Refs a lo último: el listener de teclado se registra una vez y lee siempre el estado actual.
  const handlers = useRef({ togglePause, requestExit, minimize, setView, view, confirmingExit, finished: s.finished })
  useEffect(() => {
    handlers.current = { togglePause, requestExit, minimize, setView, view, confirmingExit, finished: s.finished }
  })

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Foco en el panel, no en un botón: así Espacio pausa y Enter marca «Hecho» sin que el navegador
    // pulse además el botón enfocado. Tabulando a un botón, Enter y Espacio pulsan ese botón.
    panelRef.current?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlers.current
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (h.confirmingExit) setConfirmingExit(false)
        else h.requestExit()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const items = getFocusable(panelRef.current)
        if (items.length === 0) return
        const first = items[0]
        const last = items[items.length - 1]
        if (!panelRef.current.contains(document.activeElement)) {
          e.preventDefault()
          first.focus()
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
        return
      }
      if (h.finished || h.confirmingExit) return
      // Espacio/Enter sobre un botón enfocado ya lo pulsan: no duplicar la acción.
      const onButton = e.target instanceof HTMLElement && e.target.closest('button')
      if (e.key === ' ' && !onButton) {
        e.preventDefault()
        h.togglePause()
      } else if (e.key === 'Enter' && !onButton) {
        e.preventDefault()
        void advanceStep(true)
      } else if (e.key === 's') {
        e.preventDefault()
        void advanceStep(false)
      } else if (e.key === '+') {
        e.preventDefault()
        useRoutinePlayerStore.getState().addMinute()
      } else if (e.key === 'v') {
        e.preventDefault()
        h.setView(h.view === 'step' ? 'timeline' : 'step')
      } else if (e.key === 'm') {
        e.preventDefault()
        h.minimize()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = prevOverflow
      previouslyFocused?.focus()
    }
  }, [])

  // Confirmación o pantalla final: foco en su acción principal. De vuelta al reproductor: al panel.
  useEffect(() => {
    if (confirmingExit || s.finished) primaryRef.current?.focus()
    else panelRef.current?.focus()
  }, [s.finished, confirmingExit])

  const endLabel =
    drift > 0 ? `${drift} min tarde` : drift < 0 ? `${-drift} min antes` : 'a tiempo'

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      tabIndex={-1}
      className="fixed inset-0 z-dialog flex flex-col overflow-y-auto bg-bg outline-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.18 }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pt-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-8 sm:pt-6">
        {/* Cabecera: qué rutina, en qué paso, vista, sonido, minimizar, salir. */}
        <header className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-md border"
            style={{ backgroundColor: `${s.color}14`, borderColor: `${s.color}33`, color: s.color }}
          >
            <Icon name={s.icon} size={16} strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="truncate text-sm font-semibold text-text">
              {s.name}
            </h2>
            <p className="text-xs tabular-nums text-text-muted">
              {s.finished ? 'Terminada' : `Paso ${s.index + 1} de ${s.steps.length}`}
              {!s.running && !s.finished && ' · en pausa'}
            </p>
          </div>
          {!s.finished && (
            <div className="hidden sm:block">
              <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} label="Vista del reproductor" />
            </div>
          )}
          <IconButton label={soundOn ? 'Silenciar cambio de paso' : 'Activar sonido al cambiar de paso'} onClick={toggleSound}>
            {soundOn ? <Volume2 size={16} strokeWidth={1.75} /> : <VolumeX size={16} strokeWidth={1.75} />}
          </IconButton>
          {!s.finished && (
            <IconButton label="Minimizar (M)" onClick={minimize}>
              <Minimize2 size={16} strokeWidth={1.75} />
            </IconButton>
          )}
          <IconButton label="Salir (Esc)" onClick={requestExit}>
            <X size={17} strokeWidth={1.75} />
          </IconButton>
        </header>

        {/* Conciencia del tiempo: progreso total + a qué hora acabas si sigues así. */}
        <div className="mt-5">
          <ProgressBar value={progress} className="h-1.5" />
          <div className="mt-2 flex items-baseline justify-between gap-3 text-xs tabular-nums text-text-muted">
            <span>{s.finished ? 'Completada' : `Quedan ${formatMinutes(Math.max(remainingAll, 0))}`}</span>
            {!s.finished && (
              <span>
                Terminas a las <span className="font-semibold text-text">{clock(endAt)}</span>{' '}
                <span className={cn(drift > 0 && 'text-warning', drift < 0 && 'text-success')}>({endLabel})</span>
              </span>
            )}
          </div>
        </div>

        {!s.finished && (
          <div className="mt-4 self-center sm:hidden">
            <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} label="Vista del reproductor" />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-center py-6">
          {s.finished ? (
            <FinishedView />
          ) : view === 'step' ? (
            <StepView now={now} />
          ) : (
            <TimelineView now={now} />
          )}
        </div>

        {/* Controles */}
        {confirmingExit ? (
          <div role="alert" className="flex flex-wrap items-center justify-center gap-3 rounded-md border border-border bg-surface px-4 py-3">
            <p className="text-sm text-text">¿Salir de la rutina? Se guarda lo que llevas hecho.</p>
            <Button ref={primaryRef} variant="secondary" onClick={() => setConfirmingExit(false)}>
              Seguir
            </Button>
            <Button variant="danger" onClick={() => void exitRoutine()}>
              Salir
            </Button>
          </div>
        ) : s.finished ? (
          <div className="flex justify-center">
            <Button ref={primaryRef} onClick={() => void exitRoutine()} className="h-10 px-6">
              Cerrar
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button variant="secondary" onClick={togglePause} className="h-10 min-w-28">
                {s.running ? <Pause size={15} strokeWidth={2} /> : <Play size={15} strokeWidth={2} />}
                {s.running ? 'Pausa' : 'Seguir'}
              </Button>
              <Button variant="secondary" onClick={() => s.addMinute()} className="h-10">
                <Plus size={15} strokeWidth={2} /> 1 min
              </Button>
              <Button variant="ghost" onClick={() => void advanceStep(false)} className="h-10">
                <SkipForward size={15} strokeWidth={2} /> Saltar
              </Button>
              <Button onClick={() => void advanceStep(true)} className="h-11 w-full px-5 sm:h-10 sm:w-auto sm:min-w-32">
                <Check size={16} strokeWidth={2.25} /> Hecho
              </Button>
            </div>
            <p className="hidden items-center gap-3 text-xs text-text-faint sm:flex" aria-hidden="true">
              <span><Kbd>Espacio</Kbd> pausa</span>
              <span><Kbd>Enter</Kbd> hecho</span>
              <span><Kbd>S</Kbd> saltar</span>
              <span><Kbd>+</Kbd> 1 min</span>
              <span><Kbd>V</Kbd> vista</span>
            </p>
          </div>
        )}
      </div>

      <span className="sr-only" aria-live="polite">
        {step && !s.finished ? `Paso ${s.index + 1}: ${step.title}` : s.finished ? 'Rutina terminada' : ''}
      </span>
    </motion.div>
  )
}

function StepView({ now }: { now: number }) {
  const s = useRoutinePlayerStore()
  const reduceMotion = useReducedMotion()
  const step = s.steps[s.index]
  const next = s.steps[s.index + 1]
  const planned = stepPlannedSec(s)
  const elapsed = stepElapsedSec(s, now)
  const remaining = stepRemainingSec(s, now)
  if (!step) return null

  return (
    <div className="flex flex-col items-center text-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={s.index}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.22, ease: [0.25, 1, 0.5, 1] }}
          className="flex flex-col items-center"
        >
          <p className="text-xs font-medium tracking-wide text-text-muted uppercase">Ahora</p>
          <p className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-balance text-text sm:text-4xl">{step.title}</p>
          <RingProgress value={planned > 0 ? elapsed / planned : 0} size={232} strokeWidth={8} className="mt-8">
            <div className="flex flex-col items-center">
              <span className={cn('text-5xl font-semibold tabular-nums text-text', !s.running && 'text-text-muted')}>
                {formatTime(remaining)}
              </span>
              <span className="mt-1 text-xs tabular-nums text-text-muted">
                de {formatMinutes(Math.round(step.durationSec / 60))}
                {s.extraSec > 0 && ` + ${s.extraSec / 60} min`}
              </span>
            </div>
          </RingProgress>
        </motion.div>
      </AnimatePresence>

      {/* Pasos como segmentos: cuántos quedan de un vistazo. */}
      <div className="mt-8 flex gap-1" aria-hidden="true">
        {s.steps.map((_, i) => (
          <span
            key={i}
            className={cn('h-1 w-6 rounded-full', i < s.index ? 'bg-accent' : i === s.index ? 'bg-accent/50' : 'bg-border')}
          />
        ))}
      </div>
      <p className="mt-3 text-sm text-text-muted">
        {next ? (
          <>
            Después: <span className="text-text">{next.title}</span> · {formatMinutes(Math.round(next.durationSec / 60))}
          </>
        ) : (
          'Último paso'
        )}
      </p>
    </div>
  )
}

function TimelineView({ now }: { now: number }) {
  const s = useRoutinePlayerStore()
  const timeline = buildTimeline(s, now)
  return (
    <ol className="mx-auto w-full max-w-xl space-y-1.5" aria-label="Pasos de la rutina">
      {timeline.map((st, i) => (
        <TimelineRow key={i} step={st} index={i} now={now} />
      ))}
    </ol>
  )
}

function TimelineRow({ step, index, now }: { step: TimelineStep; index: number; now: number }) {
  const s = useRoutinePlayerStore()
  const current = step.status === 'current'
  const done = step.status === 'done'
  const planned = current ? stepPlannedSec(s) : step.durationSec
  const elapsed = current ? stepElapsedSec(s, now) : 0

  return (
    <li
      aria-current={current ? 'step' : undefined}
      className={cn(
        'grid grid-cols-[3.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-md border px-3 py-2.5 transition-colors',
        current ? 'border-accent bg-accent-soft' : 'border-border bg-surface',
        done && 'opacity-55',
      )}
    >
      <span className={cn('text-xs tabular-nums', current ? 'font-semibold text-accent' : 'text-text-muted')}>
        {step.status === 'upcoming' ? '~' : ''}
        {clock(step.startAt)}
      </span>
      <div className="min-w-0">
        <p className={cn('flex items-center gap-1.5 truncate text-sm', current ? 'font-semibold text-text' : 'text-text', done && 'line-through decoration-text-faint')}>
          {done && <Check size={13} strokeWidth={2.25} className="shrink-0 text-success" aria-label="Hecho" />}
          <span className="truncate">{step.title}</span>
        </p>
        {current && <ProgressBar value={planned > 0 ? elapsed / planned : 0} className="mt-1.5 h-1" />}
      </div>
      <span className={cn('text-xs tabular-nums', current ? 'font-semibold text-text' : 'text-text-muted')}>
        {current ? formatTime(stepRemainingSec(s, now)) : formatMinutes(Math.round(step.durationSec / 60))}
      </span>
      <span className="sr-only">{`Paso ${index + 1}`}</span>
    </li>
  )
}

function FinishedView() {
  const s = useRoutinePlayerStore()
  const reduceMotion = useReducedMotion()
  const endedAt = s.stepStartedAt[s.stepStartedAt.length - 1] + s.accumulatedSec * 1000
  const tookMin = Math.max(1, Math.round((endedAt - s.runStartedAt) / 60_000))
  const skipped = s.steps.length - s.completedSteps
  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0.1 : 0.28, ease: [0.25, 1, 0.5, 1] }}
      className="flex flex-col items-center text-center"
    >
      <CircleCheckBig size={56} strokeWidth={1.5} className="text-success" aria-hidden="true" />
      <p className="mt-4 text-2xl font-semibold tracking-tight text-text">{s.name}: hecha</p>
      <p className="mt-2 text-sm tabular-nums text-text-muted">
        {s.completedSteps} de {s.steps.length} pasos · {formatMinutes(tookMin)}
        {skipped > 0 && ` · ${skipped} ${skipped === 1 ? 'saltado' : 'saltados'}`}
      </p>
    </motion.div>
  )
}
