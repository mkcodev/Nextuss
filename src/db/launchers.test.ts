import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  createLauncher,
  deleteLauncher,
  listLaunchers,
  listRecentLauncherRuns,
  logLauncherRun,
  purgeOldLauncherRuns,
} from './repositories/launchers'
import { getOrCreateSettings, updateSettings } from './repositories/settings'
import { exportDatabase, importDatabase } from './backup'
import { processEvent } from '../features/launchers/engine'
import { resetBus, type AppEvent } from '../lib/events/bus'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  await getOrCreateSettings()
  await updateSettings({ onboardingCompleted: true })
})
afterEach(() => resetBus())

const firstOpen: AppEvent = { type: 'day.firstOpen', payload: { date: '2026-09-28' }, meta: { at: 0, cause: [] } }
const base = { name: 'Aviso', enabled: true, trigger: { type: 'day.firstOpen' as const }, conditions: {} }

describe('repositorio de lanzadores', () => {
  it('crea en orden y borra suave; un integrado solo se desactiva', async () => {
    const a = await createLauncher({ ...base, actions: [] })
    const b = await createLauncher({ ...base, name: 'Integrado', builtinKey: 'dayStart', actions: [] })
    await deleteLauncher(a)
    await deleteLauncher(b)
    const live = await listLaunchers()
    expect(live.map((l) => [l.name, l.enabled])).toEqual([['Integrado', false]])
  })

  it('purga ejecuciones de más de 30 días', async () => {
    const day = 24 * 60 * 60 * 1000
    await logLauncherRun({ launcherId: 1, date: 'x', firedAt: 1000, eventType: 'e', depth: 0, status: 'ok' })
    await logLauncherRun({ launcherId: 1, date: 'y', firedAt: 40 * day, eventType: 'e', depth: 0, status: 'ok' })
    expect(await purgeOldLauncherRuns(40 * day, 30 * day)).toBe(1)
  })

  it('un backup de la v14 (sin lanzadores) se restaura', async () => {
    const payload = await exportDatabase()
    delete payload.tables.launchers
    delete payload.tables.launcherRuns
    await importDatabase({ ...payload, version: 14 }, 'replace')
    expect(await listLaunchers()).toEqual([])
  })
})

describe('motor de lanzadores', () => {
  it('ejecuta, apunta ok y la segunda vez salta con motivo', async () => {
    await createLauncher({ ...base, conditions: { oncePerDay: true }, actions: [{ type: 'message', text: 'Hola' }] })
    await processEvent(firstOpen)
    await processEvent(firstOpen)
    const runs = await listRecentLauncherRuns()
    expect(runs.map((r) => [r.status, r.reason])).toEqual([
      ['skipped', 'ya se hizo hoy'],
      ['ok', undefined],
    ])
  })

  it('una acción no disponible deja el error legible y no rompe nada', async () => {
    await createLauncher({ ...base, actions: [{ type: 'virtualization.start' }] })
    await processEvent(firstOpen)
    const [run] = await listRecentLauncherRuns()
    expect(run).toMatchObject({ status: 'error', reason: 'la acción «virtualization.start» aún no está disponible' })
  })
})
