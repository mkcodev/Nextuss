// Orquestador de la Virtualización (#97): Canvas R3F + overlay DOM. Cabina y Transmisión llevan ya
// contenido real; Escaneo/Presencia/Virtualización tienen el motor de fase (respiración/escaneo,
// ambos con sus fixes) y las 3 temas ya funcionando, con el contenido de datos real llegando en los
// PRs siguientes (#97 PR2-4). Se monta perezoso (`lazy`) solo mientras la Cabina pide turno, para no
// cargar three.js/R3F si el usuario nunca abre la Virtualización.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useLiveQuery } from 'dexie-react-hooks'
import { Flame, Trophy, Gem, Star, Clock3, ListTodo, HeartPulse, type LucideIcon } from 'lucide-react'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { getOverdueTasks, getTasksForDate } from '../../db/repositories/tasks'
import { getCheckInForDate } from '../../db/repositories/checkins'
import { completeVirtualization, getVirtualizationDays, upsertVirtualizationDay, type CompleteVirtualizationResult } from '../../db/repositories/virtualization'
import { emit } from '../../lib/events/bus'
import { todayKey, formatShortDate, subDaysKey } from '../../lib/dates'
import { Button } from '../../design/primitives'
import { useStage } from '../../app/stage/stageStore'
import { usePlayerProgress } from '../gamification/usePlayerProgress'
import { useHabitsWithStats } from '../habits/useHabitsWithStats'
import { dayBlocks } from '../today/dayTime'
import { BREATH_PATTERNS, breathPatternDuration, getBreathState } from './engine/breathCycle'
import { PHASE_LABELS, type PhaseId } from './engine/phases'
import { getSyncPercent } from './engine/syncMeter'
import { useVirtualizationStore } from './engine/useVirtualizationStore'
import { calculateVirtualizationStreak } from '../../lib/virtualizationStreak'
import { THEMES } from './themes'
import { virtualizationTone } from './audio/virtualizationTone'

const DEFAULT_MEDITATION_DURATION_SEC = 120

function useReducedMotion(): boolean {
  return useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, [])
}

