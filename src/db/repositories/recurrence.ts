// Tareas recurrentes (Fase 9). Las ocurrencias son filas `Task` normales con `recurrenceId` +
// `occurrenceDate` — no una entidad aparte — así que heredan gratis todo lo que ya existe para
// tareas: papelera/deshacer, XP, subtareas, prioridad, etiquetas. Este módulo solo añade la
// generación (idempotente vía `[recurrenceId+occurrenceDate]`) y las dos formas de editar una serie.
import { addDays } from 'date-fns'
import { db } from '../schema'
import type { RecurrenceRule, Task } from '../types'
import { createTask } from './tasks'
import { trashRows } from '../trash'
import { occurrencesInRange, nextCompletionOccurrence } from '../../lib/recurrence'
import { dateKey, parseDateKey, todayKey } from '../../lib/dates'

const HORIZON_DAYS = 28

export function listRecurrenceRules(): Promise<RecurrenceRule[]> {
  return db.recurrenceRules.toArray()
}

/** `null` (no `undefined`) si no existe: `undefined` queda reservado para "cargando" en `useLiveQuery`. */
export async function getRecurrenceRule(id: number): Promise<RecurrenceRule | null> {
  return (await db.recurrenceRules.get(id)) ?? null
}

function taskPayloadFromRule(rule: RecurrenceRule, occurrenceDate: string) {
  return {
    title: rule.title,
    notes: rule.notes,
    energy: rule.energy,
    estimateMin: rule.estimateMin,
    priority: rule.priority,
    color: rule.color,
    tagIds: rule.tagIds,
    projectId: rule.projectId,
    scheduledDate: occurrenceDate,
    scheduledStart: rule.scheduledStart,
    recurrenceId: rule.id,
    occurrenceDate,
  }
}

async function occurrenceExists(recurrenceId: number, occurrenceDate: string): Promise<boolean> {
  const existing = await db.tasks
    .where('[recurrenceId+occurrenceDate]')
    .equals([recurrenceId, occurrenceDate])
    .first()
  return !!existing
}

/** Genera, para una regla concreta, las ocurrencias de modo `schedule` que caigan entre `fromDate` y
 * `fromDate + horizonDays`. Comprueba existencia antes de crear cada una — es lo que hace la función
 * idempotente frente a llamadas repetidas (StrictMode monta `main.tsx` dos veces en desarrollo). */
async function generateOccurrencesForRule(ruleId: number, fromDate: string, horizonDays: number): Promise<void> {
  const rule = await db.recurrenceRules.get(ruleId)
  if (!rule) return
  const toDate = dateKey(addDays(parseDateKey(fromDate), horizonDays))
  const dates = occurrencesInRange(rule, fromDate, toDate)
  for (const date of dates) {
    if (await occurrenceExists(ruleId, date)) continue
    await createTask(taskPayloadFromRule(rule, date))
  }
}

/** Punto de entrada llamado una vez al día desde `runDailyMaintenance` (Fase 7.3): rellena el
 * horizonte de 28 días de toda regla en modo `schedule` (las de modo `completion` no se tocan aquí,
 * se generan reactivamente al completar la ocurrencia anterior, ver `handleRecurringCompletion`).
 * Las ocurrencias pasadas que se saltaron nunca se generan: `fromDate` siempre es "hoy", nunca
 * `rule.startDate` — volver de vacaciones no produce un alud de tareas atrasadas. */
export async function generateUpcomingOccurrences(today: string = todayKey()): Promise<void> {
  const rules = await db.recurrenceRules.where('mode').equals('schedule').toArray()
  for (const rule of rules) {
    if (rule.id != null) await generateOccurrencesForRule(rule.id, today, HORIZON_DAYS)
  }
}

/** Crea la regla y genera de inmediato su primera ocurrencia — así el usuario ve la tarea aparecer al
 * momento en vez de esperar al mantenimiento diario. En modo `schedule` eso significa rellenar el
 * horizonte de 28 días; en modo `completion` no hay rango que rellenar (la siguiente solo se genera
 * reactivamente al completar), así que se siembra una única ocurrencia en `max(startDate, today)` —
 * sin ella la serie nunca arrancaría, no habría nada que completar para disparar la segunda. `today`
 * inyectable (por defecto "hoy" real) para que sea testeable de forma determinista, igual que
 * `runDailyMaintenance`/`calculateStreak`. */
