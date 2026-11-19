// Retos (#191): lectura y operaciones de los retos propios. El XP, la reconciliación de días pasados
// y las misiones llegan con el plugin `challenges` (R1b); aquí solo hay datos y reglas de estado.
import { db } from '../schema'
import { trashRows } from '../trash'
import type { Challenge, ChallengeDay } from '../types'
import { todayKey } from '../../lib/dates'
import {
  CUSTOM_KIND,
  MAX_DURATION_DAYS,
  MAX_SHIELDS,
  MAX_START_AHEAD_DAYS,
  MAX_TITLE_LENGTH,
  MIN_DURATION_DAYS,
  defaultShields,
  parseCustomParams,
  shieldsLeft,
  type CustomChallengeParams,
} from '../../lib/challenges/custom'
import { addDaysKey, eachDayKey, endDateFor } from '../../lib/challenges/dayRange'

/** Una operación no permitida por el estado del reto. El mensaje va tal cual a la interfaz. */
export class ChallengeActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ChallengeActionError'
  }
}

export interface NewCustomChallenge {
  title: string
  durationDays: number
  /** Sin definir = `defaultShields(durationDays)`. */
  shields?: number
  /** Sin definir = hoy. */
  startDate?: string
}

export async function createCustomChallenge(input: NewCustomChallenge, today: string = todayKey()): Promise<number> {
  const title = input.title.trim()
  if (title.length === 0 || title.length > MAX_TITLE_LENGTH) {
    throw new ChallengeActionError(`El nombre debe tener entre 1 y ${MAX_TITLE_LENGTH} caracteres.`)
  }
  const { durationDays } = input
  if (!Number.isInteger(durationDays) || durationDays < MIN_DURATION_DAYS || durationDays > MAX_DURATION_DAYS) {
    throw new ChallengeActionError(`La duración debe ser de ${MIN_DURATION_DAYS} a ${MAX_DURATION_DAYS} días.`)
  }
  const shields = input.shields ?? defaultShields(durationDays)
  if (!Number.isInteger(shields) || shields < 0 || shields > MAX_SHIELDS) {
    throw new ChallengeActionError(`Los escudos deben ser de 0 a ${MAX_SHIELDS}.`)
  }
  const startDate = input.startDate ?? today
  if (startDate < today || startDate > addDaysKey(today, MAX_START_AHEAD_DAYS)) {
    throw new ChallengeActionError(`El reto debe empezar hoy o en los próximos ${MAX_START_AHEAD_DAYS} días.`)
  }

  const now = Date.now()
  const params: CustomChallengeParams = { durationDays, shields }
  return (await db.challenges.add({
    kind: CUSTOM_KIND,
    status: 'active',
    title,
    startDate,
    endDate: endDateFor(startDate, durationDays),
    params,
    xpAwarded: 0,
    createdAt: now,
    updatedAt: now,
    deletedAt: 0,
    sortKey: now,
  })) as number
}

/** Retos vivos (fuera de la papelera), opcionalmente de un tipo, por orden manual. */
export async function listChallenges(kind?: string): Promise<Challenge[]> {
  const rows = kind
    ? await db.challenges.where('kind').equals(kind).toArray()
    : await db.challenges.toArray()
  return rows.filter((c) => c.deletedAt === 0).sort((a, b) => a.sortKey - b.sortKey)
}

export function getChallenge(id: number): Promise<Challenge | undefined> {
  return db.challenges.get(id)
}

