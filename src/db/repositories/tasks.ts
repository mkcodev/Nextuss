import { db } from '../schema'
import type { Task } from '../types'
import { withUndo } from '../undoable'
import { trashRows } from '../trash'
import { compareByPriorityThenSortKey } from '../../lib/priority'
import { xpForTaskCompletion } from '../../lib/xp'
import { LEVEL_ACHIEVEMENT_THRESHOLDS, TASK_COUNT_ACHIEVEMENT_THRESHOLDS } from '../../lib/achievementThresholds'
import { applyAttributeXpDelta, applyXpDelta, unlockAchievement } from './gamification'
import { handleRecurringCompletion } from './recurrence'

export async function getTasksForDate(date: string): Promise<Task[]> {
  const tasks = await db.tasks.where('scheduledDate').equals(date).toArray()
  return tasks.filter((t) => t.deletedAt === 0)
}

export async function getTasksForRange(startDate: string, endDate: string): Promise<Task[]> {
  const tasks = await db.tasks.where('scheduledDate').between(startDate, endDate, true, true).toArray()
  return tasks.filter((t) => t.deletedAt === 0)
}

/** Tasks with no time slot today: not scheduled anywhere, or due today but not yet placed on the
 * timeline. Excludes subtasks of a still-alive parent — those render nested under it instead
 * (`TaskRow`/`TaskForm`'s checklist), never flat and duplicated. An orphan subtask (parent trashed
 * or purged) still surfaces here so it's never silently unreachable. */
export async function getUnscheduledTasks(today: string): Promise<Task[]> {
  const candidates = await db.tasks
    .where('[deletedAt+status]')
    .anyOf([
      [0, 'planned'],
      [0, 'backlog'],
      [0, 'inbox'],
    ])
    .toArray()
  const withSlot = candidates.filter(
    (t) =>
      !t.scheduledStart &&
      (!t.scheduledDate || t.scheduledDate === today) &&
      (t.status !== 'inbox' || t.dueDate === today),
  )
  const parentIds = [...new Set(withSlot.map((t) => t.parentId).filter((id): id is number => id != null))]
  const parents = parentIds.length ? await db.tasks.bulkGet(parentIds) : []
  const aliveParentIds = new Set(parents.filter((p) => p && p.deletedAt === 0).map((p) => p!.id))
  return withSlot
    .filter((t) => t.parentId == null || !aliveParentIds.has(t.parentId))
    .sort(compareByPriorityThenSortKey)
}

/** Subtareas vivas de una tarea, en orden de creación. */
export async function getSubtasks(parentId: number): Promise<Task[]> {
  const children = await db.tasks.where('parentId').equals(parentId).toArray()
  return children.filter((t) => t.deletedAt === 0).sort((a, b) => a.sortKey - b.sortKey)
}

export async function getSubtaskProgress(parentId: number): Promise<{ done: number; total: number }> {
  const children = await getSubtasks(parentId)
  return { done: children.filter((t) => t.status === 'done').length, total: children.length }
}

export function getTask(id: number) {
  return db.tasks.get(id)
}

export async function createTask(
  input: Partial<
    Omit<Task, 'id' | 'createdAt' | 'postponedCount' | 'deletedAt' | 'sortKey' | 'tagIds' | 'xpAwarded'>
  > & {
    title: string
    tagIds?: number[]
  },
): Promise<number> {
  const id = (await db.tasks.add({
    status: 'planned',
    postponedCount: 0,
    createdAt: Date.now(),
    deletedAt: 0,
    sortKey: Date.now(),
    tagIds: [],
    xpAwarded: 0,
    ...input,
  })) as number
  return id
}

export function updateTask(id: number, changes: Partial<Omit<Task, 'id'>>) {
  return db.tasks.update(id, changes)
}

/** Reordenado manual (Fase 8.4): coloca `taskId` entre los dos `sortKey` vecinos que ya tiene la
 * posición de destino. `sortKey` es un `number` sin más garantía que el orden, así que un punto
 * medio flotante basta para insertar entre dos filas sin tener que renumerar la tabla entera. */
