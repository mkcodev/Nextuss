import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './schema'
import type { Task } from './types'
import {
  createCustomChallenge,
  getChallenge,
  getChallengeDays,
  markChallengeDay,
  pauseChallenge,
  pauseChallengesForPlugin,
  reconcileChallenges,
  resumeChallengesForPlugin,
  skipChallengeDay,
  unmarkChallengeDay,
} from './repositories/challenges'
import { closeMissions, ensureDailyMissions, syncMissionProgress } from './repositories/challengeMissions'
import { getOrCreateProgress } from './repositories/gamification'
import { getOrCreateSettings, updateSettings } from './repositories/settings'
import { usePluginsStore } from '../features/plugins/pluginsStore'
import { watchChallengesPlugin } from '../features/challenges/pluginWatch'
import { DAILY_MISSION_KIND, parseMissionParams } from '../lib/challenges/missionCatalog'

const TODAY = '2026-11-19'
const local = (y: number, m: number, d: number, h = 10) => new Date(y, m - 1, d, h).getTime()

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  usePluginsStore.getState().setStored(undefined)
})

let nextSort = 1
async function addTask(over: Partial<Task> = {}): Promise<number> {
  return (await db.tasks.add({
    title: 'T',
    status: 'inbox',
    postponedCount: 0,
    createdAt: local(2026, 11, 1),
    deletedAt: 0,
    sortKey: nextSort++,
    tagIds: [],
    xpAwarded: 0,
    ...over,
  })) as number
}

/** Historial de tareas: 3 hechas el día 16 y 2 el día 17 → mediana 2,5 → objetivo 4. */
async function seedTaskHistory() {
  for (let i = 0; i < 3; i++) await addTask({ status: 'done', completedAt: local(2026, 11, 16) })
  for (let i = 0; i < 2; i++) await addTask({ status: 'done', completedAt: local(2026, 11, 17) })
}

async function totalXp(): Promise<number> {
  return (await getOrCreateProgress()).totalXp
}

async function todaysMissions() {
  return (await db.challenges.where('kind').equals(DAILY_MISSION_KIND).toArray()).filter((c) => c.startDate === TODAY)
}

describe('misiones diarias: generar y cerrar', () => {
  it('el primer día sin historial no genera nada', async () => {
    expect(await ensureDailyMissions(TODAY)).toBe(0)
    expect(await db.challenges.count()).toBe(0)
  })

  it('genera con el historial, fija el objetivo y es idempotente', async () => {
    await seedTaskHistory()
    expect(await ensureDailyMissions(TODAY)).toBe(1)
    expect(await ensureDailyMissions(TODAY)).toBe(0)
    const [mission] = await todaysMissions()
    expect(mission).toMatchObject({ status: 'active', startDate: TODAY, endDate: TODAY, xpAwarded: 0, deletedAt: 0 })
    expect(parseMissionParams(mission.params)).toMatchObject({ template: 'tasks.complete-n', target: 4, progress: 0 })
  })

  it('varias llamadas a la vez no duplican (varias pestañas)', async () => {
    await seedTaskHistory()
    await Promise.all([ensureDailyMissions(TODAY), ensureDailyMissions(TODAY), ensureDailyMissions(TODAY)])
    expect(await todaysMissions()).toHaveLength(1)
  })

  it('con el plugin de foco apagado no sale una misión de foco', async () => {
    await db.focusSessions.add({ start: local(2026, 11, 18), end: local(2026, 11, 18) + 1500000, durationMin: 25, kind: 'work' } as never)
    usePluginsStore.getState().setStored({ focus: false })
    expect(await ensureDailyMissions(TODAY)).toBe(0)
  })

  it('missionsPerDay limita cuántas se generan', async () => {
    await seedTaskHistory()
    await addTask({ priority: 1 })
    await db.checkins.add({ date: '2026-11-18', energy: 3, mood: 3, focus: 3 })
    await getOrCreateSettings()
    await updateSettings({ missionsPerDay: 1 })
    expect(await ensureDailyMissions(TODAY)).toBe(1)
  })

  it('closeMissions caduca las activas de días anteriores sin tocar las de hoy ni las cumplidas', async () => {
    const now = Date.now()
    const base = { kind: DAILY_MISSION_KIND, title: 'M', xpAwarded: 0, createdAt: now, updatedAt: now, deletedAt: 0, sortKey: now, params: {} }
    const old = (await db.challenges.add({ ...base, status: 'active', startDate: '2026-11-18', endDate: '2026-11-18' })) as number
    const doneOld = (await db.challenges.add({ ...base, status: 'done', startDate: '2026-11-18', endDate: '2026-11-18' })) as number
    const current = (await db.challenges.add({ ...base, status: 'active', startDate: TODAY, endDate: TODAY })) as number
    await closeMissions(TODAY)
    expect((await getChallenge(old))?.status).toBe('expired')
    expect((await getChallenge(doneOld))?.status).toBe('done')
    expect((await getChallenge(current))?.status).toBe('active')
  })
})

