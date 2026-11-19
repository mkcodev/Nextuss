import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './schema'
import {
  ChallengeActionError,
  abandonChallenge,
  createCustomChallenge,
  getChallenge,
  getChallengeDays,
  listChallenges,
  markChallengeDay,
  pauseChallenge,
  resumeChallenge,
  skipChallengeDay,
  trashChallenge,
  undoSkipChallengeDay,
  unmarkChallengeDay,
} from './repositories/challenges'
import { purgeTrashEntry } from './trash'
import { parseCustomParams, shieldsLeft } from '../lib/challenges/custom'
import { addDaysKey, eachDayKey } from '../lib/challenges/dayRange'
import { challengePerfectBonus } from '../lib/xp'
import { getOrCreateProgress } from './repositories/gamification'
import { reconcileChallenges } from './repositories/challenges'
import { usePluginsStore } from '../features/plugins/pluginsStore'

const TODAY = '2026-11-19'

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) await table.clear()
  })
  usePluginsStore.getState().setStored(undefined)
})

async function left(id: number): Promise<number> {
  const ch = await getChallenge(id)
  return shieldsLeft(parseCustomParams(ch!.params)!, await getChallengeDays(id))
}

describe('crear un reto propio', () => {
  it('fija fechas, escudos por defecto y estado activo', async () => {
    const id = await createCustomChallenge({ title: '  Leer 20 min  ', durationDays: 30 }, TODAY)
    const ch = await getChallenge(id)
    expect(ch).toMatchObject({
      kind: 'custom',
      status: 'active',
      title: 'Leer 20 min',
      startDate: TODAY,
      endDate: '2026-12-18',
      params: { durationDays: 30, shields: 3 },
      xpAwarded: 0,
      deletedAt: 0,
    })
  })

  it('rechaza datos fuera de rango', async () => {
    await expect(createCustomChallenge({ title: '', durationDays: 7 }, TODAY)).rejects.toThrow(ChallengeActionError)
    await expect(createCustomChallenge({ title: 'x'.repeat(81), durationDays: 7 }, TODAY)).rejects.toThrow(ChallengeActionError)
    await expect(createCustomChallenge({ title: 'A', durationDays: 0 }, TODAY)).rejects.toThrow(ChallengeActionError)
    await expect(createCustomChallenge({ title: 'A', durationDays: 366 }, TODAY)).rejects.toThrow(ChallengeActionError)
    await expect(createCustomChallenge({ title: 'A', durationDays: 30, shields: 4 }, TODAY)).rejects.toThrow(ChallengeActionError)
    await expect(createCustomChallenge({ title: 'A', durationDays: 7, startDate: '2026-11-18' }, TODAY)).rejects.toThrow(ChallengeActionError)
    await expect(createCustomChallenge({ title: 'A', durationDays: 7, startDate: '2026-12-20' }, TODAY)).rejects.toThrow(ChallengeActionError)
    expect(await db.challenges.count()).toBe(0)
  })

  it('lista solo los vivos, por tipo y en orden', async () => {
    const a = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    const b = await createCustomChallenge({ title: 'B', durationDays: 7 }, TODAY)
    await db.challenges.update(b, { sortKey: 0 })
    await db.challenges.update(a, { sortKey: 1 })
    expect((await listChallenges('custom')).map((c) => c.title)).toEqual(['B', 'A'])
    await db.challenges.update(a, { deletedAt: 1 })
    expect((await listChallenges()).map((c) => c.title)).toEqual(['B'])
    expect(await listChallenges('daily-mission')).toEqual([])
  })
})

describe('marcar el día', () => {
  it('marca y desmarca hoy, sin duplicar filas', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    await markChallengeDay(id, TODAY)
    await markChallengeDay(id, TODAY)
    expect(await getChallengeDays(id)).toMatchObject([{ date: TODAY, state: 'done', xp: 5 }])
    await unmarkChallengeDay(id, TODAY)
    expect(await getChallengeDays(id)).toEqual([])
  })

  it('no deja marcar fuera de las fechas del reto', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7, startDate: '2026-11-21' }, TODAY)
    await expect(markChallengeDay(id, TODAY)).rejects.toThrow('fuera de las fechas')
  })

  it('no deja marcar un reto abandonado', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    await abandonChallenge(id)
    expect((await getChallenge(id))?.status).toBe('abandoned')
    await expect(markChallengeDay(id, TODAY)).rejects.toThrow(ChallengeActionError)
  })
})