function useTerminalLines(active: boolean, name: string, taskCount: number | undefined): string[] {
  const [shown, setShown] = useState<string[]>([])
  useEffect(() => {
    // Espera a tener el conteo real de tareas antes de empezar a "escribir": así no reinicia el
    // terminal a medio teclear en cuanto `tasks` termina de cargar (taskCount undefined -> número).
    if (!active || taskCount == null) {
      setShown([])
      return
    }
    const lines = [
      `> TRANSMISIÓN · ${name}`,
      `> Fecha: ${formatShortDate(todayKey())}`,
      `> Tareas para hoy: ${taskCount}`,
      '> Enlazando…',
      '> OK',
    ]
    let cancelled = false
    let i = 0
    const step = () => {
      if (cancelled || i >= lines.length) return
      setShown((prev) => [...prev, lines[i]])
      i++
      setTimeout(step, 260)
    }
    const t = setTimeout(step, 120)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [active, name, taskCount])
  return shown
}

export function Virtualization() {
  const active = useVirtualizationStore((s) => s.active)
  const phase = useVirtualizationStore((s) => s.phase)
  const phaseStartedAt = useVirtualizationStore((s) => s.phaseStartedAt)
  const syncPercent = useVirtualizationStore((s) => s.syncPercent)
  const setPhase = useVirtualizationStore((s) => s.setPhase)
  const setSyncPercent = useVirtualizationStore((s) => s.setSyncPercent)
  const close = useVirtualizationStore((s) => s.close)
  const visible = useStage('virtualization', active)
  const reducedMotion = useReducedMotion()

  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const tasks = useLiveQuery(() => getTasksForDate(todayKey()), [])
  const theme = settings?.virtualizationTheme ?? 'a'
  const breathPattern = BREATH_PATTERNS[settings?.meditationPattern ?? 'box4444']

  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => setNowMs(Date.now()), 200)
    return () => clearInterval(id)
  }, [visible])
  const phaseElapsedSec = Math.max(0, (nowMs - phaseStartedAt) / 1000)

  const terminalLines = useTerminalLines(visible && phase === 'transmision', settings?.displayName?.trim() || 'Usuario', tasks?.length)
  const terminalDoneRef = useRef(false)

  // Cierra el zumbido de la Cabina y silencia todo si la pantalla se cierra por completo.
  useEffect(() => {
    if (!active) virtualizationTone.close()
  }, [active])

  useEffect(() => {
    virtualizationTone.setMuted(settings?.virtualizationSoundEnabled === false)
  }, [settings?.virtualizationSoundEnabled])

  useEffect(() => {
    if (!visible) return
    virtualizationTone.hum(phase === 'cabina')
    if (phase === 'transmision') virtualizationTone.sweep()
    if (phase === 'escaneo') virtualizationTone.beep(660)
    if (phase === 'virtualizacion') {
      virtualizationTone.whoosh()
      const t = setTimeout(() => virtualizationTone.chord(), 300)
      return () => clearTimeout(t)
    }
  }, [visible, phase])

  // Transmisión: al terminar de "escribirse" el terminal, pasa sola a Escaneo tras una pausa breve.
  useEffect(() => {
    if (phase !== 'transmision') {
      terminalDoneRef.current = false
      return
    }
    if (terminalLines.length < 5 || terminalDoneRef.current) return
    terminalDoneRef.current = true
    const t = setTimeout(() => setPhase('escaneo'), 700)
    return () => clearTimeout(t)
  }, [phase, terminalLines.length, setPhase])

  // Presencia: la Sincronización sube en escalones, uno por cada ciclo de respiración completo (no
  // de forma continua). Solo se escribe en `virtualizationDays` cuando el escalón realmente cambia,
  // así queda registrado el progreso de la sesión (para reanudar y para estadísticas futuras) sin
  // machacar Dexie varias veces por segundo.
  const meditationDurationSec = settings?.meditationDurationSec ?? DEFAULT_MEDITATION_DURATION_SEC
  useEffect(() => {
    if (phase !== 'presencia') return
    const cycleDurationSec = breathPatternDuration(breathPattern)
    const pct = getSyncPercent(phaseElapsedSec, cycleDurationSec, meditationDurationSec)
    if (pct === syncPercent) return
    setSyncPercent(pct)
    void upsertVirtualizationDay(todayKey(), { meditationSec: Math.round(phaseElapsedSec), syncPercent: pct, phaseReached: 'presencia' })
  }, [phase, phaseElapsedSec, breathPattern, meditationDurationSec, syncPercent, setSyncPercent])

  // Virtualización: cierra el día del ritual (XP con bonus de racha, logros) en cuanto se entra en la
  // fase final, mientras corre la animación de ensamblado — el evento se emite ya para que la receta
  // «Mañana consciente» pueda arrancar la rutina sin esperar a que el usuario pulse "Continuar".
  const [completion, setCompletion] = useState<CompleteVirtualizationResult | null>(null)
  const completionStartedRef = useRef(false)
  useEffect(() => {
    if (phase !== 'virtualizacion') {
      completionStartedRef.current = false
      setCompletion(null)
      return
    }
    if (completionStartedRef.current) return
    completionStartedRef.current = true
    void (async () => {
      const result = await completeVirtualization(todayKey(), false)
      setCompletion(result)
      emit('virtualization.completed', { date: todayKey(), skipped: false })
    })()
  }, [phase])

  async function skipToday(): Promise<void> {
    await completeVirtualization(todayKey(), true)
    emit('virtualization.completed', { date: todayKey(), skipped: true })
    close()
  }

  // Al terminar de verdad (no al saltar), la interfaz real se "ensambla" con un fundido en vez de
  // desaparecer de golpe — el equivalente simplificado a las capas del prototipo (`assemblyEl`).
  const [closing, setClosing] = useState(false)
  function finishAndClose(): void {
    setClosing(true)
    setTimeout(() => close(), 650)
  }

  useEffect(() => {
    if (!visible) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        setPhase('cabina')
      } else if (e.key === 'Enter') {
        if (phase === 'cabina') setPhase('transmision')
        else if (phase === 'presencia' && syncPercent >= 100) setPhase('virtualizacion')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, phase, syncPercent, setPhase])

  if (!visible || !settings) return null
  const { Scene, palette, bloom } = THEMES[theme]

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col transition-opacity duration-[650ms] ease-in"
      style={{ background: palette.bg, opacity: closing ? 0 : 1 }}
    >
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 50 }} dpr={[1, 1.5]}>
          <color attach="background" args={[palette.bg]} />
          <fog attach="fog" args={[palette.bg, 4, 14]} />
          <Scene phase={phase} breathPattern={breathPattern} reducedMotion={reducedMotion} />
          {!reducedMotion && (
            <EffectComposer>
              <Bloom intensity={bloom.intensity} luminanceThreshold={bloom.luminanceThreshold} radius={bloom.radius} mipmapBlur />
            </EffectComposer>
          )}
        </Canvas>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center" style={{ color: palette.fg }}>
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: palette.dim }}>
          {PHASE_LABELS[phase]}
        </p>

        {phase === 'cabina' && <CabinaOverlay onStart={() => setPhase('transmision')} onSkip={() => void skipToday()} accent={palette.accent} />}
        {phase === 'transmision' && <TerminalOverlay lines={terminalLines} accent={palette.accent} />}
        {phase === 'escaneo' && <EscaneoOverlay onContinue={() => setPhase('presencia')} accent={palette.accent} />}
        {phase === 'presencia' && (
          <PresenciaOverlay
            breathLabel={getBreathState(breathPattern, phaseElapsedSec).label}
            syncPercent={syncPercent}
            targetMinutes={meditationDurationSec / 60}
            accent={palette.accent}
            onEnter={() => setPhase('virtualizacion')}
          />
        )}
        {phase === 'virtualizacion' && <VirtualizacionOverlay accent={palette.accent} completion={completion} onContinue={finishAndClose} />}
      </div>
    </div>
  )
}

