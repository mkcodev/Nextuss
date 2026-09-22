// Prompts de IA (Fase 5.4): cada función pide salida estructurada vía tool use forzado y valida el
// resultado antes de devolverlo — nunca se escribe en la base de datos lo que el modelo devuelve sin
// pasar por el `validate` de `callTool`.
import { AiError, callTool, type Anthropic } from './client'
import type { EnergyLevel } from '../../db/types'
import type { EstimateAccuracyResult, PeriodSummary } from '../stats/aggregate'

export interface Subtask {
  title: string
  estimateMin: number
}

export async function breakdownTask(
  apiKey: string,
  task: { title: string; notes?: string },
  bias: EstimateAccuracyResult,
): Promise<Subtask[]> {
  const tool: Anthropic.Tool = {
    name: 'propose_subtasks',
    description: 'Propone una lista de subtareas concretas y accionables para completar la tarea.',
    input_schema: {
      type: 'object',
      properties: {
        subtasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Título corto y accionable de la subtarea' },
              estimateMin: { type: 'integer', description: 'Minutos estimados', minimum: 5, maximum: 480 },
            },
            required: ['title', 'estimateMin'],
            additionalProperties: false,
          },
          minItems: 2,
          maxItems: 8,
        },
      },
      required: ['subtasks'],
      additionalProperties: false,
    },
    strict: true,
  }

  const biasNote =
    bias.sampleSize >= 5 && bias.medianRatio
      ? `El usuario suele tardar x${bias.medianRatio.toFixed(2)} de lo que estima en sus tareas — ajusta las estimaciones a esa realidad, no a un ideal.`
      : 'Todavía no hay datos suficientes del sesgo de estimación del usuario — estima de forma realista.'

  const subtasks = await callTool({
    apiKey,
    effort: 'medium',
    system:
      'Eres un asistente de productividad para una persona con TDAH. Desglosas tareas en subtareas pequeñas, ' +
      'concretas y accionables — nunca vagas ("investigar", "pensar en"), siempre con un verbo de acción claro ' +
      'y un resultado verificable.',
    user: `Tarea: "${task.title}"${task.notes ? `\nNotas: ${task.notes}` : ''}\n\n${biasNote}\n\nDesglósala en entre 2 y 8 subtareas.`,
    tool,
    validate: (raw) => {
      const parsed = raw as { subtasks?: unknown }
      if (!Array.isArray(parsed.subtasks)) throw new AiError('malformed', 'Respuesta con forma inesperada.')
      return parsed.subtasks
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map((s) => ({
          title: String(s.title ?? '').trim(),
          estimateMin: Math.min(480, Math.max(5, Math.round(Number(s.estimateMin) || 30))),
        }))
        .filter((s) => s.title.length > 0)
        .slice(0, 8)
    },
  })
  if (subtasks.length === 0) throw new AiError('malformed', 'El modelo no propuso ninguna subtarea válida.')
  return subtasks
}

export interface ParsedCapture {
  title: string
  scheduledDate?: string
  energy?: EnergyLevel
  estimateMin?: number
}

export async function parseQuickCapture(apiKey: string, text: string, today: string): Promise<ParsedCapture> {
  const tool: Anthropic.Tool = {
    name: 'parse_task',
    description: 'Extrae una tarea estructurada a partir de una nota en lenguaje natural.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título limpio de la tarea, sin la fecha/hora ya extraída' },
        scheduledDate: {
          type: ['string', 'null'],
          description: `Fecha 'YYYY-MM-DD' si el texto menciona una (hoy es ${today}), o null si no se menciona ninguna.`,
        },
        energy: { type: ['string', 'null'], enum: ['low', 'medium', 'high', null] },
        estimateMin: { type: ['integer', 'null'], minimum: 5, maximum: 480 },
      },
      required: ['title', 'scheduledDate', 'energy', 'estimateMin'],
      additionalProperties: false,
    },
    strict: true,
  }

  return callTool({
    apiKey,
    effort: 'low',
    system:
      'Extraes tareas estructuradas de notas rápidas en español, escritas al vuelo por una persona con TDAH. ' +
      'Solo rellenas un campo si el texto lo menciona explícita o muy claramente implícito; nunca inventas.',
    user: `Nota: "${text}"`,
    tool,
    validate: (raw) => {
      const p = raw as Record<string, unknown>
      const title = String(p.title ?? '').trim()
      if (!title) throw new AiError('malformed', 'No se pudo extraer un título.')
      const scheduledDate = typeof p.scheduledDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.scheduledDate) ? p.scheduledDate : undefined
      const energy = p.energy === 'low' || p.energy === 'medium' || p.energy === 'high' ? p.energy : undefined
      const estimateMin =
        typeof p.estimateMin === 'number' && p.estimateMin > 0 ? Math.min(480, Math.max(5, Math.round(p.estimateMin))) : undefined
      return { title, scheduledDate, energy, estimateMin }
    },
  })
}