export function moveTaskBetween(taskId: number, beforeSortKey: number | null, afterSortKey: number | null) {
  let sortKey: number
  if (beforeSortKey == null && afterSortKey == null) sortKey = Date.now()
  else if (beforeSortKey == null) sortKey = afterSortKey! - 1000
  else if (afterSortKey == null) sortKey = beforeSortKey + 1000
  else sortKey = (beforeSortKey + afterSortKey) / 2
  return db.tasks.update(taskId, { sortKey })
}

async function collectTaskSubtreeIds(id: number): Promise<number[]> {
  const ids = [id]
  const children = await db.tasks.where('parentId').equals(id).toArray()
  for (const child of children) {
    if (child.id != null && child.deletedAt === 0) ids.push(...(await collectTaskSubtreeIds(child.id)))
  }
  return ids
}

/** Mueve la tarea y todo su subárbol de subtareas (`parentId`) a la papelera de una sola vez, tras
 * un único deshacer. `goal.taskIds` no se toca aquí: si la tarea sigue en la papelera pero no se ha
 * purgado, sigue "recuperable", así que el enlace al objetivo se conserva y vuelve a funcionar solo
 * en cuanto se deshace o se restaura (ver `computeGoalSegments`, que ya ignora tareas en papelera). */
export async function trashTask(id: number): Promise<void> {
  const task = await db.tasks.get(id)
  if (!task) return
  const ids = await collectTaskSubtreeIds(id)
  await trashRows('tasks', ids, `Tarea eliminada: "${task.title}"`)
}

export function scheduleTask(
  id: number,
  scheduledDate: string,
  scheduledStart: string,
  scheduledEnd: string,
) {
  return db.tasks.update(id, { scheduledDate, scheduledStart, scheduledEnd, status: 'planned' })
}

/** Mismo `scheduleTask`, pero deshacible con Ctrl+Z — un arrastre en el timeline es solo una
 * actualización de `scheduledDate`/`scheduledStart`/`scheduledEnd`, así que el envoltorio genérico
 * de `undoable.ts` basta sin escribir una inversa a mano. */
export async function scheduleTaskWithUndo(
  id: number,
  scheduledDate: string,
  scheduledStart: string,
  scheduledEnd: string,
): Promise<void> {
  await withUndo('Tarea reprogramada', [{ table: 'tasks', ids: [id] }], async () => {
    await scheduleTask(id, scheduledDate, scheduledStart, scheduledEnd)
  })
}

export function unscheduleTask(id: number) {
  return db.tasks.update(id, {
    scheduledDate: undefined,
    scheduledStart: undefined,
    scheduledEnd: undefined,
  })
}

export const ZOMBIE_THRESHOLD = 3

/** Tasks scheduled before `today` that are still open — surfaced so they don't silently rot on a past day. */
export async function getOverdueTasks(today: string): Promise<Task[]> {
  const candidates = await db.tasks
    .where('[deletedAt+status]')
    .anyOf([
      [0, 'inbox'],
      [0, 'backlog'],
      [0, 'planned'],
    ])
    .toArray()
  return candidates
    .filter((t) => t.scheduledDate && t.scheduledDate < today)
    .sort((a, b) => (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? ''))
}

/** Moves an overdue task to today, clearing its old time slot and counting the postponement.
 *  Con deshacer, como el resto de reprogramaciones (antes era la única que no lo tenía). */
export async function carryOverToToday(id: number, today: string) {
  const task = await db.tasks.get(id)
  if (!task) return
  await withUndo('Tarea movida a hoy', [{ table: 'tasks', ids: [id] }], async () => {
    await db.tasks.update(id, {
      scheduledDate: today,
      scheduledStart: undefined,
      scheduledEnd: undefined,
      postponedCount: task.postponedCount + 1,
    })
  })
}