function CabinaOverlay({
  onStart,
  onSkip,
  accent,
}: {
  onStart: () => void
  onSkip: () => void
  accent: string
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Virtualización</h1>
      <p className="text-sm opacity-70">{formatShortDate(todayKey())}</p>
      <div className="mt-2 flex items-center gap-3">
        <Button size="md" onClick={onStart} style={{ background: accent, color: '#04121a' }}>
          Iniciar virtualización
        </Button>
        <Button size="md" variant="ghost" onClick={onSkip}>
          Hoy no
        </Button>
      </div>
      <p className="text-xs opacity-50">Enter para empezar · Esc para salir en cualquier momento</p>
    </div>
  )
}

function TerminalOverlay({ lines, accent }: { lines: string[]; accent: string }) {
  return (
    <div
      className="min-h-32 w-full max-w-md rounded-md border px-4 py-3 text-left font-mono text-xs whitespace-pre-wrap"
      style={{ borderColor: accent + '55', color: accent }}
    >
      {lines.join('\n')}
      <span className="animate-pulse">▌</span>
    </div>
  )
}

/** Icono de la racha, escalado por tramo — mismo criterio que los logros de racha (zap→flame→…→gem). */
function streakIcon(streak: number): LucideIcon {
  if (streak >= 100) return Gem
  if (streak >= 30) return Trophy
  return Flame
}

