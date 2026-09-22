import type { DailyPoint, HabitMatrixRow, HourBucket } from '../aggregate'
import type { CheckIn, FocusSession, Goal, Habit, HabitLog, Task } from '../../../db/types'

export type InsightSeverity = 'good' | 'neutral' | 'warn'

export interface InsightEvidence {
  kind: 'bar' | 'line'
  points: { label: string; value: number }[]
}

export interface InsightAction {
  label: string
  kind: 'create_goal' | 'reschedule' | 'adjust_reminder'
  payload?: Record<string, unknown>
}

export interface Insight {
  key: string
  title: string
  body: string
  severity: InsightSeverity
  /** 0..1 — cuánto se fía el detector de su propia conclusión (tamaño de muestra, fuerza de la señal). */
  confidence: number
  evidence?: InsightEvidence
  action?: InsightAction
}

/** Todo lo que un detector puede necesitar, ya resuelto — ningún detector toca la base de datos. */
export interface InsightContext {
  range: { from: string; to: string; days: number }
  points: DailyPoint[]
  habits: Habit[]
  habitMatrix: HabitMatrixRow[]
  habitLogs: HabitLog[]
  checkins: CheckIn[]
  focusSessions: FocusSession[]
  hourHistogram: HourBucket[]
  tasksCompleted: Task[]
  tasksCreated: Task[]
  goals: Goal[]
  /** (dayEndHour - dayStartHour) * 60, desde Settings — para el detector de sobrecarga. */
  dayCapacityMin: number
  /** Tareas actualmente "zombie" (postponedCount >= ZOMBIE_THRESHOLD) — cuenta en vivo, no acotada al rango. */
  zombieCount: number
  now: Date
}

export type Detector = (ctx: InsightContext) => Insight | null
