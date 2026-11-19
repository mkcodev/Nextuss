import { describe, expect, it } from 'vitest'
import type { Settings } from '../../db/types'
import { PLUGIN_SETTINGS } from '../plugins/settings'
import {
  EXCLUDED_KEYS,
  EXPORTABLE_KEYS,
  SETTINGS_FILE_KIND,
  SettingsFileError,
  buildSettingsExport,
  parseSettingsImport,
  settingsExportFilename,
} from './settingsTransfer'

const FULL: Settings = {
  id: 1,
  theme: 'dark',
  dayStartHour: 8,
  dayEndHour: 21,
  displayName: 'Persona de prueba',
  telegramBotToken: '123:secreto',
  telegramChatId: '999',
  telegramWorkerUrl: 'https://relay.example/secreto',
  telegramUpdateOffset: 42,
  telegramForwardNotifications: true,
  claudeApiKey: 'sk-ant-secreto',
  aiModel: 'claude-opus-5',
  aiUsageCount: 17,
  onboardingCompleted: true,
  virtualizationRoutineId: 3,
  pomodoroWorkMin: 50,
  celebrationEnabled: false,
  missionsPerDay: 2,
  morningSummaryTime: '07:30',
  dayTimeView: 'ring',
  plugins: { habits: false, ai: true },
}

const SECRETS = ['123:secreto', '999', 'https://relay.example/secreto', 'sk-ant-secreto']

describe('buildSettingsExport', () => {
  it('no incluye secretos, campos internos ni referencias a filas', () => {
    const file = buildSettingsExport(FULL, new Date('2026-11-18T10:00:00Z'))
    const json = JSON.stringify(file)
    for (const s of SECRETS) expect(json).not.toContain(s)
    for (const key of EXCLUDED_KEYS) expect(file.settings).not.toHaveProperty(key)
    expect(file).toMatchObject({ kind: SETTINGS_FILE_KIND, version: 1, exportedAt: '2026-11-18T10:00:00.000Z' })
    expect(file.settings).toMatchObject({ theme: 'dark', celebrationEnabled: false, missionsPerDay: 2, pomodoroWorkMin: 50, aiModel: 'claude-opus-5', plugins: { habits: false, ai: true } })
  })

  it('omite lo que no está definido', () => {
    expect(buildSettingsExport({ theme: 'system', dayStartHour: 7, dayEndHour: 22 }).settings).toEqual({ theme: 'system', dayStartHour: 7, dayEndHour: 22 })
  })

  it('deja fuera cualquier campo marcado `secret` en el esquema de plugins', () => {
    const specSecrets = Object.values(PLUGIN_SETTINGS).flatMap((spec) => spec.fields.filter((f) => 'secret' in f && f.secret).map((f) => ('key' in f ? String(f.key) : '')))
    for (const key of specSecrets) expect(EXPORTABLE_KEYS).not.toContain(key)
  })
})

describe('parseSettingsImport', () => {
  it('ida y vuelta: importar lo exportado da los mismos ajustes', () => {
    const file = buildSettingsExport(FULL)
    const { changes, ignored } = parseSettingsImport(JSON.stringify(file))
    expect(ignored).toEqual([])
    expect(changes).toEqual(file.settings)
  })

  it('ignora claves desconocidas, secretas y valores no válidos, y dice cuáles', () => {
    const text = JSON.stringify({
      kind: SETTINGS_FILE_KIND,
      version: 1,
      settings: {
        theme: 'morado',
        claudeApiKey: 'sk-intruso',
        inventado: true,
        pomodoroWorkMin: 9999,
        morningSummaryTime: '25:00',
        notifyTaskStart: 'sí',
        dayStartHour: 6,
        plugins: { habits: true, noExiste: false },
      },
    })
    const { changes, ignored } = parseSettingsImport(text)
    expect(changes).toEqual({ dayStartHour: 6, plugins: { habits: true } })
    expect(ignored.sort()).toEqual(['claudeApiKey', 'inventado', 'morningSummaryTime', 'notifyTaskStart', 'pomodoroWorkMin', 'theme'])
  })

  it('missionsPerDay solo admite 1, 2 o 3', () => {
    const parse = (value: unknown) => parseSettingsImport(JSON.stringify({ kind: SETTINGS_FILE_KIND, version: 1, settings: { missionsPerDay: value } }))
    expect(parse(1).changes).toEqual({ missionsPerDay: 1 })
    expect(parse(3).changes).toEqual({ missionsPerDay: 3 })
    for (const bad of [0, 4, 2.5, '2', null]) expect(parse(bad)).toEqual({ changes: {}, ignored: ['missionsPerDay'] })
  })

  it('rechaza lo que no es un archivo de ajustes de Nextuss', () => {
    expect(() => parseSettingsImport('no es json')).toThrow(SettingsFileError)
    expect(() => parseSettingsImport(JSON.stringify({ version: 1, tables: {} }))).toThrow(/Restaurar desde archivo/)
    expect(() => parseSettingsImport(JSON.stringify({ kind: SETTINGS_FILE_KIND, version: 2, settings: {} }))).toThrow(/Versión/)
    expect(() => parseSettingsImport(JSON.stringify({ kind: SETTINGS_FILE_KIND, version: 1 }))).toThrow(/no trae ajustes/)
  })
})

it('nombre de archivo con la fecha', () => {
  expect(settingsExportFilename(new Date('2026-11-18T10:00:00Z'))).toBe('nextuss-ajustes-2026-11-18.json')
})
