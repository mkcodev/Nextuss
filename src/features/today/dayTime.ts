// Conciencia del tiempo (Fase 28b): cuánto queda de la jornada, qué hay planificado y qué viene. Puro,
// para testearlo con horas fijas; lo usan la tarjeta de Hoy y el indicador de la barra superior.
import type { Task } from '../../db/types'
import { timeToMinutes } from '../../lib/dates'

export const CELL_MIN = 30

export type DayPhase = 'before' | 'during' | 'after'

export interface DayBlock {
  taskId: number
  title: string
  startMin: number
  endMin: number
  done: boolean
}

export interface DayCell {
  startMin: number
  status: 'past' | 'busy' | 'free'
  current: boolean
}

export interface DayTimeSummary {
  phase: DayPhase
  startMin: number
  endMin: number
  /** Minutos de jornada que quedan desde ahora (toda la jornada antes de empezar; 0 al acabar). */
  leftMin: number
  /** 0..1 de la jornada ya transcurrida. */
  elapsed: number
  /** Minutos de lo que queda que ya tienen tarea pendiente encima. */
  plannedLeftMin: number
  freeLeftMin: number
  blocks: DayBlock[]
  next: { title: string; start: string; inMin: number } | null
}

/** Bloques con hora de hoy (tareas raíz con inicio y fin), ordenados por inicio. */
export function dayBlocks(tasks: Task[]): DayBlock[] {
  return tasks
    .filter((t) => !t.parentId && t.scheduledStart && t.scheduledEnd)
    .map((t) => ({
      taskId: t.id!,
      title: t.title,
      startMin: timeToMinutes(t.scheduledStart!),
      endMin: timeToMinutes(t.scheduledEnd!),
      done: t.status === 'done',
    }))
    .filter((b) => b.endMin > b.startMin)
    .sort((a, b) => a.startMin - b.startMin)
}

/** Minutos de [from, to) cubiertos por algún bloque pendiente, sin contar dos veces los solapes. */
function coveredMinutes(blocks: DayBlock[], from: number, to: number): number {
  let covered = 0
  let cursor = from
  for (const b of blocks) {
    if (b.done) continue
    const start = Math.max(b.startMin, cursor)
    const end = Math.min(b.endMin, to)
    if (end > start) {
      covered += end - start
      cursor = end
    }
  }
  return covered
}

export function summarizeDay(input: { tasks: Task[]; nowMin: number; dayStartHour: number; dayEndHour: number }): DayTimeSummary {
  const startMin = input.dayStartHour * 60
  const endMin = Math.max(input.dayEndHour * 60, startMin + CELL_MIN)
  const { nowMin } = input
  const phase: DayPhase = nowMin < startMin ? 'before' : nowMin >= endMin ? 'after' : 'during'
  const from = Math.min(Math.max(nowMin, startMin), endMin)
  const leftMin = endMin - from
  const blocks = dayBlocks(input.tasks)
  const plannedLeftMin = coveredMinutes(blocks, from, endMin)
  const upcoming = blocks.find((b) => !b.done && b.startMin > nowMin)
  return {
    phase,
    startMin,
    endMin,
    leftMin,
    elapsed: (from - startMin) / (endMin - startMin),
    plannedLeftMin,
    freeLeftMin: leftMin - plannedLeftMin,
    blocks,
    next: upcoming
      ? { title: upcoming.title, start: formatClock(upcoming.startMin), inMin: upcoming.startMin - nowMin }
      : null,
  }
}

/** La jornada en casillas de 30 min: pasada, ocupada por un bloque (hecho o no) o libre. */
export function dayCells(summary: Pick<DayTimeSummary, 'startMin' | 'endMin' | 'blocks'>, nowMin: number): DayCell[] {
  const cells: DayCell[] = []
  for (let start = summary.startMin; start < summary.endMin; start += CELL_MIN) {
    const end = start + CELL_MIN
    const busy = summary.blocks.some((b) => b.startMin < end && b.endMin > start)
    cells.push({
      startMin: start,
      status: end <= nowMin ? 'past' : busy ? 'busy' : 'free',
      current: start <= nowMin && nowMin < end,
    })
  }
  return cells
}

export function formatClock(min: number): string {
  return `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
}

/** Versión corta para la barra superior: "8 h 20", "45 min". */
export function formatShort(min: number): string {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}
