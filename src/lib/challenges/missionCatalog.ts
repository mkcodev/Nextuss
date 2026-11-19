// Misiones diarias (#191): catálogo de plantillas y generación determinista. Funciones puras: el
// historial que alimenta los objetivos lo lee el repositorio y llega ya resumido.
//
// Regla de R0: una misión solo se apoya en datos que la app ya registra (tareas, foco, check-in y
// hábitos). Los objetivos salen de días ANTERIORES (sin hoy) y se fijan al generar la misión.

export const DAILY_MISSION_KIND = 'daily-mission'

export type MissionSource = 'tasks' | 'focus' | 'checkin' | 'habits'

export type MissionTemplate =
  | 'tasks.complete-n'
  | 'tasks.high-priority'
  | 'focus.minutes'
  | 'checkin.answer'
  | 'habits.all-today'

export const MISSION_TEMPLATES: readonly MissionTemplate[] = [
  'tasks.complete-n',
  'tasks.high-priority',
  'focus.minutes',
  'checkin.answer',
  'habits.all-today',
]

/** Lo que guarda `Challenge.params` en una misión diaria. */
export interface MissionParams {
  template: MissionTemplate
  source: MissionSource
  /** Objetivo fijado al generar. */
  target: number
  /** Progreso del día; lo escribe `syncMissionProgress`. */
  progress: number
  /** Hábitos de la misión «todos los de hoy», fijados al generar. */
  refs?: { habitIds: number[] }
}

export const MISSION_XP: Record<MissionTemplate, number> = {
  'tasks.complete-n': 15,
  'tasks.high-priority': 10,
  'focus.minutes': 15,
  'checkin.answer': 10,
  'habits.all-today': 20,
}

const SOURCE_OF: Record<MissionTemplate, MissionSource> = {
  'tasks.complete-n': 'tasks',
  'tasks.high-priority': 'tasks',
  'focus.minutes': 'focus',
  'checkin.answer': 'checkin',
  'habits.all-today': 'habits',
}

/** Resumen del pasado que necesita el catálogo, calculado por el repositorio. */
export interface MissionHistory {
  /** Tareas raíz completadas en cada día de los 14 anteriores que tuvo alguna (los días sin ninguna no entran). */
  tasksDonePerActiveDay: number[]
  /** Hay alguna tarea abierta de prioridad 1 (la más alta, `src/lib/priority.ts`). */
  hasOpenP1Task: boolean
  /** Media de minutos de foco de los 7 días anteriores (los días sin sesiones cuentan 0). 0 = sin foco reciente. */
  focusAvgPrevMin: number
  /** Algún check-in respondido entero alguna vez. */
  hasAnsweredCheckIn: boolean
  /** Hábitos vivos, no periódicos y programados para la fecha. */
  scheduledHabitIds: number[]
}

export interface MissionDraft {
  template: MissionTemplate
  source: MissionSource
  title: string
  target: number
  xp: number
  refs?: { habitIds: number[] }
}

export const MIN_TASK_TARGET = 2
export const MAX_TASK_TARGET = 8
export const MIN_FOCUS_TARGET_MIN = 15
export const MAX_FOCUS_TARGET_MIN = 120

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export function taskTarget(tasksDonePerActiveDay: number[]): number {
  const base = Math.round(median(tasksDonePerActiveDay)) + 1
  return Math.min(MAX_TASK_TARGET, Math.max(MIN_TASK_TARGET, base))
}

export function focusTarget(avgPrevMin: number): number {
  const rounded = Math.round((Math.max(MIN_FOCUS_TARGET_MIN, avgPrevMin * 1.1)) / 5) * 5
  return Math.min(MAX_FOCUS_TARGET_MIN, rounded)
}

/** Texto de la misión según su plantilla y objetivo. */
export function missionTitle(template: MissionTemplate, target: number): string {
  switch (template) {
    case 'tasks.complete-n':
      return `Completa ${target} tareas`
    case 'tasks.high-priority':
      return 'Completa una tarea urgente'
    case 'focus.minutes':
      return `Concéntrate ${target} min`
    case 'checkin.answer':
      return 'Responde el check-in de hoy'
    case 'habits.all-today':
      return target === 1 ? 'Cumple tu hábito de hoy' : `Cumple tus ${target} hábitos de hoy`
  }
}

/** PRNG pequeño y con semilla (mulberry32). La semilla sale del texto de la fecha, así que regenerar
 * el mismo día da siempre lo mismo. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function draft(template: MissionTemplate, target: number, refs?: { habitIds: number[] }): MissionDraft {
  return { template, source: SOURCE_OF[template], title: missionTitle(template, target), target, xp: MISSION_XP[template], refs }
}

/** Plantillas que pueden salir hoy, agrupadas por fuente (solo las fuentes activas). */
function eligibleBySource(history: MissionHistory, enabled: ReadonlySet<MissionSource>): Map<MissionSource, MissionDraft[]> {
  const bySource = new Map<MissionSource, MissionDraft[]>()
  const add = (d: MissionDraft) => bySource.set(d.source, [...(bySource.get(d.source) ?? []), d])

  if (enabled.has('tasks')) {
    if (history.tasksDonePerActiveDay.length > 0) add(draft('tasks.complete-n', taskTarget(history.tasksDonePerActiveDay)))
    if (history.hasOpenP1Task) add(draft('tasks.high-priority', 1))
  }
  if (enabled.has('focus') && history.focusAvgPrevMin > 0) add(draft('focus.minutes', focusTarget(history.focusAvgPrevMin)))
  if (enabled.has('checkin') && history.hasAnsweredCheckIn) add(draft('checkin.answer', 1))
  if (enabled.has('habits') && history.scheduledHabitIds.length > 0) {
    add(draft('habits.all-today', history.scheduledHabitIds.length, { habitIds: history.scheduledHabitIds }))
  }
  return bySource
}

/** Elige hasta `count` misiones para `date`, como mucho una por fuente. Determinista por fecha. Si
 * no puede salir ninguna (primer día sin historial, plugins apagados) devuelve una lista vacía. */
export function generateMissions(
  date: string,
  history: MissionHistory,
  enabledSources: ReadonlySet<MissionSource>,
  count: number,
): MissionDraft[] {
  const random = seededRandom(date)
  const bySource = eligibleBySource(history, enabledSources)
  const sources = shuffled([...bySource.keys()].sort(), random)
  const picked: MissionDraft[] = []
  for (const source of sources.slice(0, Math.max(0, count))) {
    const options = bySource.get(source)!
    picked.push(options[Math.floor(random() * options.length)])
  }
  return picked
}

const isIn = <T extends string>(list: readonly T[], value: unknown): value is T => typeof value === 'string' && (list as readonly string[]).includes(value)

/** `null` si `raw` no son unos parámetros de misión válidos (fila corrupta o de otra versión). */
export function parseMissionParams(raw: unknown): MissionParams | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { template, source, target, progress, refs } = raw as Record<string, unknown>
  if (!isIn(MISSION_TEMPLATES, template)) return null
  if (!isIn(['tasks', 'focus', 'checkin', 'habits'] as const, source)) return null
  if (typeof target !== 'number' || !Number.isFinite(target) || target < 1) return null
  if (typeof progress !== 'number' || !Number.isFinite(progress) || progress < 0) return null
  let habitIds: number[] | undefined
  if (refs !== undefined) {
    const ids = (refs as { habitIds?: unknown } | null)?.habitIds
    if (!Array.isArray(ids) || !ids.every((id) => Number.isInteger(id))) return null
    habitIds = ids as number[]
  }
  return { template, source, target, progress, refs: habitIds ? { habitIds } : undefined }
}
