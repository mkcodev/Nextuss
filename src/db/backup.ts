// Copia de seguridad completa de la base de datos — la red de seguridad que hoy no existe en una
// app 100% local. Exporta/restaura todas las tablas tal cual, sin lógica de negocio.
import { db } from './schema'
import { applyMigrationsToBackupTables } from './migrations'
import { validateChallengeTables } from './backupValidate'

export interface BackupPayload {
  version: number
  exportedAt: number
  tables: Record<string, unknown[]>
}

export async function exportDatabase(): Promise<BackupPayload> {
  const tables: Record<string, unknown[]> = {}
  await db.transaction('r', db.tables, async () => {
    for (const table of db.tables) {
      tables[table.name] = await table.toArray()
    }
  })
  return { version: db.verno, exportedAt: Date.now(), tables }
}

export type ImportMode = 'replace' | 'merge'

export class BackupVersionMismatchError extends Error {
  readonly backupVersion: number
  readonly currentVersion: number

  constructor(backupVersion: number, currentVersion: number) {
    super(
      `La copia de seguridad es de la versión ${backupVersion} de la base de datos y esta app usa la versión ${currentVersion}, más antigua. Actualiza la app antes de restaurar esta copia.`,
    )
    this.name = 'BackupVersionMismatchError'
    this.backupVersion = backupVersion
    this.currentVersion = currentVersion
  }
}

/**
 * `replace` vacía todas las tablas antes de escribir, también las que no vienen en la copia (las
 * que nacieron después de su versión, como los retos frente a una copia v17) — restaura un estado
 * exacto, sin mezclar datos actuales con los de la copia.
 * `merge` hace upsert por id sin borrar nada — combina con lo que ya tengas (si restauras sobre
 * una base de datos distinta a la que generó la copia, entidades con el mismo id se sobrescriben).
 *
 * Un backup **más nuevo** que la app se rechaza (no hay forma de saber qué campos añadió una
 * versión futura). Uno **más viejo** se acepta: se reproducen en memoria los mismos backfills que
 * `schema.ts` aplicaría en un upgrade real (`migrations.ts`) antes del `bulkPut`, así que actualizar
 * la app nunca invalida los backups ya descargados.
 */
export async function importDatabase(payload: BackupPayload, mode: ImportMode): Promise<void> {
  if (payload.version > db.verno) {
    throw new BackupVersionMismatchError(payload.version, db.verno)
  }

  // Copia superficial como mínimo: la validación sustituye arrays y no debe tocar el `payload` de fuera.
  const tables = payload.version < db.verno ? structuredClone(payload.tables) : { ...payload.tables }
  if (payload.version < db.verno) {
    applyMigrationsToBackupTables(tables, payload.version)
  }

  await db.transaction('rw', db.tables, async () => {
    // Dentro de la transacción: si la validación lanza, no se ha escrito nada.
    const existing = mode === 'merge' ? new Set(await db.challenges.toCollection().primaryKeys()) : undefined
    validateChallengeTables(tables, existing as Set<number> | undefined)

    for (const table of db.tables) {
      const rows = tables[table.name]
      if (mode === 'replace') await table.clear()
      if (!rows) continue
      await table.bulkPut(rows as never[])
    }
  })
}
