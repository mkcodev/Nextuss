import type { Settings } from '../../db/types'
import { PLUGIN_IDS } from '../plugins/types'
import { PLUGIN_SETTINGS } from '../plugins/settings'

/** Exportar e importar **solo los ajustes** (#98 P7), sin secretos. La copia completa de la base de
 *  datos sigue en `db/backup.ts`; esto es para guardar o mover la configuración sin arrastrar claves
 *  ni conexiones. Importar solo combina: nunca borra ni toca lo que no viene en el archivo. */

/** Lo que nunca sale de este dispositivo en un archivo de ajustes. */
const EXCLUDED = {
  id: 'interno: fila única de la tabla',
  claudeApiKey: 'secreto',
  telegramBotToken: 'secreto',
  telegramChatId: 'secreto: identifica tu chat',
  telegramWorkerUrl: 'secreto: la URL incluye el secreto del worker',
  telegramUpdateOffset: 'interno: estado de lectura de Telegram',
  aiUsageCount: 'interno: contador, no una preferencia',
  onboardingCompleted: 'interno: estado de la bienvenida',
  virtualizationRoutineId: 'referencia a una fila de esta base de datos',
  pluginIdleDismissedAt: 'interno: sugerencias descartadas en este dispositivo',
} as const satisfies Partial<Record<keyof Settings, string>>

type ExcludedKey = keyof typeof EXCLUDED
type ExportableKey = Exclude<keyof Settings, ExcludedKey>

type Rule =
  | { type: 'boolean' }
  | { type: 'number'; min: number; max: number; integer?: true }
  | { type: 'string'; oneOf?: readonly string[]; pattern?: RegExp; maxLength?: number }
  | { type: 'plugins' }

const BOOL: Rule = { type: 'boolean' }
const TIME: Rule = { type: 'string', pattern: /^([01]\d|2[0-3]):[0-5]\d$/ }
const hour = (min: number, max: number): Rule => ({ type: 'number', min, max, integer: true })
const oneOf = (values: readonly string[]): Rule => ({ type: 'string', oneOf: values })

/** Todas las claves exportables con su regla de validación. Es exhaustivo: un campo nuevo de
 *  `Settings` que no esté aquí ni en `EXCLUDED` no compila, así que nadie lo exporta por despiste. */
const RULES: Record<ExportableKey, Rule> = {
  theme: oneOf(['system', 'light', 'dark']),
  dayStartHour: hour(0, 23),
  dayEndHour: hour(1, 24),
  weekStartsOn: hour(0, 1),
  displayName: { type: 'string', maxLength: 80 },
  plugins: { type: 'plugins' },

  telegramForwardNotifications: BOOL,
  aiModel: oneOf(['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5']),

  notificationsEnabled: BOOL,
  notifyHabitReminders: BOOL,
  notifyTaskStart: BOOL,
  notifyMorningSummary: BOOL,
  notifyEveningSummary: BOOL,
  notifyWeeklyReviewNudge: BOOL,
  notifyZombieTasks: BOOL,
  notifyPomodoroEnd: BOOL,
  notifyRoutines: BOOL,
  notifyTransitions: BOOL,
  morningSummaryTime: TIME,
  eveningSummaryTime: TIME,
  quietHoursStart: TIME,
  quietHoursEnd: TIME,

  dayTimeView: oneOf(['ruler', 'ring', 'blocks']),
  routineView: oneOf(['step', 'timeline']),
  routineStepStyle: oneOf(['direct', 'card', 'journal']),
  routineSoundEnabled: BOOL,

  pomodoroWorkMin: { type: 'number', min: 1, max: 180, integer: true },
  pomodoroBreakMin: { type: 'number', min: 1, max: 60, integer: true },
  pomodoroLongBreakMin: { type: 'number', min: 1, max: 120, integer: true },
  pomodoroSoundEnabled: BOOL,

  virtualizationEnabled: BOOL,
  virtualizationWindowEndHour: hour(0, 24),
  virtualizationTheme: oneOf(['a', 'b', 'c']),
  meditationPattern: oneOf(['box4444', '478', 'coherence55']),
  meditationDurationSec: { type: 'number', min: 10, max: 3600, integer: true },
  virtualizationSoundEnabled: BOOL,
}

