// Orquestador de la Virtualización (#97): Canvas R3F + overlay DOM. Cabina y Transmisión llevan ya
// contenido real; Escaneo/Presencia/Virtualización tienen el motor de fase (respiración/escaneo,
// ambos con sus fixes) y las 3 temas ya funcionando, con el contenido de datos real llegando en los
// PRs siguientes (#97 PR2-4). Se monta perezoso (`lazy`) solo mientras la Cabina pide turno, para no
// cargar three.js/R3F si el usuario nunca abre la Virtualización.
import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useLiveQuery } from 'dexie-react-hooks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { getTasksForDate } from '../../db/repositories/tasks'
import type { Settings } from '../../db/types'
import { todayKey, formatShortDate } from '../../lib/dates'
import { Button } from '../../design/primitives'
import { useStage } from '../../app/stage/stageStore'
import { BREATH_PATTERNS, getBreathState } from './engine/breathCycle'
import { PHASE_LABELS, type PhaseId } from './engine/phases'
import { useVirtualizationStore } from './engine/useVirtualizationStore'
import { THEMES } from './themes'
import { VirtualizationThemeSwitch } from './VirtualizationThemeSwitch'
import { virtualizationTone } from './audio/virtualizationTone'

const SYNC_DURATION_SEC = 32

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
    if (!visible) return
    virtualizationTone.hum(phase === 'cabina')
    if (phase === 'transmision') virtualizationTone.sweep()
    if (phase === 'escaneo') virtualizationTone.beep(660)
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

  // Presencia: la Sincronización sube con el tiempo en la fase (PR3 la hará depender de ciclos reales).
  useEffect(() => {
    if (phase !== 'presencia') return
    setSyncPercent(Math.min(100, Math.round((phaseElapsedSec / SYNC_DURATION_SEC) * 100)))
  }, [phase, phaseElapsedSec, setSyncPercent])

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
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: palette.bg }}>
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

        {phase === 'cabina' && <CabinaOverlay settings={settings} onStart={() => setPhase('transmision')} onSkip={() => close()} accent={palette.accent} />}
        {phase === 'transmision' && <TerminalOverlay lines={terminalLines} accent={palette.accent} />}
        {phase === 'escaneo' && <EscaneoOverlay onContinue={() => setPhase('presencia')} accent={palette.accent} />}
        {phase === 'presencia' && (
          <PresenciaOverlay breathLabel={getBreathState(breathPattern, phaseElapsedSec).label} syncPercent={syncPercent} accent={palette.accent} onEnter={() => setPhase('virtualizacion')} />
        )}
        {phase === 'virtualizacion' && <VirtualizacionOverlay accent={palette.accent} onContinue={() => close()} />}
      </div>
    </div>
  )
}

function CabinaOverlay({
  settings,
  onStart,
  onSkip,
  accent,
}: {
  settings: Settings
  onStart: () => void
  onSkip: () => void
  accent: string
}) {
  return (
    <div className="flex flex-col items-center gap-5">
      <h1 className="text-2xl font-semibold tracking-tight">Virtualización</h1>
      <p className="text-sm opacity-70">{formatShortDate(todayKey())}</p>
      <VirtualizationThemeSwitch settings={settings} />
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

function EscaneoOverlay({ onContinue, accent }: { onContinue: () => void; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm opacity-70">Escaneando… (racha, nivel y pendientes llegan en el próximo PR)</p>
      <Button size="md" onClick={onContinue} style={{ background: accent, color: '#04121a' }}>
        Continuar
      </Button>
    </div>
  )
}

function PresenciaOverlay({
  breathLabel,
  syncPercent,
  accent,
  onEnter,
}: {
  breathLabel: string
  syncPercent: number
  accent: string
  onEnter: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-3xl font-light tracking-wide">{breathLabel}</p>
      <div className="h-1 w-56 overflow-hidden rounded-full bg-white/10">
        <div className="h-full transition-[width] duration-200" style={{ width: `${syncPercent}%`, background: accent }} />
      </div>
      <p className="text-xs opacity-60">Sincronización {syncPercent}%</p>
      {syncPercent >= 100 && (
        <Button size="md" onClick={onEnter} style={{ background: accent, color: '#04121a' }}>
          Pulsa Enter
        </Button>
      )}
    </div>
  )
}

function VirtualizacionOverlay({ accent, onContinue }: { accent: string; onContinue: () => void }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1400)
    return () => clearTimeout(t)
  }, [])
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm opacity-70">{ready ? 'Virtualización completa.' : 'Materializando…'}</p>
      {ready && (
        <Button size="md" onClick={onContinue} style={{ background: accent, color: '#04121a' }}>
          Continuar
        </Button>
      )}
    </div>
  )
}

export type { PhaseId }
