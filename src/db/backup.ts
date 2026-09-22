// Copia de seguridad completa de la base de datos — la red de seguridad que hoy no existe en una
// app 100% local. Exporta/restaura todas las tablas tal cual, sin lógica de negocio.
import { db } from './schema'

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
      `La copia de seguridad es de la versión ${backupVersion} de la base de datos y esta app usa la versión ${currentVersion}. Actualiza la app antes de restaurar, o exporta de nuevo desde una versión compatible.`,
    )
    this.name = 'BackupVersionMismatchError'
    this.backupVersion = backupVersion
    this.currentVersion = currentVersion
  }
}

/**
 * `replace` vacía cada tabla presente en la copia antes de escribir — restaura un estado exacto.
 * `merge` hace upsert por id sin borrar nada — combina con lo que ya tengas (si restauras sobre
 * una base de datos distinta a la que generó la copia, entidades con el mismo id se sobrescriben).
 */
export async function importDatabase(payload: BackupPayload, mode: ImportMode): Promise<void> {
  if (payload.version !== db.verno) {
    throw new BackupVersionMismatchError(payload.version, db.verno)
  }

  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      const rows = payload.tables[table.name]
      if (!rows) continue
      if (mode === 'replace') await table.clear()
      await table.bulkPut(rows as never[])
    }
  })
}
