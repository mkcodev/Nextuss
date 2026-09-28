// Shared entity types for the Dexie schema. Kept in one file since the
// entities cross-reference each other constantly (habits <-> attributes,
// tasks <-> goals, etc.) and splitting them buys nothing at this size.

export type HabitType = 'binary' | 'quantity' | 'duration' | 'negative'

/**
 * Calendario de un hábito, unión discriminada. `weekdays` en `Habit` sigue existiendo y
 * escribiéndose siempre (incluso cuando `schedule` es de otro tipo) para que cualquier
 * lector que no pase por `isHabitScheduledOn`/`schedule` siga teniendo una respuesta razonable.
 */
export type HabitSchedule =
  | { type: 'weekdays'; weekdays: number[] } // 0=domingo..6=sábado; [] = todos los días
  | { type: 'everyNDays'; interval: number; anchorDate: string } // 'YYYY-MM-DD', primer día del ciclo
  | { type: 'timesPerWeek'; times: number }
  | { type: 'timesPerMonth'; times: number }
  | { type: 'monthDays'; days: number[] } // 1-31

export type HabitScheduleType = HabitSchedule['type']

export interface Habit {
  id?: number
  name: string
  icon: string
  color: string
  type: HabitType
  targetValue?: number // required for 'quantity' | 'duration'
  unit?: string // e.g. 'vasos', 'min', 'páginas'
  attributeId?: number
  weekdays: number[] // 0=domingo..6=sábado; [] = todos los días — ver comentario en `HabitSchedule`
  schedule?: HabitSchedule // si está definido, sustituye a `weekdays` como fuente de verdad del calendario
  pausedFrom?: string // 'YYYY-MM-DD', inclusive — vacaciones: no cuenta como día programado, no rompe racha
  pausedUntil?: string // 'YYYY-MM-DD', inclusive
  skipDates?: string[] // 'YYYY-MM-DD'[] — días sueltos exentos, mismo efecto que la pausa
  reminderTime?: string // 'HH:mm'
  archived: boolean
  createdAt: number
  deletedAt: number // 0 = vivo. Nunca undefined: IndexedDB no indexa undefined.
  sortKey: number
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
  deletedAt: number // 0 = vivo. Nunca undefined: IndexedDB no indexa undefined.
  sortKey: number
  tagIds: number[]
  /** XP realmente concedido al completarla (0 si nunca se completó o si es una subtarea, que no
   * puntúa). Persistido en vez de recalculado para que desmarcarla devuelva exactamente lo que dio,
   * aunque `XP_PER_TASK`/el bonus por prioridad cambien después (Fase 8.6). */
  xpAwarded: number
  /** Presente solo en una ocurrencia generada por una `RecurrenceRule` (Fase 9). Ambos van siempre
   * juntos: `occurrenceDate` es la fecha de calendario que representa esta fila dentro de la serie,
   * y junto a `recurrenceId` forma el índice `[recurrenceId+occurrenceDate]` que hace idempotente la
   * generación (necesario porque `main.tsx` monta bajo `StrictMode`, que dispara los efectos dos
   * veces). `undefined` en una tarea normal — nunca se backfillea, a diferencia de `deletedAt`, ya
   * que "no pertenece a ninguna serie" es exactamente lo que significa ausente. */
  recurrenceId?: number
  occurrenceDate?: string // 'YYYY-MM-DD'
}

/** Vista de tareas guardada (Fase 13.2). Cada campo de filtro es un AND opcional — vacío/undefined
 * significa "no filtra por esto". */
export interface TaskViewFilters {
  status?: TaskStatus[]
  priority?: number[]
  projectId?: number | null // null = filtro activo "sin proyecto"; undefined = no filtra por proyecto
  tagIds?: number[]
  dateField?: 'scheduledDate' | 'dueDate'
  dateFrom?: string
  dateTo?: string
  overdueOnly?: boolean // atajo: dateField (o scheduledDate por defecto) < hoy && status !== 'done'
}

