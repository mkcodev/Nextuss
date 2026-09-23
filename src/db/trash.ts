// Papelera: borrado blando (`deletedAt`) + registro persistente por lote + deshacer inmediato.
// Ningún camino de interfaz llama ya a `table.delete()` directamente — todo pasa por `trashRows`,
// que deja la fila viva pero oculta (excluida de toda lectura de listado), apunta el lote en `trash`
// para la página de Papelera y la purga a los 30 días, y empuja un comando de deshacer + un toast
// con acción. `purgeTrashEntry` es el único sitio que sí borra de verdad.
import { db } from './schema'
import type { TrashableTable } from './types'
import { useUndoStore } from '../lib/undoStore'
import { useToastStore } from '../lib/toastStore'

export function listTrash() {
  return db.trash.orderBy('deletedAt').reverse().toArray()
}

/** Soft-deletes `ids` (ya se hayan seleccionado como un lote — p.ej. el subárbol de una tarea) tras
 * `label`, y deja un rastro deshacible tanto por Ctrl+Z como desde la propia página de Papelera. */
export async function trashRows(table: TrashableTable, ids: number[], label: string): Promise<void> {
  if (ids.length === 0) return
  const now = Date.now()
  const trashId = (await db.trash.add({ table, entityIds: ids, label, deletedAt: now })) as number

  await db.table(table).where('id').anyOf(ids).modify({ deletedAt: now })

  useUndoStore.getState().push({
    label,
    undo: async () => {
      await db.transaction('rw', db.table(table), db.trash, async () => {
        await db.table(table).where('id').anyOf(ids).modify({ deletedAt: 0 })
        await db.trash.delete(trashId)
      })
    },
    redo: async () => {
      const redoNow = Date.now()
      await db.transaction('rw', db.table(table), db.trash, async () => {
        await db.trash.add({ table, entityIds: ids, label, deletedAt: redoNow })
        await db.table(table).where('id').anyOf(ids).modify({ deletedAt: redoNow })
      })
    },
  })

  useToastStore.getState().push({
    title: label,
    description: 'Se movió a la papelera. Toca para deshacer.',
    onClick: () => {
      void useUndoStore.getState().undo()
    },
  })
}

/** Devuelve un lote de la papelera a la vida, sin pasar por el diario de deshacer (acción explícita
 * desde la propia página de Papelera, no algo que uno quiera "deshacer" a su vez con Ctrl+Z). */
export async function restoreTrashEntry(trashId: number): Promise<void> {
  const entry = await db.trash.get(trashId)
  if (!entry) return
  await db.transaction('rw', db.table(entry.table), db.trash, async () => {
    await db.table(entry.table).where('id').anyOf(entry.entityIds).modify({ deletedAt: 0 })
    await db.trash.delete(trashId)
  })
}

/** Borra de verdad un lote de la papelera — el único sitio de la app que hace un `delete` real sobre
 * tareas/hábitos/objetivos. Limpia las referencias cruzadas que dejaría colgando un borrado directo:
 * historial de un hábito, y el enlace `goal.taskIds` de cualquier objetivo hacia una tarea purgada. */
export async function purgeTrashEntry(trashId: number): Promise<void> {
  const entry = await db.trash.get(trashId)
  if (!entry) return
  await db.transaction(
    'rw',
    [db.tasks, db.habits, db.habitLogs, db.goals, db.projects, db.trash],
    async () => {
      if (entry.table === 'habits') {
        await db.habitLogs.where('habitId').anyOf(entry.entityIds).delete()
      }
      if (entry.table === 'tasks') {
        const linkedGoals = await db.goals.filter((g) => g.taskIds.some((id) => entry.entityIds.includes(id))).toArray()
        await Promise.all(
          linkedGoals.map((g) =>
            db.goals.update(g.id!, { taskIds: g.taskIds.filter((id) => !entry.entityIds.includes(id)) }),
          ),
        )
      }
      if (entry.table === 'goals') {
        for (const goalId of entry.entityIds) {
          await db.goals.where('parentGoalId').equals(goalId).modify({ parentGoalId: undefined })
        }
      }
      if (entry.table === 'projects') {
        await db.tasks.where('projectId').anyOf(entry.entityIds).modify({ projectId: undefined })
      }
      await db.table(entry.table).where('id').anyOf(entry.entityIds).delete()
      await db.trash.delete(trashId)
    },
  )
}

/** Purga cada lote más viejo que `maxAgeMs` — llamado desde `runDailyMaintenance`. */
export async function purgeExpiredTrash(now: number, maxAgeMs: number): Promise<void> {
  const cutoff = now - maxAgeMs
  const expired = await db.trash.where('deletedAt').below(cutoff).toArray()
  for (const entry of expired) {
    await purgeTrashEntry(entry.id!)
  }
}