export async function getChallengeDays(challengeId: number): Promise<ChallengeDay[]> {
  const days = await db.challengeDays.where('challengeId').equals(challengeId).toArray()
  return days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

interface CustomContext {
  challenge: Challenge
  params: CustomChallengeParams
  todayRow: ChallengeDay | undefined
  days: ChallengeDay[]
}

/** Carga un reto propio vivo y comprueba que `today` se puede marcar: dentro de sus fechas, ni
 * terminado ni abandonado, y sin pausa en vigor (una pausa recién pedida empieza mañana). */
async function loadMarkable(id: number, today: string): Promise<CustomContext> {
  const challenge = await db.challenges.get(id)
  if (!challenge || challenge.deletedAt !== 0 || challenge.kind !== CUSTOM_KIND) {
    throw new ChallengeActionError('Ese reto no existe.')
  }
  const params = parseCustomParams(challenge.params)
  if (!params) throw new ChallengeActionError('Los datos de este reto no son válidos.')
  const paused = challenge.status === 'paused' && challenge.pausedSince !== undefined && challenge.pausedSince <= today
  if ((challenge.status !== 'active' && challenge.status !== 'paused') || paused) {
    throw new ChallengeActionError('Este reto no admite marcar días ahora.')
  }
  if (today < challenge.startDate || today > challenge.endDate) {
    throw new ChallengeActionError('Hoy está fuera de las fechas del reto.')
  }
  const days = await db.challengeDays.where('challengeId').equals(id).toArray()
  return { challenge, params, days, todayRow: days.find((d) => d.date === today) }
}

async function touch(id: number, changes: Partial<Challenge> = {}): Promise<void> {
  await db.challenges.update(id, { ...changes, updatedAt: Date.now() })
}

/** Marca hoy como hecho. Si hoy era «Hoy no», pasa a hecho y el escudo vuelve al presupuesto. */
export async function markChallengeDay(id: number, today: string = todayKey()): Promise<void> {
  await db.transaction('rw', db.challenges, db.challengeDays, async () => {
    const { todayRow } = await loadMarkable(id, today)
    if (todayRow?.state === 'done') return
    if (todayRow) await db.challengeDays.update(todayRow.id!, { state: 'done', xp: 0, at: Date.now() })
    else await db.challengeDays.add({ challengeId: id, date: today, state: 'done', xp: 0, at: Date.now() })
    await touch(id)
  })
}

/** Deshace el «hecho» de hoy. Solo hoy: los días pasados ya están cerrados. */
export async function unmarkChallengeDay(id: number, today: string = todayKey()): Promise<void> {
  await db.transaction('rw', db.challenges, db.challengeDays, async () => {
    const { todayRow } = await loadMarkable(id, today)
    if (todayRow?.state !== 'done') return
    await db.challengeDays.delete(todayRow.id!)
    await touch(id)
  })
}

/** «Hoy no»: gasta un escudo del reto a propósito. Solo si queda alguno y hoy no está ya hecho. */
export async function skipChallengeDay(id: number, today: string = todayKey()): Promise<void> {
  await db.transaction('rw', db.challenges, db.challengeDays, async () => {
    const { params, days, todayRow } = await loadMarkable(id, today)
    if (todayRow?.state === 'skip') return
    if (todayRow?.state === 'done') throw new ChallengeActionError('Hoy ya está hecho.')
    if (shieldsLeft(params, days) === 0) throw new ChallengeActionError('No te quedan escudos en este reto.')
    await db.challengeDays.add({ challengeId: id, date: today, state: 'skip', xp: 0, at: Date.now() })
    await touch(id)
  })
}

/** Deshace el «Hoy no» de hoy: el escudo vuelve al presupuesto. */
export async function undoSkipChallengeDay(id: number, today: string = todayKey()): Promise<void> {
  await db.transaction('rw', db.challenges, db.challengeDays, async () => {
    const { todayRow } = await loadMarkable(id, today)
    if (todayRow?.state !== 'skip') return
    await db.challengeDays.delete(todayRow.id!)
    await touch(id)
  })
}

/** Pausa un reto activo desde mañana (hoy sigue contando, si no la pausa sería un «Hoy no» gratis).
 * Los días en pausa son neutros y alargan el reto: se escriben al reanudar o al reconciliar. */
export async function pauseChallenge(id: number, today: string = todayKey(), by: 'user' | 'plugin' = 'user'): Promise<boolean> {
  return db.transaction('rw', db.challenges, async () => {
    const challenge = await db.challenges.get(id)
    if (!challenge || challenge.deletedAt !== 0 || challenge.kind !== CUSTOM_KIND || challenge.status !== 'active') {
      return false
    }
    const tomorrow = addDaysKey(today, 1)
    const pausedSince = challenge.startDate > tomorrow ? challenge.startDate : tomorrow
    if (pausedSince > challenge.endDate) return false // termina hoy: no queda nada que pausar
    await touch(id, { status: 'paused', pausedSince, pausedBy: by })
    return true
  })
}

/** Reanuda un reto en pausa. Los días ya pausados (hasta ayer) quedan como `pause` y alargan el
 * reto; hoy vuelve a contar. */
export async function resumeChallenge(id: number, today: string = todayKey()): Promise<boolean> {
  return db.transaction('rw', db.challenges, db.challengeDays, async () => {
    const challenge = await db.challenges.get(id)
    if (!challenge || challenge.deletedAt !== 0 || challenge.status !== 'paused' || !challenge.pausedSince) return false
    const existing = new Set(
      (await db.challengeDays.where('challengeId').equals(id).toArray()).map((d) => d.date),
    )
    const paused = eachDayKey(challenge.pausedSince, addDaysKey(today, -1)).filter((d) => !existing.has(d))
    const now = Date.now()
    if (paused.length > 0) {
      await db.challengeDays.bulkAdd(paused.map((date) => ({ challengeId: id, date, state: 'pause' as const, xp: 0, at: now })))
    }
    await touch(id, {
      status: 'active',
      pausedSince: undefined,
      pausedBy: undefined,
      endDate: addDaysKey(challenge.endDate, paused.length),
    })
    return true
  })
}

/** Abandona un reto: conserva su historial y el XP ganado, y ya no se puede retomar. */
export async function abandonChallenge(id: number): Promise<void> {
  await db.transaction('rw', db.challenges, async () => {
    const challenge = await db.challenges.get(id)
    if (!challenge || challenge.deletedAt !== 0) return
    if (challenge.status !== 'active' && challenge.status !== 'paused') return
    await touch(id, { status: 'abandoned', pausedSince: undefined, pausedBy: undefined })
  })
}

/** A la papelera, con deshacer. La purga a los 30 días borra también sus días. */
export async function trashChallenge(id: number): Promise<void> {
  const challenge = await db.challenges.get(id)
  if (!challenge) return
  await trashRows('challenges', [id], `Reto «${challenge.title}»`)
}