export type TaskSortField = 'priority' | 'scheduledDate' | 'dueDate' | 'createdAt' | 'title' | 'estimateMin'
export type TaskColumnKey = 'priority' | 'project' | 'tags' | 'scheduledDate' | 'dueDate' | 'estimateMin'

export interface TaskView {
  id?: number
  name: string
  filters: TaskViewFilters
  sortField: TaskSortField
  sortDir: 'asc' | 'desc'
  columns: TaskColumnKey[]
  sortKey: number // orden manual entre vistas guardadas — misma convención que Habit/Project
  createdAt: number
}

/** Hijo de una plantilla: subtarea de `TaskTemplate` o tarea inicial de `ProjectTemplate`. */
export interface TemplateChild {
  title: string
  estimateMin?: number
}

/** Plantilla de tarea (Fase 13.5) — igual que `RecurrenceRule`, copia sus campos al crear una tarea
 * real, pero a demanda en vez de por calendario, y sí guarda subtareas. Sin papelera ni índice de
 * búsqueda: es andamiaje reutilizable, no contenido (mismo criterio que `TaskView`). */
export interface TaskTemplate {
  id?: number
  title: string
  notes?: string
  energy?: EnergyLevel
  estimateMin?: number
  priority?: number
  color?: string
  tagIds: number[]
  projectId?: number
  subtasks: TemplateChild[]
  createdAt: number
  sortKey: number
}

/** Plantilla de arranque de proyecto (Fase 13.5): crea un proyecto + su lote inicial de tareas raíz. */
export interface ProjectTemplate {
  id?: number
  name: string
  color: string
  icon?: string
  description?: string
  attributeId?: number
  tasks: TemplateChild[]
  createdAt: number
  sortKey: number
}

/** Paso de una rutina: vive dentro de `Routine.steps` (no en tabla propia) porque solo tiene sentido
 * junto a su rutina y siempre se lee y se escribe con ella. `id` estable para las claves de React. */
export interface RoutineStep {
  id: string
  title: string
  durationMin: number
}

/** Rutina (Fase 28): secuencia de pasos temporizados que se sigue en el reproductor a pantalla
 * completa. `startTime` es opcional: sin hora solo se lanza a mano. */
export interface Routine {
  id?: number
  name: string
  icon: string
  color: string
  steps: RoutineStep[]
  startTime?: string // 'HH:mm'
  weekdays: number[] // 0=domingo..6=sábado; [] = todos los días (mismo criterio que `Habit.weekdays`)
  createdAt: number
  deletedAt: number // 0 = viva
  sortKey: number
}

/** Una pasada por una rutina, terminada o abandonada a medias: de aquí sale "hecha hoy". */
export interface RoutineRun {
  id?: number
  routineId: number
  date: string // 'YYYY-MM-DD'
  startedAt: number
  finishedAt: number
  completedSteps: number
  totalSteps: number
  /** Llegó al último paso (aunque se saltara alguno); false = se salió a medias. */
  finished: boolean
}

export type RoutineView = 'step' | 'timeline'

export type DayTimeView = 'ruler' | 'ring' | 'blocks'

/** Estilo visual de la Virtualización (#97): 'a' nítido/geométrico (por defecto), 'b' orgánico de
 * partículas, 'c' terminal/glitch. Los 3 comparten el mismo motor de fase (`features/virtualization/engine`). */
export type VirtualizationTheme = 'a' | 'b' | 'c'

/** Patrón de respiración guiada de la fase Presencia. Segundos por sub-fase en `BREATH_PATTERNS`
 * (`features/virtualization/engine/breathCycle.ts`). */
export type MeditationPattern = 'box4444' | '478' | 'coherence55'

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly'
/** `schedule`: fechas de calendario fijas (p.ej. "cada lunes"), se generan por adelantado.
 * `completion`: la siguiente ocurrencia se genera solo al completar la anterior, desplazada
 * `interval` unidades desde la fecha real de finalización (p.ej. "cada 3 días tras regarla"). */
