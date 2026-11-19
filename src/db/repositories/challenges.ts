// Retos (#191): lectura y operaciones de los retos propios, con su XP y la reconciliación de días pasados.
import { db } from '../schema'
import { trashRows } from '../trash'
import type { Challenge, ChallengeDay } from '../types'
import { todayKey } from '../../lib/dates'
import { XP_PER_CHALLENGE_DAY } from '../../lib/xp'
import { isPluginEnabled } from '../../features/plugins/pluginsStore'
import { applyXpDelta, unlockAchievement } from './gamification'
import { CHALLENGE_COUNT_ACHIEVEMENT_THRESHOLDS } from '../../lib/achievementThresholds'
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
import { reconcileCustom, type Reconciliation } from '../../lib/challenges/customStreak'

/** XP de retos solo con la gamificación activa EN ESE MOMENTO: apagada, se guarda 0 y no se reparte
 * con efecto retroactivo al encenderla. */
export function gamifiedXp(amount: number): number {
  return isPluginEnabled('gamification') ? amount : 0
}

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
 * terminado ni abandonado, y sin pausa en vigor (una pausa recién pedida empieza mañana).
 * `allowJustClosed` deja pasar el reto que la marca de hoy acaba de cerrar (era su último día), para
 * poder deshacer esa marca y reabrirlo. */
