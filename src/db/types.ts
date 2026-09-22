// Shared entity types for the Dexie schema. Kept in one file since the
// entities cross-reference each other constantly (habits <-> attributes,
// tasks <-> goals, etc.) and splitting them buys nothing at this size.

export type HabitType = 'binary' | 'quantity' | 'duration' | 'negative'

export interface Habit {
  id?: number
  name: string
  icon: string
  color: string
  type: HabitType
  targetValue?: number // required for 'quantity' | 'duration'
  unit?: string // e.g. 'vasos', 'min', 'páginas'
  attributeId?: number
  weekdays: number[] // 0=domingo..6=sábado; [] = todos los días
  reminderTime?: string // 'HH:mm'
  archived: boolean
  createdAt: number
}

export interface HabitLog {
  id?: number
  habitId: number
  date: string // 'YYYY-MM-DD'
  value: number // binary/negative: 0|1 — quantity/duration: cantidad registrada
  completed: boolean // ¿cuenta el día como logrado? (para negativos: día limpio)
  shieldUsed?: boolean // un escudo de racha absorbió este día fallado
  note?: string
  loggedAt: number // timestamp real de la escritura, para ordenar el feed de actividad
}

export interface QuickNote {
  id?: number
  text: string
  createdAt: number
  triaged: boolean
}

export interface Attribute {
  id?: number
  name: string
  icon: string
  color: string
  xp: number
  order: number
}

export interface Progress {
  id?: number // singleton, id = 1
  totalXp: number
  level: number
  shields: number
  lastShieldRefill: string // 'YYYY-MM'
}

export interface Achievement {
  id?: number
  key: string
  unlockedAt: number
}

export type TaskStatus = 'inbox' | 'backlog' | 'planned' | 'done'
export type EnergyLevel = 'low' | 'medium' | 'high'

export interface Task {
  id?: number
  title: string
  notes?: string
  status: TaskStatus
  color?: string
  parentId?: number
  projectId?: number
  estimateMin?: number
  actualMin?: number
  energy?: EnergyLevel
  priority?: number
  dueDate?: string
  scheduledDate?: string // 'YYYY-MM-DD'
  scheduledStart?: string // 'HH:mm'
  scheduledEnd?: string // 'HH:mm'
  postponedCount: number
  createdAt: number
  completedAt?: number
}

export interface EventItem {
  id?: number
  title: string
  date: string
  start: string
  end: string
  recurrence?: string
  color?: string
}

export type GoalPeriod = 'week' | 'month'

export interface Goal {
  id?: number
  period: GoalPeriod
  periodKey: string // 'YYYY-Www' | 'YYYY-MM'
  title: string
  notes?: string // "Por qué me importa"
  taskIds: number[]
  done: boolean
  isPriority: boolean // North Star — exclusivo por period+periodKey
  parentGoalId?: number // objetivo de semana -> objetivo de mes
  attributeId?: number
  completedAt?: number
  createdAt: number
  carriedFromGoalId?: number // procedencia al arrastrar desde la revisión semanal
}

export interface CheckIn {
  id?: number
  date: string
  energy: number // 1-5
  mood: number // 1-5
  focus: number // 1-5
  note?: string
}

export interface FocusSession {
  id?: number
  taskId?: number
  start: number
  end?: number
  durationMin?: number
  interruptions: number
}

export interface WeeklyReview {
  id?: number
  weekKey: string
  answers: Record<string, string>
  createdAt: number
  carriedGoalIds?: number[]
  droppedGoalIds?: number[]
}

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Settings {
  id?: number // singleton, id = 1
  theme: ThemePreference
  dayStartHour: number
  dayEndHour: number
  displayName?: string
  telegramBotToken?: string
  telegramChatId?: string
  /** Reenvía también por Telegram cualquier aviso que ya dispare `sendNotification` (Fase 5.2). */
  telegramForwardNotifications?: boolean
  /** `update_id` más alto ya procesado — evita reprocesar mensajes tras un reload (Fase 5.5). */
  telegramUpdateOffset?: number
  /** URL base del worker opcional (incluye el secreto como segmento, ver `worker/README.md`), p.ej.
   * `https://nextuss-relay.usuario.workers.dev/nx_abc123`. Vacío = no se usa (100% opcional). */
  telegramWorkerUrl?: string
  claudeApiKey?: string
  /** Contador de llamadas a la API de Claude hechas desde esta app — estimación de uso, no facturación real. */
  aiUsageCount?: number
  // Notificaciones (Fase 5.2) — sin migración: Dexie guarda props no indexadas sin tocar el esquema.
  notificationsEnabled?: boolean
  notifyHabitReminders?: boolean
  notifyTaskStart?: boolean
  notifyMorningSummary?: boolean
  notifyEveningSummary?: boolean
  notifyWeeklyReviewNudge?: boolean
  notifyZombieTasks?: boolean
  notifyPomodoroEnd?: boolean
  morningSummaryTime?: string // 'HH:mm', default '08:00'
  eveningSummaryTime?: string // 'HH:mm', default '21:00'
  quietHoursStart?: string // 'HH:mm'
  quietHoursEnd?: string // 'HH:mm'
  // Pomodoro (Fase 5.3)
  pomodoroWorkMin?: number
  pomodoroBreakMin?: number
  pomodoroLongBreakMin?: number
  pomodoroSoundEnabled?: boolean
  /** Primer día de la semana en los calendarios (Semana/Mes) — no afecta a `weekKey`/las claves ISO
   * de objetivos, que son siempre lunes-inicio; esto es puramente de visualización. */
  weekStartsOn?: 0 | 1
  /** Se marca `true` en cuanto el usuario termina o descarta la bienvenida inicial, para no
   * volver a mostrarla — también se marca automáticamente en cuanto se detectan datos reales. */
  onboardingCompleted?: boolean
}

export interface DemoSeedRecord {
  id?: number
  table: string
  ids: number[]
  createdAt: number
  /** Solo en la fila sintética `table: 'progress'`: el XP que la generación sumó a `Progress.totalXp`
   * (y por tanto lo que hay que restar al borrar los datos de ejemplo). */
  xpDelta?: number
}

export interface NotificationLogRecord {
  id?: number
  key: string // e.g. 'habit:12:2026-09-18' — prevents a reminder firing twice after reload
  sentAt: number
}

export interface InsightFeedbackRecord {
  id?: number
  key: string // insight detector key, e.g. 'weekdayEffect'
  dismissedAt: number
}
