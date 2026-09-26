// Validadores de la salida del modelo (Fase 20: extraídos de `prompts.ts` para poder testearlos).
// Es la frontera donde lo que devuelve la IA llega a la base de datos: aquí se normaliza todo y se
// descarta lo que no encaja, nunca se confía en el esquema del tool.
import { AiError } from './errors'
import type { DayPlanSuggestion, ParsedCapture, Subtask } from './prompts'

export function validateSubtasks(raw: unknown): Subtask[] {
  const parsed = (raw ?? {}) as { subtasks?: unknown }
  if (!Array.isArray(parsed.subtasks)) throw new AiError('malformed', 'Respuesta con forma inesperada.')
  return parsed.subtasks
    .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
    .map((s) => ({
      title: String(s.title ?? '').trim(),
      estimateMin: Math.min(480, Math.max(5, Math.round(Number(s.estimateMin) || 30))),
    }))
    .filter((s) => s.title.length > 0)
    .slice(0, 8)
}

export function validateCapture(raw: unknown): ParsedCapture {
  const p = (raw ?? {}) as Record<string, unknown>
  const title = String(p.title ?? '').trim()
  if (!title) throw new AiError('malformed', 'No se pudo extraer un título.')
  const scheduledDate = typeof p.scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.scheduledDate) ? p.scheduledDate : undefined
  const energy = p.energy === 'low' || p.energy === 'medium' || p.energy === 'high' ? p.energy : undefined
  const estimateMin =
    typeof p.estimateMin === 'number' && p.estimateMin > 0 ? Math.min(480, Math.max(5, Math.round(p.estimateMin))) : undefined
  return { title, scheduledDate, energy, estimateMin }
}

export function validateSummary(raw: unknown): string {
  const p = (raw ?? {}) as Record<string, unknown>
  const summaryText = String(p.summary ?? '').trim()
  if (!summaryText) throw new AiError('malformed', 'Resumen vacío.')
  return summaryText
}

/** Solo acepta ids de las tareas que se enviaron; un id en ambas listas se queda en `ordered`. */
export function validateDayPlan(raw: unknown, validIds: Set<number>): DayPlanSuggestion {
  const p = (raw ?? {}) as Record<string, unknown>
  const ordered = (Array.isArray(p.orderedTaskIds) ? p.orderedTaskIds : []).map(Number).filter((id) => validIds.has(id))
  const defer = (Array.isArray(p.deferTaskIds) ? p.deferTaskIds : [])
    .map(Number)
    .filter((id) => validIds.has(id) && !ordered.includes(id))
  const note = String(p.note ?? '').trim()
  if (ordered.length === 0 && defer.length === 0) throw new AiError('malformed', 'Sin sugerencia utilizable.')
  return { orderedTaskIds: ordered, deferTaskIds: defer, note }
}
