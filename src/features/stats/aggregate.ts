// Agregación pura: recibe entidades crudas (ya filtradas por rango en `db/repositories/stats.ts`)
// y devuelve series listas para pintar. Nada de aquí toca la base de datos — eso es lo que permite
// testear cada pieza sin Dexie y lo que le da a `useStatsData` un único punto de recorrido por
// tabla en vez de repetir consultas por hábito/día (el N+1 que ya tiene `useHabitsWithStats.ts`).
import { addDays } from 'date-fns'
import { dateKey, isHabitScheduledOn, parseDateKey, weekdayOf, WEEKDAY_LABELS_ES } from '../../lib/dates'
import { XP_PER_COMPLETION } from '../../lib/xp'
import type { CheckIn, FocusSession, Habit, HabitLog, HabitType, Task } from '../../db/types'

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    const arr = map.get(key)
    if (arr) arr.push(item)
    else map.set(key, [item])
  }
  return map
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** Recorre [from, to] día a día (ambos inclusive), en orden. */
function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = []
  for (let cursor = parseDateKey(from); dateKey(cursor) <= to; cursor = addDays(cursor, 1)) {
    keys.push(dateKey(cursor))
  }
  return keys
}

export interface DailyPoint {
  date: string
  habitsDone: number
  habitsScheduled: number
  complianceRatio: number
  tasksCompleted: number
  focusMin: number
  /** XP ganado ese día por hábitos + tareas raíz completadas (no incluye objetivos — esos se
   * agregan aparte, ver `comparePeriods`/4.3). Usa `Task.xpAwarded` real, no una constante
   * recalculada, para no contradecir el contador si el bonus por prioridad cambia (Fase 8.6). */
  xp: number
  energy: number | null
  mood: number | null
  focus: number | null
}

/**
 * Serie diaria, un único recorrido del rango. `habits` decide qué hábitos entran en el
 * denominador de cumplimiento — pásale el listado ya filtrado (con o sin archivados) según lo que
 * la pestaña quiera mostrar.
 */
export function buildDailySeries(
  range: { from: string; to: string },
  habits: Habit[],
  logs: HabitLog[],
  tasksCompleted: Task[],
  sessions: FocusSession[],
  checkins: CheckIn[],
): DailyPoint[] {
  const logsByDate = groupBy(logs, (l) => l.date)
  const tasksByDate = groupBy(
    tasksCompleted.filter((t): t is Task & { completedAt: number } => t.completedAt != null),
    (t) => dateKey(new Date(t.completedAt)),
  )
  const sessionsByDate = groupBy(sessions, (s) => dateKey(new Date(s.start)))
  const checkinsByDate = new Map(checkins.map((c) => [c.date, c]))

  return eachDateKey(range.from, range.to).map((key) => {
    const dayLogs = logsByDate.get(key) ?? []
    const logByHabitId = new Map(dayLogs.map((l) => [l.habitId, l]))

    let habitsScheduled = 0
    let habitsDone = 0
    for (const h of habits) {
      if (dateKey(new Date(h.createdAt)) > key) continue
      if (!isHabitScheduledOn(h, parseDateKey(key))) continue
      habitsScheduled += 1
      if (logByHabitId.get(h.id!)?.completed) habitsDone += 1
    }

    const focusMin = (sessionsByDate.get(key) ?? []).reduce((sum, s) => sum + (s.durationMin ?? 0), 0)
    const checkin = checkinsByDate.get(key)
    const dayTasks = tasksByDate.get(key) ?? []
    const taskXp = dayTasks.reduce((sum, t) => sum + t.xpAwarded, 0)

    return {
      date: key,
      habitsDone,
      habitsScheduled,
      complianceRatio: habitsScheduled > 0 ? habitsDone / habitsScheduled : 0,
      tasksCompleted: dayTasks.length,
      focusMin,
      xp: habitsDone * XP_PER_COMPLETION + taskXp,
      energy: checkin?.energy ?? null,
      mood: checkin?.mood ?? null,
      focus: checkin?.focus ?? null,
    }
  })
}

export interface WeekdayProfilePoint {
  weekday: number
  label: string
  avgCompliance: number
  avgTasksCompleted: number
  avgFocusMin: number
  sampleSize: number
}

