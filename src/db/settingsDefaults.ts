import type { Settings } from './types'

/**
 * Única fuente de valores por defecto de `Settings`. Sustituye a los `??`/`!== false` repetidos que
 * antes vivían sueltos en cada lector (2 a 5 archivos por campo). Solo lleva los campos que de verdad
 * tenían un fallback disperso que unificar — no es un espejo de toda la interfaz `Settings`:
 *
 * - `notificationsEnabled` se queda fuera a propósito: `rules.ts` lo trata como encendido si no está
 *   definido, pero el planificador (`scheduler.ts`) y la UI lo tratan como apagado — comportamientos
 *   ya incompatibles hoy (bug conocido, issue propio). Unificar aquí escondería esa inconsistencia en
 *   vez de arreglarla.
 * - `pomodoroSoundEnabled` también se queda fuera de la migración de los lectores (ya es `false` por
 *   defecto en todas partes, sin divergencia) — se documenta aquí igualmente para que `isModified`
 *   pueda usarse en su fila de Ajustes sin tocar los 2 sitios que ya lo leen bien.
 * - Secretos (`claudeApiKey`, `telegramBotToken`, `telegramChatId`, `telegramWorkerUrl`), campos
 *   internos sin UI (`telegramUpdateOffset`, `onboardingCompleted`, `id`) y valores que no son
 *   "un default" sino un estado real (`virtualizationRoutineId: null` = "aún sin configurar",
 *   `quietHoursStart`/`quietHoursEnd` sin definir = "sin horas de silencio") tampoco entran.
 */
export const SETTINGS_DEFAULTS = {
  dayStartHour: 7,
  dayEndHour: 22,
  weekStartsOn: 1,

  pomodoroWorkMin: 25,
  pomodoroBreakMin: 5,
  pomodoroLongBreakMin: 15,
  /** Excepción: valor de referencia para `isModified`, los lectores no pasan por `readSetting` (ver arriba). */
  pomodoroSoundEnabled: false,
  notifyPomodoroEnd: true,

  dayTimeView: 'ruler',
  notifyTransitions: true,

  routineView: 'step',
  routineStepStyle: 'direct',
  routineSoundEnabled: true,
  notifyRoutines: true,

  notifyHabitReminders: true,

  notifyTaskStart: true,

  morningSummaryTime: '08:00',
  notifyMorningSummary: true,
  eveningSummaryTime: '21:00',
  notifyEveningSummary: true,

  notifyWeeklyReviewNudge: true,

  notifyZombieTasks: true,

  virtualizationEnabled: true,
  virtualizationWindowEndHour: 12,
  virtualizationTheme: 'a',
  meditationPattern: 'box4444',
  meditationDurationSec: 120,
  virtualizationSoundEnabled: true,

  /** Debe coincidir con `DEFAULT_AI_MODEL` en `features/ai/errors.ts` (fuente real, `resolveAiModel`
   * sigue siendo quien la aplica en las llamadas a la API) — aquí solo para `isModified`/tests del esquema. */
  aiModel: 'claude-sonnet-5',
} as const satisfies Partial<Required<Settings>>

type DefaultableKey = keyof typeof SETTINGS_DEFAULTS

/** Lee `key` de `settings` aplicando el valor por defecto si no está definido — sustituye a `?? valor` / `!== false`. */
export function readSetting<K extends DefaultableKey>(settings: Settings | undefined, key: K): Exclude<Settings[K], undefined> {
  const value = settings?.[key]
  return (value === undefined ? SETTINGS_DEFAULTS[key] : value) as Exclude<Settings[K], undefined>
}

/** `true` si `key` tiene un valor guardado distinto del de por defecto (para el punto de "modificado"). */
export function isModified<K extends DefaultableKey>(settings: Settings | undefined, key: K): boolean {
  const value = settings?.[key]
  return value !== undefined && value !== SETTINGS_DEFAULTS[key]
}