export async function createRecurrenceRule(
  input: Omit<RecurrenceRule, 'id' | 'createdAt'>,
  today: string = todayKey(),
): Promise<number> {
  const id = (await db.recurrenceRules.add({ ...input, createdAt: Date.now() })) as number
  if (input.mode === 'schedule') {
    await generateOccurrencesForRule(id, today, HORIZON_DAYS)
  } else {
    const rule = await db.recurrenceRules.get(id)
    if (rule) await createTask(taskPayloadFromRule(rule, rule.startDate > today ? rule.startDate : today))
  }
  return id
}

/** Llamado tras completar (no descompletar) una ocurrencia en modo `completion` — genera la
 * siguiente, desplazada desde la fecha real de finalización, no desde la fecha que tenía programada
 * esta ocurrencia. No hace nada si la tarea no pertenece a una serie, si la regla ya no existe (se
 * detuvo la serie), o si la serie no es de modo `completion`. */
export async function handleRecurringCompletion(task: Task, today: string = todayKey()): Promise<void> {
  if (!task.recurrenceId) return
  const rule = await db.recurrenceRules.get(task.recurrenceId)
  if (!rule || rule.mode !== 'completion' || rule.id == null) return
  const nextDate = nextCompletionOccurrence(rule, today)
  if (!nextDate) return
  if (await occurrenceExists(rule.id, nextDate)) return
  await createTask(taskPayloadFromRule(rule, nextDate))
}

/** Desvincula una ocurrencia de su serie: queda como una tarea normal, ya no cuenta para la
 * generación futura ni se toca si luego se edita "esta y futuras" desde otra ocurrencia. */
export function detachOccurrence(taskId: number) {
  return db.tasks.update(taskId, { recurrenceId: undefined, occurrenceDate: undefined })
}

async function futurePendingOccurrences(ruleId: number, today: string): Promise<Task[]> {
  const occurrences = await db.tasks.where('recurrenceId').equals(ruleId).toArray()
  return occurrences.filter((t) => t.deletedAt === 0 && t.status !== 'done' && (t.occurrenceDate ?? '') >= today)
}

/** "Editar esta y futuras": actualiza la plantilla de la regla, manda a la papelera las ocurrencias
 * futuras aún no completadas (una de ellas puede ser la que se está editando ahora mismo) y vuelve a
 * generar el horizonte a partir de la plantilla ya actualizada. Las ocurrencias pasadas o ya
 * completadas no se tocan — son historial, no se reescriben con efecto retroactivo. */
export async function updateRuleAndFutureOccurrences(
  ruleId: number,
  changes: Partial<Omit<RecurrenceRule, 'id' | 'createdAt'>>,
  today: string = todayKey(),
): Promise<void> {
  await db.recurrenceRules.update(ruleId, changes)
  const future = await futurePendingOccurrences(ruleId, today)
  if (future.length) await trashRows('tasks', future.map((t) => t.id!), 'Serie recurrente actualizada')
  await generateOccurrencesForRule(ruleId, today, HORIZON_DAYS)
}

/** Detiene la serie por completo: borra la regla (no lleva papelera propia, es solo metadatos de
 * generación) y desvincula cualquier ocurrencia futura aún no completada, que pasa a ser una tarea
 * normal en vez de desaparecer. Las ocurrencias pasadas/completadas conservan su `recurrenceId`
 * como historial inerte — la regla ya no existe, pero nada las lee por ese campo salvo la propia
 * generación, que ya no se ejecutará para un `ruleId` borrado. */
export async function stopRecurrence(ruleId: number, today: string = todayKey()): Promise<void> {
  const future = await futurePendingOccurrences(ruleId, today)
  for (const t of future) await detachOccurrence(t.id!)
  await db.recurrenceRules.delete(ruleId)
}
