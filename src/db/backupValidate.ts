// Validación de las tablas de retos (#191) al importar una copia. El resto de tablas se importan tal
// cual, como siempre; estas se validan porque la racha, los escudos y el XP salen de ellas y una fila
// rota daría cifras falsas sin avisar. Todo o nada: si algo falla, no se escribe ninguna fila.
import { CHALLENGE_DAY_STATES, CHALLENGE_STATUSES } from './types'

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(`La copia no es válida: ${message}`)
    this.name = 'BackupValidationError'
  }
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

type Row = Record<string, unknown>

const isObject = (v: unknown): v is Row => typeof v === 'object' && v !== null && !Array.isArray(v)
const isId = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v > 0
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown): v is string => typeof v === 'string' && DATE_KEY.test(v)

function fail(table: string, index: number, why: string): never {
  throw new BackupValidationError(`en «${table}», la fila ${index + 1} ${why}.`)
}

function checkChallenge(row: unknown, i: number): number {
  const t = 'challenges'
  if (!isObject(row)) fail(t, i, 'no es un objeto')
  if (!isId(row.id)) fail(t, i, 'no tiene un id válido')
  if (typeof row.kind !== 'string' || row.kind.length === 0) fail(t, i, 'no tiene tipo')
  if (!(CHALLENGE_STATUSES as readonly unknown[]).includes(row.status)) fail(t, i, `tiene un estado desconocido (${String(row.status)})`)
  if (typeof row.title !== 'string') fail(t, i, 'no tiene nombre')
  if (!isDate(row.startDate) || !isDate(row.endDate)) fail(t, i, 'tiene fechas mal formadas')
  if (row.endDate < row.startDate) fail(t, i, 'termina antes de empezar')
  for (const key of ['xpAwarded', 'createdAt', 'updatedAt', 'deletedAt', 'sortKey'] as const) {
    if (!isNum(row[key])) fail(t, i, `no tiene un «${key}» numérico`)
  }
  // `params` no se valida aquí: es de cada tipo, y su módulo lo ignora al leerlo si no le vale. Un
  // `kind` desconocido (de una versión futura de un tipo) se conserva.
  return row.id
}

function checkDay(row: unknown, i: number): Row & { challengeId: number; date: string } {
  const t = 'challengeDays'
  if (!isObject(row)) fail(t, i, 'no es un objeto')
  if (!isId(row.id)) fail(t, i, 'no tiene un id válido')
  if (!isId(row.challengeId)) fail(t, i, 'no apunta a ningún reto')
  if (!isDate(row.date)) fail(t, i, 'tiene una fecha mal formada')
  if (!(CHALLENGE_DAY_STATES as readonly unknown[]).includes(row.state)) fail(t, i, `tiene un estado desconocido (${String(row.state)})`)
  if (!isNum(row.xp) || !isNum(row.at)) fail(t, i, 'no tiene «xp» o «at» numéricos')
  return row as Row & { challengeId: number; date: string }
}

/**
 * Valida en sitio `tables.challenges` y `tables.challengeDays` (si vienen). Lanza
 * `BackupValidationError` ante la primera fila no válida o un día duplicado. Los días huérfanos (de
 * un reto que no está ni en la copia ni en `existingChallengeIds`) se descartan sin error.
 */
export function validateChallengeTables(
  tables: Record<string, unknown[]>,
  existingChallengeIds: ReadonlySet<number> = new Set(),
): void {
  const challengeIds = new Set(existingChallengeIds)
  tables.challenges?.forEach((row, i) => challengeIds.add(checkChallenge(row, i)))

  const days = tables.challengeDays
  if (!days) return
  const seen = new Set<string>()
  const kept: unknown[] = []
  days.forEach((raw, i) => {
    const row = checkDay(raw, i)
    const key = `${row.challengeId}|${row.date}`
    if (seen.has(key)) fail('challengeDays', i, `repite el día ${row.date} del reto ${row.challengeId}`)
    seen.add(key)
    if (challengeIds.has(row.challengeId)) kept.push(row)
  })
  tables.challengeDays = kept
}