/** Aparca una tarea (Fase 12, la acción real que faltaba para "delegarla"): la saca por completo
 * del calendario y la manda a backlog — a diferencia de `carryOverToToday`, **resetea**
 * `postponedCount` en vez de incrementarlo, porque decidir conscientemente que no toca hoy no es
 * la misma "promesa rota" que un `postponedCount` cuenta. Envuelta con `withUndo` como cualquier
 * otra reprogramación real. */
export async function parkTask(id: number): Promise<void> {
  await withUndo('Tarea aparcada', [{ table: 'tasks', ids: [id] }], async () => {
    await db.tasks.update(id, {
      scheduledDate: undefined,
      scheduledStart: undefined,
      scheduledEnd: undefined,
      status: 'backlog',
      postponedCount: 0,
    })
  })
}

// --- Edición en lote (Fase 13.3) ---------------------------------------------------------------
// `withUndo` ya acepta un array de ids por tabla y los snapshotea/restaura de una sola vez, así que
// las cuatro acciones no destructivas de abajo son todas el mismo envoltorio de una línea sobre
// `bulkModify` — no hace falta reinventar el deshacer por cada una.

async function bulkModify(ids: number[], label: string, modifier: (task: Task) => void): Promise<void> {
  await withUndo(label, [{ table: 'tasks', ids }], async () => {
    await db.tasks.where('id').anyOf(ids).modify(modifier)
  })
}

export const setPriorityBulk = (ids: number[], priority: number) =>
  bulkModify(ids, `Prioridad actualizada en ${ids.length} tarea${ids.length === 1 ? '' : 's'}`, (t) => {
    t.priority = priority
  })

export const moveToProjectBulk = (ids: number[], projectId: number | undefined) =>
  bulkModify(ids, `Proyecto actualizado en ${ids.length} tarea${ids.length === 1 ? '' : 's'}`, (t) => {
    t.projectId = projectId
  })

/** Fusiona la etiqueta en el `tagIds` de cada tarea en vez de sobrescribirlo — cada una puede
 * tener ya un subconjunto distinto de etiquetas. */
export const addTagBulk = (ids: number[], tagId: number) =>
  bulkModify(ids, `Etiqueta añadida a ${ids.length} tarea${ids.length === 1 ? '' : 's'}`, (t) => {
    if (!t.tagIds.includes(tagId)) t.tagIds = [...t.tagIds, tagId]
  })

export const parkTasksBulk = (ids: number[]) =>
  bulkModify(ids, `${ids.length} tarea${ids.length === 1 ? '' : 's'} aparcada${ids.length === 1 ? '' : 's'}`, (t) => {
    t.scheduledDate = undefined
    t.scheduledStart = undefined
    t.scheduledEnd = undefined
    t.status = 'backlog'
    t.postponedCount = 0
  })

/** Reprograma varias tareas a `date` de una vez (Hoy → "Mover todas a mañana"): quita la franja
 * horaria y cuenta el aplazamiento, igual que `carryOverToToday` pero para un lote y con deshacer. */
export const moveTasksToDateBulk = (ids: number[], date: string) =>
  bulkModify(ids, `${ids.length} tarea${ids.length === 1 ? '' : 's'} movida${ids.length === 1 ? '' : 's'}`, (t) => {
    t.scheduledDate = date
    t.scheduledStart = undefined
    t.scheduledEnd = undefined
    t.postponedCount = t.postponedCount + 1
  })

/** Papelera en lote: une el subárbol de subtareas de cada tarea seleccionada (mismo
 * `collectTaskSubtreeIds` que ya usa `trashTask`) en un solo lote/un solo deshacer, en vez de N
 * lotes separados. */
export async function trashTasksBulk(ids: number[]): Promise<void> {
  const allIds = new Set<number>()
  for (const id of ids) {
    const subtree = await collectTaskSubtreeIds(id)
    for (const sid of subtree) allIds.add(sid)
  }
  await trashRows('tasks', [...allIds], `${ids.length} tarea${ids.length === 1 ? '' : 's'} eliminada${ids.length === 1 ? '' : 's'}`)
}