export type RecurrenceMode = 'schedule' | 'completion'

/** Regla de recurrencia (Fase 9) — estructurada en tabla propia, no una cadena RRULE: no hay
 * servidor de calendario con el que interoperar y RFC-5545 es peso muerto para los patrones que
 * ofrece la interfaz. Además de la regla en sí, funciona como plantilla: cada ocurrencia generada
 * es una fila `Task` normal que copia estos campos en el momento de crearse (edición posterior de
 * la regla no reescribe ocurrencias ya generadas salvo que se pida explícitamente "esta y futuras"). */
export interface RecurrenceRule {
  id?: number
  freq: RecurrenceFreq
  interval: number // cada N días/semanas/meses
  byWeekday?: number[] // solo freq='weekly'; 0=domingo..6=sábado, como Habit.weekdays
  byMonthDay?: number[] // solo freq='monthly'; 1-31
  mode: RecurrenceMode
  startDate: string // 'YYYY-MM-DD' — ancla del cálculo de intervalos; nunca se generan ocurrencias antes de esta fecha
  until?: string // 'YYYY-MM-DD' opcional
  // Plantilla de cada ocurrencia:
  title: string
  notes?: string
  energy?: EnergyLevel
  estimateMin?: number
  priority?: number
  color?: string
  tagIds: number[]
  projectId?: number
  scheduledStart?: string // 'HH:mm' opcional
  createdAt: number
}

export interface Tag {
  id?: number
  name: string
  color: string
}

export interface Project {
  id?: number
  name: string
  color: string
  icon?: string
  description?: string
  attributeId?: number // las tareas del proyecto heredan esta economía de atributo (Fase 8.6)
  archived: boolean
  createdAt: number
  deletedAt: number // 0 = vivo. Nunca undefined: IndexedDB no indexa undefined. (Fase 13.1)
  sortKey: number
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
  deletedAt: number // 0 = vivo. Nunca undefined: IndexedDB no indexa undefined.
  sortKey: number
}

