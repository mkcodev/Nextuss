// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import { clearDemoData, generateDemoData } from './demoSeed'
import { buildDemoChallenges } from './demoChallenges'
import { reconcileChallenges } from './repositories/challenges'
import { parseCustomParams } from '../lib/challenges/custom'
import { summarizeCustom } from '../lib/challenges/customStreak'
import { CHALLENGE_DAY_STATES } from './types'
import { parseMissionParams } from '../lib/challenges/missionCatalog'
import { todayKey } from '../lib/dates'
import { challengePerfectBonus } from '../lib/xp'
import { usePluginsStore } from '../features/plugins/pluginsStore'
import type { PluginId } from '../features/plugins/types'

const saved = usePluginsStore.getState().enabled
const withGamification = (on: boolean) =>
  usePluginsStore.setState({ enabled: new Set<PluginId>(on ? ['gamification', 'challenges'] : ['challenges']) })

async function clearAll() {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
  })
}

const progressDelta = async () => (await db.demoSeeds.toArray()).find((r) => r.table === 'progress')?.xpDelta ?? 0

describe('datos demo: retos', () => {
  beforeEach(async () => {
    await clearAll()
    withGamification(true)
  })
  afterEach(() => usePluginsStore.setState({ enabled: saved }))

  it('crea retos propios que cubren todos los estados, con escudos de 0 a 3, y misiones pasadas', async () => {
    await generateDemoData()
    const today = todayKey()
    const customs = await db.challenges.where('kind').equals('custom').toArray()
    expect(customs.map((c) => `${c.title}:${c.status}`).sort()).toEqual([
      'Caminar 30 minutos:paused',
      'Escribir tres líneas de diario:done',
      'Leer 20 minutos:active',
      'Meditar 10 minutos:done',
      'Sin azúcar añadido:active',
    ])
    for (const c of customs) {
      const params = parseCustomParams(c.params)
      expect(params).not.toBeNull()
      expect(params!.shields).toBeGreaterThanOrEqual(0)
      expect(params!.shields).toBeLessThanOrEqual(3)
    }

    const days = await db.challengeDays.toArray()
    for (const state of CHALLENGE_DAY_STATES) expect(days.some((d) => d.state === state)).toBe(true)
    // Hoy se deja limpio: ningún día de hoy.
    expect(days.some((d) => d.date >= today)).toBe(false)

    const missions = await db.challenges.where('kind').equals('daily-mission').toArray()
    expect(missions.length).toBeGreaterThan(20)
    expect(missions.some((m) => m.status === 'done')).toBe(true)
    expect(missions.some((m) => m.status === 'expired')).toBe(true)
    for (const m of missions) {
      expect(parseMissionParams(m.params)).not.toBeNull()
      expect(m.startDate < today).toBe(true)
    }
  })

  it('los resúmenes salen como se espera de cada reto', async () => {
    await generateDemoData()
    const today = todayKey()
    const summary = async (title: string) => {
      const c = (await db.challenges.where('kind').equals('custom').toArray()).find((x) => x.title === title)!
      const rows = await db.challengeDays.where('challengeId').equals(c.id!).toArray()
      return { c, s: summarizeCustom(c, parseCustomParams(c.params)!, rows, today) }
    }

    const leer = await summary('Leer 20 minutos')
    expect(leer.s.dayIndex).toBe(22)
    expect(leer.s.currentStreak).toBe(19)
    expect(leer.s.shieldsLeft).toBe(1)
    expect(leer.s.todayState).toBeNull()

    const azucar = await summary('Sin azúcar añadido')
    expect(azucar.s.currentStreak).toBe(2)
    expect(azucar.s.counts.fail).toBe(1)
    expect(azucar.s.shieldsLeft).toBe(0)

    const caminar = await summary('Caminar 30 minutos')
    expect(caminar.s.counts.pause).toBe(4)
    expect(caminar.c.pausedSince).toBeDefined()
    expect(caminar.c.pausedBy).toBe('user')

    const diario = await summary('Escribir tres líneas de diario')
    expect(diario.s.counts.fail).toBe(0)
    expect(diario.c.xpAwarded).toBe(challengePerfectBonus(66))

    const meditar = await summary('Meditar 10 minutos')
    expect(meditar.s.counts.fail).toBe(3)
    expect(meditar.c.xpAwarded).toBe(0)
  })

  it('reconciliar no cambia nada: cada día pasado ya tiene su fila', async () => {
    await generateDemoData()
    const before = await db.challengeDays.count()
    const rows = await db.challenges.toArray()
    await reconcileChallenges(todayKey())
    expect(await db.challengeDays.count()).toBe(before)
    const after = await db.challenges.toArray()
    for (const r of rows) {
      const a = after.find((x) => x.id === r.id)!
      expect([a.status, a.endDate]).toEqual([r.status, r.endDate])
    }
  })

  it('con la gamificación apagada todo el XP de retos es 0 y no cambia el XP de la demo', async () => {
    withGamification(false)
    await generateDemoData()
    const rows = await db.challenges.toArray()
    expect(rows.every((c) => c.xpAwarded === 0)).toBe(true)
    expect((await db.challengeDays.toArray()).every((d) => d.xp === 0)).toBe(true)
    const off = await progressDelta()
    await clearDemoData()

    withGamification(true)
    await generateDemoData()
    const on = await progressDelta()
    // El resto de la demo es determinista: la diferencia es justo el XP de los retos.
    expect(on - off).toBe(buildDemoChallenges(todayKey(), true).xp)
    expect(on - off).toBeGreaterThan(0)
  }, 30_000)

  it('limpiar la demo borra los retos y sus días y devuelve el XP', async () => {
    await generateDemoData()
    expect(await db.challenges.count()).toBeGreaterThan(0)
    expect(await db.challengeDays.count()).toBeGreaterThan(0)
    await clearDemoData()
    expect(await db.challenges.count()).toBe(0)
    expect(await db.challengeDays.count()).toBe(0)
    expect((await db.progress.get(1))?.totalXp).toBe(0)
  }, 30_000)

  it('limpiar la demo borra también las misiones de hoy que generó el motor (y devuelve su XP)', async () => {
    await generateDemoData()
    const today = todayKey()
    const params = { template: 'tasks.complete-n', source: 'tasks', target: 3, progress: 3 }
    const base = { kind: 'daily-mission', startDate: today, endDate: today, params, createdAt: 1, updatedAt: 1, deletedAt: 0, sortKey: 1 }
    // Lo que haría el motor al abrir la app con la demo puesta: una pendiente y una ya cumplida con su XP.
    await db.challenges.add({ ...base, status: 'active', title: 'Completa 3 tareas', xpAwarded: 0 })
    await db.challenges.add({ ...base, status: 'done', title: 'Completa 3 tareas (bis)', xpAwarded: 15, sortKey: 2 })
    const progress = (await db.progress.get(1))!
    await db.progress.update(1, { totalXp: progress.totalXp + 15 })

    await clearDemoData()
    expect(await db.challenges.count()).toBe(0)
    expect((await db.progress.get(1))?.totalXp).toBe(0)
  }, 30_000)

  it('limpiar la demo no toca las misiones de hoy si no hay demo que limpiar', async () => {
    const today = todayKey()
    await db.challenges.add({
      kind: 'daily-mission',
      status: 'active',
      title: 'Completa 3 tareas',
      startDate: today,
      endDate: today,
      params: { template: 'tasks.complete-n', source: 'tasks', target: 3, progress: 0 },
      xpAwarded: 0,
      createdAt: 1,
      updatedAt: 1,
      deletedAt: 0,
      sortKey: 1,
    })
    await clearDemoData()
    expect(await db.challenges.count()).toBe(1)
  })
})
