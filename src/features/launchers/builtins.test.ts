import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../db/schema'
import { ensureSingletons } from '../../db/init'
import { BUILTIN_DAY_START } from '../../db/builtinLaunchers'
import { getLauncherByBuiltin, listLaunchers, listRecentLauncherRuns } from '../../db/repositories/launchers'
import { updateSettings } from '../../db/repositories/settings'
import { createTask } from '../../db/repositories/tasks'
import { markRitualStart } from '../../db/repositories/checkins'
import { resetBus, type AppEvent } from '../../lib/events/bus'
import { logicalDateKey } from '../../lib/events/clock'
import { useDayStartStore } from '../rituals/dayStartStore'
import { processEvent } from './engine'
import { MORNING_RECIPE, installMorningRecipe } from './recipes'
import { matchLaunchers } from './runner'
import { resolveEnabled } from '../plugins/resolve'

const now = new Date(2026, 8, 28, 9, 0)
const today = logicalDateKey(now)
const appOpened: AppEvent = { type: 'app.opened', payload: { date: today }, meta: { at: 0, cause: [] } }

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  await ensureSingletons()
  await updateSettings({ onboardingCompleted: true })
  useDayStartStore.setState({ open: false, date: null })
})
afterEach(() => resetBus())

describe('«Empezar el día» como lanzador integrado', () => {
  it('se crea una sola vez al arrancar', async () => {
    await ensureSingletons()
    expect((await listLaunchers()).filter((l) => l.builtinKey === BUILTIN_DAY_START)).toHaveLength(1)
  })

  it('al abrir la app con algo que preparar, abre el inicio del día', async () => {
    await createTask({ title: 'Algo', scheduledDate: today })
    await processEvent(appOpened, now)
    expect(useDayStartStore.getState()).toMatchObject({ open: true, date: today })
  })

  it('en un día sin nada que preparar se salta con motivo, sin abrir nada', async () => {
    await processEvent(appOpened, now)
    expect(useDayStartStore.getState().open).toBe(false)
    const [run] = await listRecentLauncherRuns()
    expect(run).toMatchObject({ status: 'skipped', reason: 'nada que preparar hoy' })
  })

  it('una vez terminado o descartado hoy, no vuelve a proponerse', async () => {
    await createTask({ title: 'Algo', scheduledDate: today })
    await markRitualStart(today)
    await processEvent(appOpened, now)
    expect(useDayStartStore.getState().open).toBe(false)
    const [run] = await listRecentLauncherRuns()
    expect(run.reason).toBe('el inicio del día ya está hecho')
  })
})

describe('receta «Mañana consciente»', () => {
  it('instala sus cinco pasos y desactiva «Empezar el día»; reinstalar no duplica', async () => {
    await installMorningRecipe(3)
    await installMorningRecipe(3)
    const recipe = (await listLaunchers()).filter((l) => l.recipeKey === MORNING_RECIPE)
    expect(recipe).toHaveLength(5)
    expect((await getLauncherByBuiltin(BUILTIN_DAY_START))?.enabled).toBe(false)
  })

  it('«Hoy no» en la Virtualización pregunta; completarla va directo a la rutina', async () => {
    await installMorningRecipe(3)
    const launchers = await listLaunchers()
    const ctx = {
      now,
      runsToday: [],
      enabledPlugins: resolveEnabled(undefined),
      onboardingCompleted: true,
      done: { checkin: false, dayStart: false, routineIdsFinished: new Set<number>() },
    }
    const ev = (skipped: boolean): AppEvent => ({
      type: 'virtualization.completed',
      payload: { date: today, skipped },
      meta: { at: 0, cause: [] },
    })
    expect(matchLaunchers(ev(true), launchers, ctx).fire.map((l) => l.actions[0].type)).toEqual(['ask'])
    expect(matchLaunchers(ev(false), launchers, ctx).fire.map((l) => l.actions[0].type)).toEqual(['routine.start'])
  })
})