/** Non-done tasks, most recently scheduled/created first — used by the focus timer's task picker. */
export async function listActiveTasks(): Promise<Task[]> {
  const all = await db.tasks.where('status').notEqual('done').toArray()
  return all
    .filter((t) => t.deletedAt === 0)
    .sort((a, b) => (b.scheduledDate ?? '').localeCompare(a.scheduledDate ?? '') || b.createdAt - a.createdAt)
    .slice(0, 50)
}

/** Todas las tareas vivas, sin tope y sin excluir `done` (Fase 13.2) — a diferencia de
 * `listActiveTasks`, pensada para la vista de tareas global, no para un selector acotado. */
export async function listAllTasks(): Promise<Task[]> {
  const all = await db.tasks.toArray()
  return all.filter((t) => t.deletedAt === 0)
}

export async function addActualMinutes(id: number, minutes: number) {
  const task = await db.tasks.get(id)
  if (!task) return
  await db.tasks.update(id, { actualMin: (task.actualMin ?? 0) + minutes })
}

export interface ToggleTaskResult {
  done: boolean
  xpDelta: number
  leveledUp: boolean
  newLevel: number
  unlockedAchievements: string[]
}

/** Delta reversible como `setHabitLog`/`toggleGoalDone` (Fase 8.6): desmarcar devuelve exactamente el
 * XP que la tarea concedió (`xpAwarded`, persistido en la propia fila), no lo que las constantes
 * actuales dirían hoy. Solo puntúan las tareas raíz — una subtarea cambia de estado sin XP propio. */
export async function toggleTaskDone(id: number): Promise<ToggleTaskResult> {
  return db.transaction(
    'rw',
    [db.tasks, db.projects, db.progress, db.attributes, db.achievements, db.recurrenceRules],
    async () => {
      const task = await db.tasks.get(id)
      if (!task) throw new Error(`Task ${id} not found`)

      const done = task.status !== 'done'
      const isRoot = task.parentId == null
      let xpDelta = 0
      let xpAwarded = task.xpAwarded

      if (isRoot) {
        if (done) {
          xpAwarded = xpForTaskCompletion(task.priority)
          xpDelta = xpAwarded
        } else {
          xpDelta = -task.xpAwarded
          xpAwarded = 0
        }
      }

      await db.tasks.update(id, {
        status: done ? 'done' : 'planned',
        completedAt: done ? Date.now() : undefined,
        xpAwarded,
      })

      let leveledUp = false
      let newLevel = 1
      if (xpDelta !== 0) {
        const xpResult = await applyXpDelta(xpDelta)
        leveledUp = xpResult.leveledUp
        newLevel = xpResult.level
        if (task.projectId) {
          const project = await db.projects.get(task.projectId)
          if (project?.attributeId) await applyAttributeXpDelta(project.attributeId, xpDelta)
        }
      }

      const unlockedAchievements: string[] = []
      const tryUnlock = async (key: string) => {
        if (await unlockAchievement(key)) unlockedAchievements.push(key)
      }

      if (isRoot && done) {
        await tryUnlock('first_task')
        const doneRoots = (await db.tasks.where('[deletedAt+status]').equals([0, 'done']).toArray()).filter(
          (t) => t.parentId == null,
        )
        for (const t of TASK_COUNT_ACHIEVEMENT_THRESHOLDS) {
          if (doneRoots.length >= t.count) await tryUnlock(t.key)
        }
      }

      if (leveledUp) {
        for (const t of LEVEL_ACHIEVEMENT_THRESHOLDS) {
          if (newLevel >= t.level) await tryUnlock(t.key)
        }
      }

      if (isRoot && done && task.recurrenceId) await handleRecurringCompletion(task)

      return { done, xpDelta, leveledUp, newLevel, unlockedAchievements }
    },
  )
}