/** Campos que el esquema de plugins marca como `secret`: tampoco salen, aunque estén en `RULES`. */
const SPEC_SECRETS = new Set<string>(
  Object.values(PLUGIN_SETTINGS).flatMap((spec) => spec.fields.filter((f) => 'secret' in f && f.secret).map((f) => ('key' in f ? String(f.key) : ''))),
)

export const EXPORTABLE_KEYS = (Object.keys(RULES) as ExportableKey[]).filter((k) => !SPEC_SECRETS.has(k))
export const EXCLUDED_KEYS = [...(Object.keys(EXCLUDED) as ExcludedKey[]), ...SPEC_SECRETS] as string[]

export const SETTINGS_FILE_KIND = 'nextuss-settings'
export const SETTINGS_FILE_VERSION = 1

export interface SettingsFile {
  kind: typeof SETTINGS_FILE_KIND
  version: typeof SETTINGS_FILE_VERSION
  exportedAt: string
  settings: Partial<Record<ExportableKey, unknown>>
}

/** Construye el archivo de ajustes: solo claves exportables con valor definido. */
export function buildSettingsExport(settings: Settings | undefined, now = new Date()): SettingsFile {
  const out: Partial<Record<ExportableKey, unknown>> = {}
  for (const key of EXPORTABLE_KEYS) {
    const value = settings?.[key]
    if (value !== undefined && value !== null) out[key] = value
  }
  return { kind: SETTINGS_FILE_KIND, version: SETTINGS_FILE_VERSION, exportedAt: now.toISOString(), settings: out }
}

export class SettingsFileError extends Error {}

export interface ParsedSettingsImport {
  /** Lo que se aplicará con `updateSettings`. */
  changes: Partial<Settings>
  /** Claves del archivo que se ignoran: desconocidas, secretas o con un valor no válido. */
  ignored: string[]
}

function validate(rule: Rule, value: unknown): unknown {
  switch (rule.type) {
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
      if (rule.integer && !Number.isInteger(value)) return undefined
      return value >= rule.min && value <= rule.max ? value : undefined
    case 'string':
      if (typeof value !== 'string') return undefined
      if (rule.oneOf && !rule.oneOf.includes(value)) return undefined
      if (rule.pattern && !rule.pattern.test(value)) return undefined
      if (rule.maxLength != null && value.length > rule.maxLength) return undefined
      return value
    case 'plugins': {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
      const clean: Record<string, boolean> = {}
      for (const [id, on] of Object.entries(value)) {
        if ((PLUGIN_IDS as readonly string[]).includes(id) && typeof on === 'boolean') clean[id] = on
      }
      return Object.keys(clean).length ? clean : undefined
    }
  }
}

/** Lee el contenido de un archivo de ajustes. Lanza `SettingsFileError` si no es uno de Nextuss. */
export function parseSettingsImport(text: string): ParsedSettingsImport {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new SettingsFileError('El archivo no es un JSON válido.')
  }
  const file = data as Partial<SettingsFile> | null
  if (!file || typeof file !== 'object' || file.kind !== SETTINGS_FILE_KIND) {
    throw new SettingsFileError('No es un archivo de ajustes de Nextuss. Para restaurar una copia completa, usa «Restaurar desde archivo».')
  }
  if (file.version !== SETTINGS_FILE_VERSION) {
    throw new SettingsFileError(`Versión de archivo no compatible (${String(file.version)}).`)
  }
  if (!file.settings || typeof file.settings !== 'object' || Array.isArray(file.settings)) {
    throw new SettingsFileError('El archivo no trae ajustes.')
  }
  const changes: Record<string, unknown> = {}
  const ignored: string[] = []
  const exportable = new Set<string>(EXPORTABLE_KEYS)
  for (const [key, value] of Object.entries(file.settings)) {
    const clean = exportable.has(key) ? validate(RULES[key as ExportableKey], value) : undefined
    if (clean === undefined) ignored.push(key)
    else changes[key] = clean
  }
  return { changes: changes as Partial<Settings>, ignored }
}

export function settingsExportFilename(now = new Date()): string {
  return `nextuss-ajustes-${now.toISOString().slice(0, 10)}.json`
}