export interface CheckIn {
  id?: number
  date: string
  energy: number | null // 1-5, null = sin responder — nunca se fabrica un valor por defecto
  mood: number | null // 1-5
  focus: number | null // 1-5
  note?: string
  ritualStartDismissedAt?: number // "inicio del día" ya mostrado/completado para `date` (Fase 12)
  ritualCloseDismissedAt?: number // "cierre del día" ya mostrado/completado para `date`
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

export type AiModel = 'claude-sonnet-5' | 'claude-opus-5' | 'claude-haiku-4-5'

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
  /** Modelo usado en las llamadas a la API de Claude. Sin definir = Sonnet 5 (ver `resolveAiModel`). */
  aiModel?: AiModel
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
  /** Rutinas (Fase 28): aviso a su hora y al cambiar de paso en el reproductor. */
  notifyRoutines?: boolean
  /** Estilo de «tiempo de hoy» (Fase 28b): regla, anillo o casillas de 30 min. Sin definir = 'ruler'. */
  dayTimeView?: DayTimeView
  /** Transiciones (Fase 28b): 5 min antes de un bloque y al terminarlo. */
  notifyTransitions?: boolean
  /** Sonido al cambiar de paso en el reproductor de rutinas. Sin definir = activado. */
  routineSoundEnabled?: boolean
  /** Vista del reproductor: un paso cada vez o línea de tiempo con horas. Sin definir = 'step'. */
  routineView?: RoutineView
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
  /** Plugins que el usuario ha activado o desactivado (clave = `PluginId`). Sin definir = valor por
   * defecto del registro (`features/plugins/registry.ts`). Desactivar nunca borra datos. */
  plugins?: Partial<Record<string, boolean>>
  /** Estilo visual de la Virtualización (#97), elegible desde la Cabina y desde Ajustes. Sin definir = 'a'. */
  virtualizationTheme?: VirtualizationTheme
  /** Patrón de respiración de la fase Presencia. Sin definir = 'box4444' (caja 4-4-4-4). */
  meditationPattern?: MeditationPattern
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

export type TrashableTable = 'tasks' | 'habits' | 'goals' | 'projects' | 'routines'

/** Metadatos de un borrado por lote (una tarea con su subárbol, un hábito, un objetivo) — lo que
 * alimenta la página de Papelera y la purga a los 30 días en `runDailyMaintenance`. La fila borrada
 * en sí sigue viva en su tabla con `deletedAt` puesto; esta entrada es solo el índice de "qué se
 * borró junto y cuándo" para poder listarlo/restaurarlo/purgarlo como una unidad. */
export interface TrashEntry {
  id?: number
  table: TrashableTable
  entityIds: number[]
  label: string
  deletedAt: number
}

// Lanzadores (#118): reglas «cuando pase X, haz Y». Los eventos vienen del bus (`lib/events/bus.ts`).
export type LauncherTrigger =
  | { type: 'app.opened' }
  | { type: 'day.firstOpen' }
  /** `skipped`: solo cuando se saltó («Hoy no») o solo cuando se completó; sin definir, ambos. */
  | { type: 'virtualization.completed'; skipped?: boolean }
  | { type: 'routine.finished'; routineId?: number }
  | { type: 'task.completed'; taskId?: number; projectId?: number; tagId?: number }
  | { type: 'habit.logged'; habitId?: number }
  | { type: 'focus.finished' }
  | { type: 'checkin.completed' }
  | { type: 'day.closed' }
  /** A una hora; con `catchUpMin`, si la app se abre hasta N min después, se dispara al abrir. */
  | { type: 'time'; at: string; catchUpMin?: number }

export type LauncherUnlessDone = 'checkin' | 'dayStart' | { routineId: number }

export interface LauncherConditions {
  /** 0=domingo..6=sábado; vacío o sin definir = todos. */
  days?: number[]
  /** Franja 'HH:mm' [from, to). */
  window?: { from: string; to: string }
  oncePerDay?: boolean
  /** No se dispara si eso ya está hecho hoy. */
  unlessDone?: LauncherUnlessDone
}

export type LauncherAction =
  | { type: 'virtualization.start' }
  | { type: 'routine.start'; routineId: number }
  | { type: 'checkin.open' }
  | { type: 'dayStart.open' }
  | { type: 'focus.start' }
  | { type: 'weeklyReview.open' }
  | { type: 'navigate'; to: string }
  | { type: 'message'; text: string }
  | { type: 'notify'; text: string }
  | { type: 'sound' }
  /** Pregunta con Sí / No; con Sí ejecuta `yes`, con No, `no`. */
  | { type: 'ask'; text: string; yes: LauncherAction[]; no?: LauncherAction[] }

export interface Launcher {
  id?: number
  name: string
  enabled: boolean
  trigger: LauncherTrigger
  conditions: LauncherConditions
  actions: LauncherAction[]
  /** Lanzadores de una misma receta (p. ej. 'morning') se pintan juntos como un flujo (#99). */
  recipeKey?: string
  /** Lanzador integrado de la app (p. ej. 'dayStart'); no se borra, solo se desactiva. */
  builtinKey?: string
  /** Plugin del que depende; desactivado el plugin, el lanzador no se dispara. */
  pluginId?: string
  sortKey: number
  deletedAt: number
  createdAt: number
}

export type LauncherRunStatus = 'ok' | 'skipped' | 'error'

export interface LauncherRun {
  id?: number
  launcherId: number
  date: string
  firedAt: number
  eventType: string
  /** Largo de la cadena de lanzadores que llevó hasta aquí (0 = evento directo). */
  depth: number
  status: LauncherRunStatus
  /** Por qué se saltó o falló, en palabras («ya se hizo hoy», «fuera de franja»…). */
  reason?: string
}
