// Backfills puros por versión de esquema — uno por cada `.upgrade()` en `schema.ts` que cambia la
// forma de una fila. Extraídos aquí para que `schema.ts` (el Dexie real, dentro de una `tx`) y
// `backup.ts` (un JS plano al restaurar un backup más antiguo que la app) apliquen exactamente la
// misma lógica sin duplicarla. Sin esto, `importDatabase` tendría que rechazar cualquier backup de
// una versión anterior — con seis migraciones por delante eso invalidaría todos los backups reales.
import type { Goal, HabitLog, Task } from './types'

export function migrateHabitLogV3(log: Partial<HabitLog>): void {
  if (!log.loggedAt) log.loggedAt = Date.now()
}

export function migrateGoalV4(g: Partial<Goal>): void {
  if (g.isPriority === undefined) g.isPriority = false
  if (!g.createdAt) g.createdAt = Date.now()
  if (!Array.isArray(g.taskIds)) g.taskIds = []
  if (g.done && !g.completedAt) g.completedAt = Date.now()
}

/**
 * `deletedAt`/`sortKey` en `tasks`/`habits`/`goals` (v6). `sortKey` se asigna denso (huecos de 1000)
 * ordenando por `createdAt`, no copiando el timestamp tal cual, para dejar sitio a insertar entre dos
 * filas sin renumerar todo cuando llegue el reordenado manual (Fase 8.4).
 */
export function backfillTrashFields(rows: Array<{ deletedAt?: number; sortKey?: number; createdAt?: number }>): void {
  const ordered = [...rows].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0))
  ordered.forEach((row, i) => {
    if (row.deletedAt === undefined) row.deletedAt = 0
    if (row.sortKey === undefined) row.sortKey = i * 1000
  })
}

/** `tagIds` en `tasks` (v8) — etiquetas y proyectos reales, Fase 8.3. */
export function backfillTaskTagIdsV8(task: Partial<Task>): void {
  if (!Array.isArray(task.tagIds)) task.tagIds = []
}

/** `xpAwarded` en `tasks` (v9) — XP por tareas, Fase 8.6. Todas las tareas existentes arrancan en 0:
 * `Progress.totalXp` es monótono y ningún nivel guardado se invalida con el upgrade. */
export function backfillTaskXpAwardedV9(task: Partial<Task>): void {
  if (typeof task.xpAwarded !== 'number') task.xpAwarded = 0
}

const TRASHABLE_TABLES = ['tasks', 'habits', 'goals'] as const

/**
 * Aplica en memoria, en orden, cada backfill que quedó entre `fromVersion` (exclusiva) y la versión
 * actual de la app sobre el blob `tables` de un backup — para que `importDatabase` pueda aceptar un
 * backup más viejo que la app en vez de rechazarlo.
 */
export function applyMigrationsToBackupTables(tables: Record<string, unknown[]>, fromVersion: number): void {
  if (fromVersion < 3 && tables.habitLogs) {
    for (const log of tables.habitLogs) migrateHabitLogV3(log as Partial<HabitLog>)
  }
  if (fromVersion < 4 && tables.goals) {
    for (const g of tables.goals) migrateGoalV4(g as Partial<Goal>)
  }
  if (fromVersion < 6) {
    delete tables.events
    for (const name of TRASHABLE_TABLES) {
      if (tables[name]) backfillTrashFields(tables[name] as never[])
    }
  }
  if (fromVersion < 8 && tables.tasks) {
    for (const t of tables.tasks) backfillTaskTagIdsV8(t as Partial<Task>)
  }
  if (fromVersion < 9 && tables.tasks) {
    for (const t of tables.tasks) backfillTaskXpAwardedV9(t as Partial<Task>)
  }
}