describe('misiones diarias: progreso y XP', () => {
  async function setup() {
    await seedTaskHistory()
    await ensureDailyMissions(TODAY)
    return (await todaysMissions())[0].id!
  }

  it('al llegar al objetivo se cumple y suma su XP; si el dato baja, se resta exactamente', async () => {
    const id = await setup()
    const ids: number[] = []
    for (let i = 0; i < 4; i++) ids.push(await addTask({ status: 'done', completedAt: local(2026, 11, 19) }))

    await syncMissionProgress(TODAY)
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: 15 })
    expect(parseMissionParams((await getChallenge(id))!.params)?.progress).toBe(4)
    expect(await totalXp()).toBe(15)

    await syncMissionProgress(TODAY) // sin cambios: no suma dos veces
    expect(await totalXp()).toBe(15)

    await db.tasks.update(ids[0], { status: 'inbox', completedAt: undefined })
    await syncMissionProgress(TODAY)
    const undone = await getChallenge(id)
    expect(undone).toMatchObject({ status: 'active', xpAwarded: 0 })
    expect(undone?.completedAt).toBeUndefined()
    expect(parseMissionParams(undone!.params)?.progress).toBe(3)
    expect(await totalXp()).toBe(0)
  })

  it('con la gamificación apagada guarda XP 0 y no toca el progreso del jugador', async () => {
    const id = await setup()
    usePluginsStore.getState().setStored({ gamification: false })
    for (let i = 0; i < 4; i++) await addTask({ status: 'done', completedAt: local(2026, 11, 19) })
    await syncMissionProgress(TODAY)
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: 0 })
    expect(await totalXp()).toBe(0)

    // Encenderla después no reparte nada con efecto retroactivo.
    usePluginsStore.getState().setStored(undefined)
    await syncMissionProgress(TODAY)
    expect(await totalXp()).toBe(0)
  })

  it('las subtareas no cuentan', async () => {
    const id = await setup()
    const parent = await addTask({ status: 'inbox' })
    for (let i = 0; i < 4; i++) await addTask({ status: 'done', completedAt: local(2026, 11, 19), parentId: parent })
    await syncMissionProgress(TODAY)
    expect((await getChallenge(id))?.status).toBe('active')
  })

  it('una misión de un día pasado ya no cambia', async () => {
    const id = await setup()
    for (let i = 0; i < 4; i++) await addTask({ status: 'done', completedAt: local(2026, 11, 19) })
    await syncMissionProgress('2026-11-20')
    expect((await getChallenge(id))?.status).toBe('active')
    expect(await totalXp()).toBe(0)
  })
})

describe('retos propios: XP por día', () => {
  it('cada día hecho da 5 XP y deshacerlo los quita', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    await markChallengeDay(id, TODAY)
    expect(await totalXp()).toBe(5)
    await unmarkChallengeDay(id, TODAY)
    expect(await totalXp()).toBe(0)
  })

  it('con la gamificación apagada el día se guarda con XP 0', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    usePluginsStore.getState().setStored({ gamification: false })
    await markChallengeDay(id, TODAY)
    expect(await getChallengeDays(id)).toMatchObject([{ xp: 0 }])
    expect(await totalXp()).toBe(0)
    usePluginsStore.getState().setStored(undefined)
    await unmarkChallengeDay(id, TODAY)
    expect(await totalXp()).toBe(0)
  })

  it('deshacer resta lo que se dio aunque ahora la gamificación esté apagada', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    await markChallengeDay(id, TODAY)
    usePluginsStore.getState().setStored({ gamification: false })
    await unmarkChallengeDay(id, TODAY)
    expect(await totalXp()).toBe(0)
  })

  it('«Hoy no» no da XP y pasar a hecho sí', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 30 }, TODAY)
    await skipChallengeDay(id, TODAY)
    expect(await totalXp()).toBe(0)
    await markChallengeDay(id, TODAY)
    expect(await totalXp()).toBe(5)
  })
})

