// Validadores de la salida del modelo (Fase 20: extraídos de `prompts.ts` para poder testearlos).
// Es la frontera donde lo que devuelve la IA llega a la base de datos: aquí se normaliza todo y se
// descarta lo que no encaja, nunca se confía en el esquema del tool.
import { AiError } from './errors'
import { ICON_REGISTRY, type IconKey } from '../../design/icons'
import type { HabitType, TemplateChild } from '../../db/types'
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

const clampEstimate = (v: unknown) => Math.min(480, Math.max(5, Math.round(Number(v) || 30)))
const iconOr = (v: unknown, fallback: IconKey): IconKey => (typeof v === 'string' && v in ICON_REGISTRY ? (v as IconKey) : fallback)
const norm = (s: string) => s.trim().toLocaleLowerCase('es')
const items = (raw: unknown, key: string): Record<string, unknown>[] => {
  const list = ((raw ?? {}) as Record<string, unknown>)[key]
  if (!Array.isArray(list)) throw new AiError('malformed', 'Respuesta con forma inesperada.')
  return list.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
}

export interface HabitSuggestion {
  name: string
  icon: IconKey
  type: HabitType
  targetValue?: number
  unit?: string
  /** 0=domingo..6=sábado; [] = todos los días (misma convención que `Habit.weekdays`). */
  weekdays: number[]
  attributeId?: number
  reason: string
}

const HABIT_TYPES: HabitType[] = ['binary', 'quantity', 'duration', 'negative']

/** Descarta los que ya existen (por nombre) y los repetidos; los atributos se resuelven por nombre
 * contra los del usuario — nunca se crea uno nuevo por lo que diga el modelo. */
export function validateHabitSuggestions(
  raw: unknown,
  ctx: { existingNames: string[]; attributes: { id: number; name: string }[] },
): HabitSuggestion[] {
  const seen = new Set(ctx.existingNames.map(norm))
  const attrByName = new Map(ctx.attributes.map((a) => [norm(a.name), a.id]))
  const out: HabitSuggestion[] = []
  for (const h of items(raw, 'habits')) {
    const name = String(h.name ?? '').trim().slice(0, 60)
    if (!name || seen.has(norm(name))) continue
    seen.add(norm(name))
    const type = HABIT_TYPES.includes(h.type as HabitType) ? (h.type as HabitType) : 'binary'
    const measured = type === 'quantity' || type === 'duration'
    const target = Math.round(Number(h.targetValue))
    const days = Array.isArray(h.weekdays)
      ? [...new Set(h.weekdays.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
      : []
    out.push({
      name,
      icon: iconOr(h.icon, 'target'),
      type,
      targetValue: measured ? Math.min(1000, Math.max(1, Number.isFinite(target) ? target : 1)) : undefined,
      unit: measured ? String(h.unit ?? '').trim().slice(0, 20) || (type === 'duration' ? 'min' : undefined) : undefined,
      weekdays: days.length === 7 ? [] : days,
      attributeId: typeof h.attribute === 'string' ? attrByName.get(norm(h.attribute)) : undefined,
      reason: String(h.reason ?? '').trim().slice(0, 140),
    })
  }
  if (out.length === 0) throw new AiError('malformed', 'No hay sugerencias nuevas: puede que ya tengas hábitos parecidos.')
  return out.slice(0, 6)
}

export interface ProjectTemplateDraft {
  name: string
  icon: IconKey
  description?: string
  tasks: Required<TemplateChild>[]
}

export function validateProjectTemplate(raw: unknown): ProjectTemplateDraft {
  const p = (raw ?? {}) as Record<string, unknown>
  const name = String(p.name ?? '').trim().slice(0, 80)
  if (!name) throw new AiError('malformed', 'La plantilla no tiene nombre.')
  const tasks = items(raw, 'tasks')
    .map((t) => ({ title: String(t.title ?? '').trim().slice(0, 120), estimateMin: clampEstimate(t.estimateMin) }))
    .filter((t) => t.title.length > 0)
    .slice(0, 15)
  if (tasks.length === 0) throw new AiError('malformed', 'La plantilla no tiene tareas.')
  const description = String(p.description ?? '').trim().slice(0, 200) || undefined
  return { name, icon: iconOr(p.icon, 'folder'), description, tasks }
}

/** Como `validateSubtasks`, pero sin repetir tareas que ya están vinculadas al objetivo. */
export function validateGoalTasks(raw: unknown, existingTitles: string[]): Subtask[] {
  const seen = new Set(existingTitles.map(norm))
  const out: Subtask[] = []
  for (const t of items(raw, 'tasks')) {
    const title = String(t.title ?? '').trim().slice(0, 120)
    if (!title || seen.has(norm(title))) continue
    seen.add(norm(title))
    out.push({ title, estimateMin: clampEstimate(t.estimateMin) })
  }
  if (out.length === 0) throw new AiError('malformed', 'No se propuso ninguna tarea nueva.')
  return out.slice(0, 8)
}