async function loadMarkable(id: number, today: string, allowJustClosed = false): Promise<CustomContext> {
  const challenge = await db.challenges.get(id)
  if (!challenge || challenge.deletedAt !== 0 || challenge.kind !== CUSTOM_KIND) {
    throw new ChallengeActionError('Ese reto no existe.')
  }
  const params = parseCustomParams(challenge.params)
  if (!params) throw new ChallengeActionError('Los datos de este reto no son válidos.')
  const paused = challenge.status === 'paused' && challenge.pausedSince !== undefined && challenge.pausedSince <= today
  const justClosed = allowJustClosed && challenge.status === 'done' && challenge.endDate === today && challenge.completedAt !== undefined
  if (((challenge.status !== 'active' && challenge.status !== 'paused') || paused) && !justClosed) {
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

/** Lo que deja una marca: si cerró el reto y qué logros desbloqueó. */
export interface MarkResult {
  /** Presente si esta marca cerró el reto (era su último día). `bonus` ya es 0 con la gamificación apagada. */
  finished?: { perfect: boolean; bonus: number; durationDays: number }
  unlockedAchievements: string[]
}

/** Aplica el cierre de días de `reconcileCustom`: filas de escudo, fallo y pausa, fecha de fin y, si el
 * reto termina, estado, bonus de XP y logros. Va dentro de una transacción que incluya `challenges`,
 * `challengeDays`, `progress` y `achievements`. */
async function applyReconciliation(id: number, result: Reconciliation): Promise<{ bonus: number; unlockedAchievements: string[] }> {
  const now = Date.now()
  if (result.add.length > 0) {
    await db.challengeDays.bulkAdd(result.add.map((a) => ({ challengeId: id, date: a.date, state: a.state, xp: 0, at: now })))
  }
  const changes: Partial<Challenge> = { endDate: result.endDate }
  let bonus = 0
  if (result.finish) {
    bonus = gamifiedXp(result.finish.bonus)
    if (bonus > 0) await applyXpDelta(bonus)
    Object.assign(changes, { status: 'done', xpAwarded: bonus, completedAt: now })
  }
  await touch(id, changes)
  const unlockedAchievements = result.finish ? await unlockChallengeAchievements(result.finish.perfect) : []
  return { bonus, unlockedAchievements }
}

/** Logros de reto cumplido: el primero, uno sin fallos y el quinto. El reto ya está en `done`. */
async function unlockChallengeAchievements(perfect: boolean): Promise<string[]> {
  const unlocked: string[] = []
  const tryUnlock = async (key: string) => {
    if (await unlockAchievement(key)) unlocked.push(key)
  }
  await tryUnlock('first_challenge')
  if (perfect) await tryUnlock('challenge_perfect')
  const rows = await db.challenges.where('kind').equals(CUSTOM_KIND).toArray()
  const done = rows.filter((c) => c.deletedAt === 0 && c.status === 'done').length
  for (const t of CHALLENGE_COUNT_ACHIEVEMENT_THRESHOLDS) {
    if (done >= t.count) await tryUnlock(t.key)
  }
  return unlocked
}

/** Marca hoy como hecho. Si hoy era «Hoy no», pasa a hecho y el escudo vuelve al presupuesto. Si hoy es
 * el último día del reto, lo cierra en el momento, igual que lo haría la reconciliación al día siguiente:
 * rellena los días pasados sin cerrar, da el bonus si fue perfecto y desbloquea los logros. */
export async function markChallengeDay(id: number, today: string = todayKey()): Promise<MarkResult> {
  return db.transaction('rw', [db.challenges, db.challengeDays, db.progress, db.achievements], async () => {
    const { challenge, params, todayRow } = await loadMarkable(id, today)
    if (todayRow?.state === 'done') return { unlockedAchievements: [] }
    const xp = gamifiedXp(XP_PER_CHALLENGE_DAY)
    if (todayRow) await db.challengeDays.update(todayRow.id!, { state: 'done', xp, at: Date.now() })
    else await db.challengeDays.add({ challengeId: id, date: today, state: 'done', xp, at: Date.now() })
    if (xp > 0) await applyXpDelta(xp)
    await touch(id)

    if (challenge.status !== 'active' || today !== challenge.endDate) return { unlockedAchievements: [] }
    // Último día: con la marca de hoy el reto está resuelto. Se cierra como lo haría mañana la reconciliación.
    const fresh = await db.challengeDays.where('challengeId').equals(id).toArray()
    const result = reconcileCustom(challenge, params, fresh, addDaysKey(today, 1))
    const applied = await applyReconciliation(id, result)
    return {
      finished: result.finish ? { perfect: result.finish.perfect, bonus: applied.bonus, durationDays: params.durationDays } : undefined,
      unlockedAchievements: applied.unlockedAchievements,
    }
  })
}

/** Deshace el «hecho» de hoy. Solo hoy: los días pasados ya están cerrados. Si esa marca cerró el reto
 * (era su último día), lo reabre y devuelve el bonus; los logros ya desbloqueados se quedan, como en
 * tareas y hábitos. */
export async function unmarkChallengeDay(id: number, today: string = todayKey()): Promise<void> {
  await db.transaction('rw', db.challenges, db.challengeDays, db.progress, async () => {
    const { challenge, todayRow } = await loadMarkable(id, today, true)
    if (todayRow?.state !== 'done') return
    // Resta exactamente lo que dio ese día, aunque ahora la gamificación esté apagada.
    if (todayRow.xp > 0) await applyXpDelta(-todayRow.xp)
    await db.challengeDays.delete(todayRow.id!)
    if (challenge.status === 'done') {
      if (challenge.xpAwarded > 0) await applyXpDelta(-challenge.xpAwarded)
      await touch(id, { status: 'active', xpAwarded: 0, completedAt: undefined })
    } else {
      await touch(id)
    }
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

function isLiveCustom(c: Challenge): boolean {
  return c.kind === CUSTOM_KIND && c.deletedAt === 0
}

async function reconcileOne(id: number, today: string): Promise<void> {
  await db.transaction('rw', [db.challenges, db.challengeDays, db.progress, db.achievements], async () => {
    const challenge = await db.challenges.get(id)
    if (!challenge || !isLiveCustom(challenge)) return
    if (challenge.status !== 'active' && challenge.status !== 'paused') return
    const params = parseCustomParams(challenge.params)
    if (!params) return // fila de otra versión o dañada: se conserva sin tocar
    const days = await db.challengeDays.where('challengeId').equals(id).toArray()
    const result = reconcileCustom(challenge, params, days, today)
    if (result.add.length === 0 && result.endDate === challenge.endDate && !result.finish) return
    await applyReconciliation(id, result)
  })
}

/** Cierra los días pasados de cada reto propio vivo (escudo, fallo o pausa) y termina los que ya
 * pasaron su `endDate`. Idempotente: se puede llamar al abrir la app y en cada cambio de día. */
export async function reconcileChallenges(today: string = todayKey()): Promise<void> {
  const rows = await db.challenges.where('kind').equals(CUSTOM_KIND).toArray()
  for (const c of rows) {
    if (c.id !== undefined && c.deletedAt === 0 && (c.status === 'active' || c.status === 'paused')) await reconcileOne(c.id, today)
  }
}

/** El plugin se apaga: pausa los retos propios activos (desde mañana) para que no cuenten fallos
 * mientras no hay motor. Los datos se conservan. */
export async function pauseChallengesForPlugin(today: string = todayKey()): Promise<void> {
  const rows = await db.challenges.where('kind').equals(CUSTOM_KIND).toArray()
  for (const c of rows) {
    if (c.id !== undefined && c.deletedAt === 0 && c.status === 'active') await pauseChallenge(c.id, today, 'plugin')
  }
}

/** El plugin se enciende: reanuda solo los retos que pausó el propio plugin, no los que pausó el usuario. */
export async function resumeChallengesForPlugin(today: string = todayKey()): Promise<void> {
  const rows = await db.challenges.where('kind').equals(CUSTOM_KIND).toArray()
  for (const c of rows) {
    if (c.id !== undefined && c.deletedAt === 0 && c.status === 'paused' && c.pausedBy === 'plugin') await resumeChallenge(c.id, today)
  }
}
