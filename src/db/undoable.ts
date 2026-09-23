// Envoltorio genérico de deshacer para ediciones y arrastres (los borrados tienen su propio
// mecanismo, más rico, en `trash.ts`). Fotografía las filas indicadas antes de ejecutar `fn` y
// registra un comando inverso que las restaura tal cual — un arrastre en el timeline *es* una
// actualización de `scheduledDate`, así que no hace falta escribir una función inversa a mano en
// cada sitio que quiera ser deshacible.
import { db } from './schema'
import { useUndoStore } from '../lib/undoStore'
import type { TrashableTable } from './types'

interface UndoRef {
  table: TrashableTable
  ids: number[]
}

export async function withUndo(label: string, refs: UndoRef[], fn: () => Promise<void>): Promise<void> {
  const snapshots = await Promise.all(
    refs.map(async (ref) => ({ table: ref.table, ids: ref.ids, rows: await db.table(ref.table).bulkGet(ref.ids) })),
  )

  await fn()

  useUndoStore.getState().push({
    label,
    undo: async () => {
      await db.transaction('rw', snapshots.map((s) => db.table(s.table)), async () => {
        for (const snap of snapshots) {
          const table = db.table(snap.table)
          for (let i = 0; i < snap.ids.length; i++) {
            const row = snap.rows[i]
            if (row) await table.put(row)
          }
        }
      })
    },
    redo: fn,
  })
}