describe('«Hoy no»', () => {
  it('gasta un escudo del presupuesto del reto y deshacerlo en el día lo devuelve', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 20 }, TODAY) // 2 escudos
    expect(await left(id)).toBe(2)

    await skipChallengeDay(id, TODAY)
    expect(await getChallengeDays(id)).toMatchObject([{ date: TODAY, state: 'skip' }])
    expect(await left(id)).toBe(1)

    await undoSkipChallengeDay(id, TODAY)
    expect(await getChallengeDays(id)).toEqual([])
    expect(await left(id)).toBe(2)
  })

  it('comparte presupuesto con los escudos automáticos: sin escudos, no se puede', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 10, startDate: TODAY }, TODAY) // 1 escudo
    await db.challengeDays.add({ challengeId: id, date: '2026-11-18', state: 'shield', xp: 0, at: 1 })
    expect(await left(id)).toBe(0)
    await expect(skipChallengeDay(id, TODAY)).rejects.toThrow('No te quedan escudos')
  })

  it('no se puede si hoy ya está hecho; marcar hecho sobre «Hoy no» devuelve el escudo', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 10 }, TODAY)
    await skipChallengeDay(id, TODAY)
    await markChallengeDay(id, TODAY)
    expect(await getChallengeDays(id)).toMatchObject([{ state: 'done' }])
    expect(await left(id)).toBe(1)
    await expect(skipChallengeDay(id, TODAY)).rejects.toThrow('Hoy ya está hecho')
  })
})

describe('pausa', () => {
  it('empieza mañana: hoy se puede seguir marcando', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    expect(await pauseChallenge(id, TODAY)).toBe(true)
    expect(await getChallenge(id)).toMatchObject({ status: 'paused', pausedSince: '2026-11-20', pausedBy: 'user' })
    await markChallengeDay(id, TODAY)
    await expect(markChallengeDay(id, '2026-11-20')).rejects.toThrow(ChallengeActionError)
  })

  it('al reanudar, los días pausados quedan neutros y alargan el reto', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY) // fin 2026-11-25
    await pauseChallenge(id, TODAY)
    expect(await resumeChallenge(id, '2026-11-23')).toBe(true) // pausados 20, 21 y 22
    const ch = await getChallenge(id)
    expect(ch).toMatchObject({ status: 'active', endDate: '2026-11-28' })
    expect(ch?.pausedSince).toBeUndefined()
    expect(ch?.pausedBy).toBeUndefined()
    expect((await getChallengeDays(id)).map((d) => [d.date, d.state])).toEqual([
      ['2026-11-20', 'pause'],
      ['2026-11-21', 'pause'],
      ['2026-11-22', 'pause'],
    ])
    await markChallengeDay(id, '2026-11-23')
  })

  it('reanudar el mismo día no deja días pausados', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 7 }, TODAY)
    await pauseChallenge(id, TODAY)
    await resumeChallenge(id, TODAY)
    expect(await getChallenge(id)).toMatchObject({ status: 'active', endDate: '2026-11-25' })
    expect(await getChallengeDays(id)).toEqual([])
  })

  it('no pausa un reto que termina hoy', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 1 }, TODAY)
    expect(await pauseChallenge(id, TODAY)).toBe(false)
    expect((await getChallenge(id))?.status).toBe('active')
  })
})

describe('papelera', () => {
  it('la purga borra el reto y sus días', async () => {
    const id = await createCustomChallenge({ title: 'Leer', durationDays: 7 }, TODAY)
    await markChallengeDay(id, TODAY)
    await trashChallenge(id)
    expect((await getChallenge(id))?.deletedAt).toBeGreaterThan(0)
    expect(await listChallenges()).toEqual([])

    const [entry] = await db.trash.toArray()
    expect(entry).toMatchObject({ table: 'challenges', entityIds: [id], label: 'Reto «Leer»' })
    await purgeTrashEntry(entry.id!)
    expect(await db.challenges.count()).toBe(0)
    expect(await db.challengeDays.count()).toBe(0)
  })
})