function StatRow({ icon: IconComp, label, value, accent }: { icon: LucideIcon; label: string; value: string; accent: string }) {
  return (
    <div className="flex w-full items-center gap-3 border-b border-white/10 py-2 text-left last:border-0">
      <IconComp size={16} strokeWidth={1.75} style={{ color: accent }} aria-hidden="true" />
      <span className="flex-1 text-xs opacity-70">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}

function EscaneoOverlay({ onContinue, accent }: { onContinue: () => void; accent: string }) {
  const today = todayKey()
  const yesterday = subDaysKey(today, 1)

  const recentDays = useLiveQuery(() => getVirtualizationDays(400, new Date()), [today])
  const streak = calculateVirtualizationStreak(recentDays ?? [], new Date())
  const progress = usePlayerProgress()
  const habitsToday = useHabitsWithStats(today)
  const bestHabitStreak = habitsToday?.reduce((max, h) => Math.max(max, h.streak.current), 0) ?? 0
  const tasksToday = useLiveQuery(() => getTasksForDate(today), [today])
  const overdueTasks = useLiveQuery(() => getOverdueTasks(today), [today])
  const yesterdayCheckIn = useLiveQuery(() => getCheckInForDate(yesterday), [yesterday])

  const loading = recentDays == null || progress.loading || habitsToday == null || tasksToday == null || overdueTasks == null
  const StreakIcon = streakIcon(streak.current)

  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-1">
        <StreakIcon size={40} strokeWidth={1.5} style={{ color: accent }} aria-hidden="true" />
        <p className="text-3xl font-semibold tabular-nums">{streak.current}</p>
        <p className="text-xs opacity-60">{streak.current === 1 ? 'día seguido virtualizando' : 'días seguidos virtualizando'}</p>
      </div>

      {!loading && (
        <div className="w-full rounded-md border border-white/10 px-4 py-1">
          <StatRow icon={Star} label="Nivel y experiencia" value={`Nv. ${progress.level} · ${progress.xpIntoLevel}/${progress.xpForNextLevel} XP`} accent={accent} />
          <StatRow icon={Flame} label="Mejor racha de hábito" value={bestHabitStreak > 0 ? `${bestHabitStreak} días` : 'ninguna activa'} accent={accent} />
          <StatRow icon={Clock3} label="Bloques de hoy" value={`${dayBlocks(tasksToday!).length}`} accent={accent} />
          <StatRow icon={ListTodo} label="Pendientes atrasadas" value={`${overdueTasks!.length}`} accent={accent} />
          <StatRow
            icon={HeartPulse}
            label="Energía de ayer"
            value={yesterdayCheckIn?.energy != null ? `${yesterdayCheckIn.energy}/5` : 'sin check-in'}
            accent={accent}
          />
        </div>
      )}

      <Button size="md" onClick={onContinue} style={{ background: accent, color: '#04121a' }}>
        Continuar
      </Button>
    </div>
  )
}

function PresenciaOverlay({
  breathLabel,
  syncPercent,
  targetMinutes,
  accent,
  onEnter,
}: {
  breathLabel: string
  syncPercent: number
  targetMinutes: number
  accent: string
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-3xl font-light tracking-wide">{breathLabel}</p>
      <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full transition-[width] duration-200" style={{ width: `${syncPercent}%`, background: accent }} />
      </div>
      <p className="text-xs opacity-60">
        Sincronización {syncPercent}% · meta {targetMinutes % 1 === 0 ? targetMinutes : targetMinutes.toFixed(1)} min
      </p>
      {syncPercent >= 100 && (
        <Button size="md" onClick={onEnter} style={{ background: accent, color: '#04121a' }}>
          Pulsa Enter
        </Button>
      )}
    </div>
  )
}

function VirtualizacionOverlay({
  accent,
  completion,
  onContinue,
}: {
  accent: string
  completion: CompleteVirtualizationResult | null
  onContinue: () => void
}) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1400)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm opacity-70">{ready ? 'Virtualización completa.' : 'Materializando…'}</p>
      {ready && completion && (
        <p className="text-lg font-semibold tabular-nums" style={{ color: accent }}>
          +{completion.xpAwarded} XP · Racha {completion.streak} {completion.streak === 1 ? 'día' : 'días'}
        </p>
      )}
      {ready && (
        <Button size="md" onClick={onContinue} style={{ background: accent, color: '#04121a' }}>
          Continuar
        </Button>
      )}
    </div>
  )
}

export type { PhaseId }