describe('retos propios: reconciliar', () => {
  const START = '2026-11-10'

  it('un hueco gasta escudos y luego falla; al pasar endDate el reto termina sin bonus', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 3, shields: 1 }, START)
    await markChallengeDay(id, START)
    await reconcileChallenges('2026-11-14')
    expect((await getChallengeDays(id)).map((d) => d.state)).toEqual(['done', 'shield', 'fail'])
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: 0 })
    expect((await getChallenge(id))?.completedAt).toBeDefined()
    expect(await totalXp()).toBe(5)
  })

  it('es idempotente', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 3, shields: 1 }, START)
    await reconcileChallenges('2026-11-14')
    const first = (await getChallengeDays(id)).length
    await reconcileChallenges('2026-11-14')
    await reconcileChallenges('2026-11-20')
    expect(await getChallengeDays(id)).toHaveLength(first)
  })

  it('terminar perfect (con un escudo) da el bonus: el doble de los días', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 3, shields: 1 }, START)
    await markChallengeDay(id, START)
    await skipChallengeDay(id, '2026-11-11')
    await markChallengeDay(id, '2026-11-12')
    await reconcileChallenges('2026-11-13')
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: 6 })
    expect(await totalXp()).toBe(5 + 5 + 6)
  })

  it('con la gamificación apagada el bonus es 0', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 3, shields: 0 }, START)
    for (const d of ['2026-11-10', '2026-11-11', '2026-11-12']) {
      usePluginsStore.getState().setStored({ gamification: false })
      await markChallengeDay(id, d)
    }
    await reconcileChallenges('2026-11-13')
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: 0 })
    expect(await totalXp()).toBe(0)
  })

  it('no toca un reto con parámetros que no entiende', async () => {
    const now = Date.now()
    const id = (await db.challenges.add({
      kind: 'custom', status: 'active', title: 'Raro', startDate: START, endDate: '2026-11-12', params: { nope: true },
      xpAwarded: 0, createdAt: now, updatedAt: now, deletedAt: 0, sortKey: now,
    })) as number
    await reconcileChallenges('2026-11-20')
    expect(await getChallenge(id)).toMatchObject({ status: 'active' })
    expect(await db.challengeDays.count()).toBe(0)
  })
})

describe('apagar el plugin = pausa automática', () => {
  it('pausa los activos desde mañana y reanuda solo los que pausó el plugin', async () => {
    const byPlugin = await createCustomChallenge({ title: 'A', durationDays: 10 }, TODAY)
    const byUser = await createCustomChallenge({ title: 'B', durationDays: 10 }, TODAY)
    await pauseChallenge(byUser, TODAY, 'user')

    await pauseChallengesForPlugin(TODAY)
    expect(await getChallenge(byPlugin)).toMatchObject({ status: 'paused', pausedBy: 'plugin', pausedSince: '2026-11-20' })
    expect(await getChallenge(byUser)).toMatchObject({ status: 'paused', pausedBy: 'user' })

    await resumeChallengesForPlugin('2026-11-22')
    expect(await getChallenge(byPlugin)).toMatchObject({ status: 'active', endDate: '2026-11-30' })
    expect((await getChallengeDays(byPlugin)).map((d) => d.state)).toEqual(['pause', 'pause'])
    expect(await getChallenge(byUser)).toMatchObject({ status: 'paused', pausedBy: 'user' })
  })

  it('mientras está apagado no se reconcilia: al volver no hay fallos por esos días', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 10, shields: 0 }, TODAY)
    await markChallengeDay(id, TODAY) // el día del apagado sigue contando
    await pauseChallengesForPlugin(TODAY)
    await resumeChallengesForPlugin('2026-11-25')
    await reconcileChallenges('2026-11-25')
    const states = (await getChallengeDays(id)).map((d) => d.state)
    expect(states.filter((s) => s === 'pause')).toHaveLength(5) // del 20 al 24
    expect(states).not.toContain('fail')
  })

  it('el observador reacciona al cambio de estado del plugin, también en la primera carga', () => {
    usePluginsStore.setState({ loaded: false })
    const onChange = vi.fn()
    const stop = watchChallengesPlugin(onChange)
    expect(onChange).not.toHaveBeenCalled() // aún sin ajustes: valen los valores por defecto

    usePluginsStore.getState().setStored({ challenges: true })
    expect(onChange).toHaveBeenLastCalledWith(true)
    usePluginsStore.getState().setStored({ challenges: true, habits: false })
    expect(onChange).toHaveBeenCalledTimes(1) // sin cambio de estado de Retos
    usePluginsStore.getState().setStored({ challenges: false })
    expect(onChange).toHaveBeenLastCalledWith(false)
    expect(onChange).toHaveBeenCalledTimes(2)

    stop()
    usePluginsStore.getState().setStored({ challenges: true })
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