describe('cierre al marcar el último día', () => {
  const total = async () => (await getOrCreateProgress()).totalXp
  const unlocked = async () => (await db.achievements.toArray()).map((a) => a.key).sort()
  /** Un reto de 7 días que empieza en TODAY; su último día es `last`. */
  async function week(shields = 0) {
    const id = await createCustomChallenge({ title: 'Leer', durationDays: 7, shields }, TODAY)
    return { id, days: eachDayKey(TODAY, addDaysKey(TODAY, 6)), last: addDaysKey(TODAY, 6) }
  }

  it('un día que no es el último no cierra nada', async () => {
    const { id } = await week()
    const result = await markChallengeDay(id, TODAY)
    expect(result).toEqual({ unlockedAchievements: [] })
    expect((await getChallenge(id))?.status).toBe('active')
  })

  it('al marcar el último día cierra el reto en el momento: perfecto, con bonus y logros', async () => {
    const { id, days, last } = await week()
    for (const d of days.slice(0, -1)) await markChallengeDay(id, d)
    const result = await markChallengeDay(id, last)

    const bonus = challengePerfectBonus(7)
    expect(result.finished).toEqual({ perfect: true, bonus, durationDays: 7 })
    expect(result.unlockedAchievements.sort()).toEqual(['challenge_perfect', 'first_challenge'])
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: bonus })
    expect((await getChallenge(id))?.completedAt).toBeGreaterThan(0)
    expect(await total()).toBe(7 * 5 + bonus)
    expect(await unlocked()).toEqual(['challenge_perfect', 'first_challenge'])
  })

  it('cierra rellenando los días pasados sin marcar: escudo primero y después fallo, sin bonus', async () => {
    const { id, days, last } = await week(1)
    for (const d of [days[0], days[1], days[4], days[5]]) await markChallengeDay(id, d)
    const result = await markChallengeDay(id, last)

    expect(result.finished).toEqual({ perfect: false, bonus: 0, durationDays: 7 })
    expect(result.unlockedAchievements).toEqual(['first_challenge'])
    const rows = await getChallengeDays(id)
    expect(rows.map((r) => r.state)).toEqual(['done', 'done', 'shield', 'fail', 'done', 'done', 'done'])
    expect(await total()).toBe(5 * 5)
  })

  it('deshacer la marca del último día reabre el reto y devuelve el bonus; marcar de nuevo lo cierra otra vez', async () => {
    const { id, days, last } = await week()
    for (const d of days) await markChallengeDay(id, d)
    expect((await getChallenge(id))?.status).toBe('done')

    await unmarkChallengeDay(id, last)
    expect(await getChallenge(id)).toMatchObject({ status: 'active', xpAwarded: 0 })
    expect((await getChallenge(id))?.completedAt).toBeUndefined()
    expect(await total()).toBe(6 * 5)

    const again = await markChallengeDay(id, last)
    expect(again.finished?.perfect).toBe(true)
    expect(await total()).toBe(7 * 5 + challengePerfectBonus(7))
  })

  it('con la gamificación apagada cierra sin XP pero desbloquea los logros', async () => {
    usePluginsStore.getState().setStored({ gamification: false })
    const { id, days, last } = await week()
    for (const d of days.slice(0, -1)) await markChallengeDay(id, d)
    const result = await markChallengeDay(id, last)
    expect(result.finished).toEqual({ perfect: true, bonus: 0, durationDays: 7 })
    expect(await getChallenge(id)).toMatchObject({ status: 'done', xpAwarded: 0 })
    expect(await total()).toBe(0)
    expect(await unlocked()).toEqual(['challenge_perfect', 'first_challenge'])
  })

  it('un reto pausado no se cierra al marcar', async () => {
    const { id } = await week()
    await pauseChallenge(id, TODAY)
    await markChallengeDay(id, TODAY)
    expect((await getChallenge(id))?.status).toBe('paused')
  })

  it('el quinto reto cumplido desbloquea «challenges_5»', async () => {
    const ids: number[] = []
    for (let i = 0; i < 5; i++) ids.push(await createCustomChallenge({ title: `R${i}`, durationDays: 1 }, TODAY))
    for (const id of ids.slice(0, 4)) await markChallengeDay(id, TODAY)
    expect(await unlocked()).not.toContain('challenges_5')
    const last = await markChallengeDay(ids[4], TODAY)
    expect(last.unlockedAchievements).toEqual(['challenges_5'])
  })

  it('la reconciliación del día siguiente también desbloquea los logros', async () => {
    const id = await createCustomChallenge({ title: 'A', durationDays: 1, shields: 0 }, TODAY)
    await db.challengeDays.add({ challengeId: id, date: TODAY, state: 'done', xp: 5, at: 1 })
    await reconcileChallenges(addDaysKey(TODAY, 1))
    expect((await getChallenge(id))?.status).toBe('done')
    expect(await unlocked()).toEqual(['challenge_perfect', 'first_challenge'])
  })
})
