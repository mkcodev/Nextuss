// Cálculos puros del reproductor de rutinas. Todo sale del reloj real (`startedAt` + segundos
// acumulados antes de la última pausa), nunca de contar ticks: igual que el pomodoro, una pestaña en
// segundo plano o una recarga no retrasan ni congelan la rutina.

export interface PlayerStep {
  title: string
  durationSec: number
}

export interface PlayerSnapshot {
  steps: PlayerStep[]
  index: number
  running: boolean
  /** epoch ms de cuándo arrancó (o se reanudó) el paso en curso; null en pausa. */
  startedAt: number | null
  /** Segundos del paso en curso ya transcurridos antes de la pausa actual. */
  accumulatedSec: number
  /** Segundos añadidos al paso en curso con "+1 min". */
  extraSec: number
  /** Hora de fin prevista al empezar la rutina: contra ella se mide si vas tarde. */
  plannedEndAt: number
  /** epoch ms en que empezó de verdad cada paso ya alcanzado (índices 0..index). */
  stepStartedAt: number[]
}

export type StepStatus = 'done' | 'current' | 'upcoming'

export interface TimelineStep extends PlayerStep {
  status: StepStatus
  /** Real para los pasos pasados y el actual; estimada para los que faltan. */
  startAt: number
}

export function stepPlannedSec(s: PlayerSnapshot): number {
  return (s.steps[s.index]?.durationSec ?? 0) + s.extraSec
}

export function stepElapsedSec(s: PlayerSnapshot, now: number): number {
  const current = s.running && s.startedAt != null ? Math.max(0, now - s.startedAt) / 1000 : 0
  return s.accumulatedSec + current
}

export function stepRemainingSec(s: PlayerSnapshot, now: number): number {
  return Math.max(0, stepPlannedSec(s) - stepElapsedSec(s, now))
}

/** Lo que queda de la rutina entera: el resto del paso actual más todos los siguientes. */
export function routineRemainingSec(s: PlayerSnapshot, now: number): number {
  const after = s.steps.slice(s.index + 1).reduce((sum, st) => sum + st.durationSec, 0)
  return stepRemainingSec(s, now) + after
}

/** Cuándo acabarás si sigues al ritmo previsto desde ahora (en pausa, se va alejando). */
export function projectedEndAt(s: PlayerSnapshot, now: number): number {
  return now + routineRemainingSec(s, now) * 1000
}

/** Minutos de retraso (positivo) o de adelanto (negativo) frente a la hora de fin prevista. */
export function driftMinutes(s: PlayerSnapshot, now: number): number {
  return Math.round((projectedEndAt(s, now) - s.plannedEndAt) / 60_000)
}

/** 0..1 del recorrido total: pasos ya dejados atrás completos + lo que va del actual. */
export function overallProgress(s: PlayerSnapshot, now: number): number {
  const total = s.steps.reduce((sum, st) => sum + st.durationSec, 0) + s.extraSec
  if (total <= 0) return 0
  const before = s.steps.slice(0, s.index).reduce((sum, st) => sum + st.durationSec, 0)
  const current = Math.min(stepElapsedSec(s, now), stepPlannedSec(s))
  return Math.min(1, (before + current) / total)
}

export function buildTimeline(s: PlayerSnapshot, now: number): TimelineStep[] {
  let cursor = now + stepRemainingSec(s, now) * 1000
  return s.steps.map((step, i) => {
    if (i < s.index) return { ...step, status: 'done', startAt: s.stepStartedAt[i] ?? now }
    if (i === s.index) return { ...step, status: 'current', startAt: s.stepStartedAt[i] ?? now }
    const startAt = cursor
    cursor += step.durationSec * 1000
    return { ...step, status: 'upcoming', startAt }
  })
}

export function isLastStep(s: Pick<PlayerSnapshot, 'steps' | 'index'>): boolean {
  return s.index >= s.steps.length - 1
}