/** Medias por día de la semana — de aquí sale el insight "tus lunes son peores". */
export function buildWeekdayProfile(points: DailyPoint[]): WeekdayProfilePoint[] {
  const buckets = Array.from({ length: 7 }, () => ({
    compliance: [] as number[],
    tasks: [] as number[],
    focus: [] as number[],
  }))
  for (const p of points) {
    const wd = weekdayOf(parseDateKey(p.date))
    if (p.habitsScheduled > 0) buckets[wd].compliance.push(p.complianceRatio)
    buckets[wd].tasks.push(p.tasksCompleted)
    buckets[wd].focus.push(p.focusMin)
  }
  return buckets.map((b, weekday) => ({
    weekday,
    label: WEEKDAY_LABELS_ES[weekday],
    avgCompliance: average(b.compliance),
    avgTasksCompleted: average(b.tasks),
    avgFocusMin: average(b.focus),
    sampleSize: b.tasks.length,
  }))
}

export interface HourBucket {
  hour: number
  focusMin: number
}

/** Minutos de foco por hora del día — "tu mejor franja de foco". */
export function buildHourHistogram(sessions: FocusSession[]): HourBucket[] {
  const buckets: HourBucket[] = Array.from({ length: 24 }, (_, hour) => ({ hour, focusMin: 0 }))
  for (const s of sessions) {
    const hour = new Date(s.start).getHours()
    buckets[hour].focusMin += s.durationMin ?? 0
  }
  return buckets
}

export interface HabitMatrixRow {
  habitId: number
  name: string
  icon: string
  color: string
  type: HabitType
  attributeId: number | undefined
  scheduledDays: number
  completedDays: number
  complianceRatio: number
  /** Racha en curso al final del rango (acotada al rango, no a toda la vida del hábito). */
  currentStreak: number
  /** Mejor racha observada dentro del rango. */
  bestStreak: number
  trend: 'up' | 'down' | 'flat'
  bestWeekday: number | null
  worstWeekday: number | null
  shieldsUsed: number
  /** Racha en curso día a día — para el gráfico de "evolución de la racha" del panel expandido. */
  streakSeries: { date: string; streak: number }[]
}

function complianceOf(dates: string[], logByDate: Map<string, HabitLog>): number {
  if (dates.length === 0) return 0
  const done = dates.filter((d) => logByDate.get(d)?.completed).length
  return done / dates.length
}

function bestAndWorstWeekday(averages: (number | null)[]): { best: number | null; worst: number | null } {
  let best: number | null = null
  let worst: number | null = null
  averages.forEach((avg, wd) => {
    if (avg == null) return
    if (best == null || avg > averages[best]!) best = wd
    if (worst == null || avg < averages[worst]!) worst = wd
  })
  return { best, worst }
}

/** Fila por hábito: cumplimiento, rachas, tendencia (2ª mitad del rango vs 1ª) y mejor/peor día. */
export function buildHabitMatrix(
  habits: Habit[],
  logs: HabitLog[],
  range: { from: string; to: string },
  now: Date = new Date(),
): HabitMatrixRow[] {
  const logsByHabit = groupBy(logs, (l) => l.habitId)

  return habits.map((h) => {
    const logByDate = new Map((logsByHabit.get(h.id!) ?? []).map((l) => [l.date, l]))
    const habitCreatedKey = dateKey(new Date(h.createdAt))
    const scheduledDates = eachDateKey(range.from, range.to).filter(
      (key) => key >= habitCreatedKey && isHabitScheduledOn(h, parseDateKey(key)),
    )

    let running = 0
    let bestStreak = 0
    let completedDays = 0
    let shieldsUsed = 0
    const complianceByWeekday: number[][] = Array.from({ length: 7 }, () => [])
    const streakSeries: { date: string; streak: number }[] = []

    const todayKey = dateKey(now)
    for (const key of scheduledDates) {
      const log = logByDate.get(key)
      const done = log?.completed ?? false
      if (log?.shieldUsed) shieldsUsed += 1
      if (done) {
        completedDays += 1
        running += 1
        bestStreak = Math.max(bestStreak, running)
      } else if (key !== todayKey) {
        // Hoy nunca rompe una racha en curso: puede que el usuario todavía no lo haya registrado
        // (mismo criterio que `calculateStreak` en lib/streaks.ts).
        running = 0
      }
      complianceByWeekday[weekdayOf(parseDateKey(key))].push(done ? 1 : 0)
      streakSeries.push({ date: key, streak: running })
    }

    const half = Math.floor(scheduledDates.length / 2)
    const firstHalfRatio = complianceOf(scheduledDates.slice(0, half), logByDate)
    const secondHalfRatio = complianceOf(scheduledDates.slice(half), logByDate)
    const trend: HabitMatrixRow['trend'] =
      scheduledDates.length < 4
        ? 'flat'
        : secondHalfRatio - firstHalfRatio > 0.1
          ? 'up'
          : firstHalfRatio - secondHalfRatio > 0.1
            ? 'down'
            : 'flat'

    const weekdayAverages = complianceByWeekday.map((arr) => (arr.length ? average(arr) : null))
    const { best: bestWeekday, worst: worstWeekday } = bestAndWorstWeekday(weekdayAverages)

    return {
      habitId: h.id!,
      name: h.name,
      icon: h.icon,
      color: h.color,
      type: h.type,
      attributeId: h.attributeId,
      scheduledDays: scheduledDates.length,
      completedDays,
      complianceRatio: scheduledDates.length > 0 ? completedDays / scheduledDates.length : 0,
      currentStreak: running,
      bestStreak,
      trend,
      bestWeekday,
      worstWeekday,
      shieldsUsed,
      streakSeries,
    }
  })
}