export async function summarizeWeeklyReview(apiKey: string, summary: PeriodSummary, weekKey: string): Promise<string> {
  const tool: Anthropic.Tool = {
    name: 'weekly_summary',
    description: 'Genera un resumen breve y honesto de cómo fue la semana, a partir de métricas reales.',
    input_schema: {
      type: 'object',
      properties: { summary: { type: 'string', description: '2-4 frases, tono cercano, sin inventar datos no dados' } },
      required: ['summary'],
      additionalProperties: false,
    },
    strict: true,
  }

  const user =
    `Semana ${weekKey}:\n` +
    `- Días activos: ${summary.activeDays}\n` +
    `- Cumplimiento de hábitos: ${Math.round(summary.complianceRatio * 100)}%\n` +
    `- Tareas completadas: ${summary.tasksCompleted}\n` +
    `- Minutos de foco: ${summary.focusMin}\n` +
    `- XP ganado: ${summary.xp}\n\n` +
    'Escribe un resumen breve (2-4 frases) de cómo fue la semana, con tono cercano y honesto. No inventes datos que no se han dado.'

  return callTool({
    apiKey,
    effort: 'low',
    system:
      'Resumes semanas reales de un usuario con TDAH a partir de sus métricas, con tono cercano y honesto — ' +
      'nunca paternalista ni con frases motivacionales genéricas.',
    user,
    tool,
    validate: (raw) => {
      const p = raw as Record<string, unknown>
      const summaryText = String(p.summary ?? '').trim()
      if (!summaryText) throw new AiError('malformed', 'Resumen vacío.')
      return summaryText
    },
  })
}

export interface DayPlanTaskInput {
  id: number
  title: string
  estimateMin?: number
  energy?: EnergyLevel
}

export interface DayPlanSuggestion {
  orderedTaskIds: number[]
  deferTaskIds: number[]
  note: string
}

export async function suggestDayPlan(
  apiKey: string,
  input: {
    capacityMin: number
    checkIn?: { energy: number; mood: number; focus: number }
    tasks: DayPlanTaskInput[]
  },
): Promise<DayPlanSuggestion> {
  const tool: Anthropic.Tool = {
    name: 'suggest_plan',
    description: 'Sugiere un orden razonable para las tareas de hoy dada la capacidad disponible, y cuáles conviene aplazar.',
    input_schema: {
      type: 'object',
      properties: {
        orderedTaskIds: { type: 'array', items: { type: 'integer' }, description: 'IDs en el orden sugerido para hoy' },
        deferTaskIds: { type: 'array', items: { type: 'integer' }, description: 'IDs que no caben hoy y conviene aplazar' },
        note: { type: 'string', description: 'Una frase explicando el criterio usado' },
      },
      required: ['orderedTaskIds', 'deferTaskIds', 'note'],
      additionalProperties: false,
    },
    strict: true,
  }

  const taskList = input.tasks
    .map((t) => `- id=${t.id} "${t.title}" (${t.estimateMin ?? '?'} min, energía=${t.energy ?? 'sin especificar'})`)
    .join('\n')
  const checkInNote = input.checkIn
    ? `Check-in de hoy: energía ${input.checkIn.energy}/5, ánimo ${input.checkIn.mood}/5, foco ${input.checkIn.focus}/5.`
    : 'Sin check-in de hoy todavía.'

  const validIds = new Set(input.tasks.map((t) => t.id))

  return callTool({
    apiKey,
    effort: 'low',
    system:
      'Planificas el día de una persona con TDAH. Eres realista con la capacidad y la energía disponibles, no ' +
      'optimista — si la energía es baja, prioriza tareas ligeras y aplaza las que requieren mucha energía.',
    user: `Capacidad disponible hoy: ${input.capacityMin} min.\n${checkInNote}\n\nTareas candidatas:\n${taskList}\n\nOrdénalas y decide cuáles no caben hoy.`,
    tool,
    validate: (raw) => {
      const p = raw as Record<string, unknown>
      const ordered = (Array.isArray(p.orderedTaskIds) ? p.orderedTaskIds : []).map(Number).filter((id) => validIds.has(id))
      const defer = (Array.isArray(p.deferTaskIds) ? p.deferTaskIds : [])
        .map(Number)
        .filter((id) => validIds.has(id) && !ordered.includes(id))
      const note = String(p.note ?? '').trim()
      if (ordered.length === 0 && defer.length === 0) throw new AiError('malformed', 'Sin sugerencia utilizable.')
      return { orderedTaskIds: ordered, deferTaskIds: defer, note }
    },
  })
}