export interface EstimateAccuracyResult {
  sampleSize: number
  medianRatio: number | null
  meanRatio: number | null
  biasLabel: string | null
}

/** Sesgo de estimación (actual/estimado) sobre tareas con ambos campos. */
export function buildEstimateAccuracy(tasks: Task[]): EstimateAccuracyResult {
  const ratios = tasks
    .filter((t) => t.estimateMin != null && t.estimateMin > 0 && t.actualMin != null)
    .map((t) => t.actualMin! / t.estimateMin!)

  if (ratios.length === 0) return { sampleSize: 0, medianRatio: null, meanRatio: null, biasLabel: null }

  const sorted = [...ratios].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const medianRatio = sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
  const meanRatio = average(ratios)

  const biasLabel =
    medianRatio > 1.1
      ? `Sueles tardar x${medianRatio.toFixed(1)} de lo que estimas`
      : medianRatio < 0.9
        ? `Sueles terminar en x${medianRatio.toFixed(1)} de lo estimado`
        : 'Tus estimaciones son precisas'

  return { sampleSize: ratios.length, medianRatio, meanRatio, biasLabel }
}

export interface PeriodSummary {
  activeDays: number
  complianceRatio: number
  tasksCompleted: number
  focusMin: number
  xp: number
}

/** Resumen de KPIs de un periodo a partir de su serie diaria — entrada de `comparePeriods`. */
export function summarizePeriod(points: DailyPoint[]): PeriodSummary {
  const totalDone = points.reduce((sum, p) => sum + p.habitsDone, 0)
  const totalScheduled = points.reduce((sum, p) => sum + p.habitsScheduled, 0)
  return {
    activeDays: points.filter((p) => p.habitsDone > 0 || p.tasksCompleted > 0).length,
    complianceRatio: totalScheduled > 0 ? totalDone / totalScheduled : 0,
    tasksCompleted: points.reduce((sum, p) => sum + p.tasksCompleted, 0),
    focusMin: points.reduce((sum, p) => sum + p.focusMin, 0),
    xp: points.reduce((sum, p) => sum + p.xp, 0),
  }
}

export interface KpiDelta {
  key: keyof PeriodSummary
  current: number
  previous: number
  delta: number
  deltaRatio: number | null
  direction: 'up' | 'down' | 'flat'
  /** Heurística simple: un cambio relativo de al menos el 10% (o cualquier cambio si `previous` es 0). */
  significant: boolean
}

/** Delta por KPI entre un periodo y el inmediatamente anterior (mismo tamaño). */
export function comparePeriods(current: PeriodSummary, previous: PeriodSummary): KpiDelta[] {
  const keys = Object.keys(current) as (keyof PeriodSummary)[]
  return keys.map((key) => {
    const c = current[key]
    const p = previous[key]
    const delta = c - p
    const deltaRatio = p !== 0 ? delta / p : null
    const direction: KpiDelta['direction'] = Math.abs(delta) < 1e-9 ? 'flat' : delta > 0 ? 'up' : 'down'
    const significant = deltaRatio != null ? Math.abs(deltaRatio) >= 0.1 : c !== p
    return { key, current: c, previous: p, delta, deltaRatio, direction, significant }
  })
}
