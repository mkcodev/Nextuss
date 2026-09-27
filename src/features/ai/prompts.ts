// Prompts de IA (Fase 5.4): cada función pide salida estructurada vía tool use forzado y valida el
// resultado antes de devolverlo — nunca se escribe en la base de datos lo que el modelo devuelve sin
// pasar por el `validate` de `callTool`.
import { AiError, callTool, type Anthropic } from './client'
import {
  validateCapture,
  validateDayPlan,
  validateGoalTasks,
  validateHabitSuggestions,
  validateProjectTemplate,
  validateSubtasks,
  validateSummary,
  type HabitSuggestion,
  type ProjectTemplateDraft,
} from './validators'
import { ICON_LABELS, ICON_REGISTRY, type IconKey } from '../../design/icons'
import type { AiModel, EnergyLevel, GoalPeriod } from '../../db/types'
import type { EstimateAccuracyResult, PeriodSummary } from '../stats/aggregate'

export interface Subtask {
  title: string
  estimateMin: number
}

function biasNote(bias: EstimateAccuracyResult): string {
  return bias.sampleSize >= 5 && bias.medianRatio
    ? `El usuario suele tardar x${bias.medianRatio.toFixed(2)} de lo que estima en sus tareas — ajusta las estimaciones a esa realidad, no a un ideal.`
    : 'Todavía no hay datos suficientes del sesgo de estimación del usuario — estima de forma realista.'
}

export async function breakdownTask(
  apiKey: string,
  model: AiModel,
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


  const subtasks = await callTool({
    apiKey,
    model,
    effort: 'medium',
    system:
      'Eres un asistente de productividad para una persona con TDAH. Desglosas tareas en subtareas pequeñas, ' +
      'concretas y accionables — nunca vagas ("investigar", "pensar en"), siempre con un verbo de acción claro ' +
      'y un resultado verificable.',
    user: `Tarea: "${task.title}"${task.notes ? `\nNotas: ${task.notes}` : ''}\n\n${biasNote(bias)}\n\nDesglósala en entre 2 y 8 subtareas.`,
    tool,
    validate: validateSubtasks,
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

export async function parseQuickCapture(apiKey: string, model: AiModel, text: string, today: string): Promise<ParsedCapture> {
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
    model,
    effort: 'low',
    system:
      'Extraes tareas estructuradas de notas rápidas en español, escritas al vuelo por una persona con TDAH. ' +
      'Solo rellenas un campo si el texto lo menciona explícita o muy claramente implícito; nunca inventas.',
    user: `Nota: "${text}"`,
    tool,
    validate: validateCapture,
  })
}

export async function summarizeWeeklyReview(apiKey: string, model: AiModel, summary: PeriodSummary, weekKey: string): Promise<string> {
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
    model,
    effort: 'low',
    system:
      'Resumes semanas reales de un usuario con TDAH a partir de sus métricas, con tono cercano y honesto — ' +
      'nunca paternalista ni con frases motivacionales genéricas.',
    user,
    tool,
    validate: validateSummary,
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
  model: AiModel,
  input: {
    capacityMin: number
    checkIn?: { energy: number | null; mood: number | null; focus: number | null }
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
    ? `Check-in de hoy: energía ${input.checkIn.energy ?? 'sin especificar'}/5, ánimo ${input.checkIn.mood ?? 'sin especificar'}/5, foco ${input.checkIn.focus ?? 'sin especificar'}/5.`
    : 'Sin check-in de hoy todavía.'

  const validIds = new Set(input.tasks.map((t) => t.id))

  return callTool({
    apiKey,
    model,
    effort: 'low',
    system:
      'Planificas el día de una persona con TDAH. Eres realista con la capacidad y la energía disponibles, no ' +
      'optimista — si la energía es baja, prioriza tareas ligeras y aplaza las que requieren mucha energía.',
    user: `Capacidad disponible hoy: ${input.capacityMin} min.\n${checkInNote}\n\nTareas candidatas:\n${taskList}\n\nOrdénalas y decide cuáles no caben hoy.`,
    tool,
    validate: (raw) => validateDayPlan(raw, validIds),
  })
}

// --- Issue #60: sugerir hábitos, generar plantillas de proyecto y proponer tareas de un objetivo ---

const ICON_KEYS = Object.keys(ICON_REGISTRY) as IconKey[]
/** El modelo elige el icono por su clave, con el nombre en español como pista ("book: Libro"). */
const ICON_HINT = ICON_KEYS.map((k) => `${k}: ${ICON_LABELS[k]}`).join(', ')

const ADHD_SYSTEM =
  'Ayudas a una persona con TDAH a organizarse en una app de productividad. Propones cosas pequeñas, concretas y ' +
  'realistas — mejor poco y sostenible que mucho y ambicioso. Escribes en español, títulos cortos con un verbo claro.'

const taskItemSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'Tarea accionable con verbo claro y resultado verificable' },
    estimateMin: { type: 'integer', minimum: 5, maximum: 480 },
  },
  required: ['title', 'estimateMin'],
  additionalProperties: false,
}

export async function suggestHabits(
  apiKey: string,
  model: AiModel,
  input: { goal: string; attribute?: string; existingHabits: string[]; attributes: { id: number; name: string }[] },
): Promise<HabitSuggestion[]> {
  const tool: Anthropic.Tool = {
    name: 'suggest_habits',
    description: 'Propone hábitos nuevos que ayuden a lo que el usuario quiere mejorar.',
    input_schema: {
      type: 'object',
      properties: {
        habits: {
          type: 'array',
          minItems: 2,
          maxItems: 5,
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nombre corto del hábito, p. ej. "Leer 10 páginas"' },
              icon: { type: 'string', enum: ICON_KEYS },
              type: {
                type: 'string',
                enum: ['binary', 'quantity', 'duration', 'negative'],
                description: 'binary = sí/no; quantity = cantidad con unidad; duration = minutos; negative = algo a evitar',
              },
              targetValue: { type: ['integer', 'null'], description: 'Meta diaria para quantity/duration; null en los demás' },
              unit: { type: ['string', 'null'], description: 'Unidad para quantity (vasos, páginas…); "min" para duration; null en los demás' },
              weekdays: {
                type: 'array',
                items: { type: 'integer', minimum: 0, maximum: 6 },
                description: 'Días de la semana (0=domingo … 6=sábado); vacío = todos los días',
              },
              attribute: { type: ['string', 'null'], description: 'Nombre exacto de uno de los atributos del usuario, o null' },
              reason: { type: 'string', description: 'Una frase breve: por qué ayuda' },
            },
            required: ['name', 'icon', 'type', 'targetValue', 'unit', 'weekdays', 'attribute', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['habits'],
      additionalProperties: false,
    },
    strict: true,
  }

  const user =
    `Quiero: ${input.goal}\n` +
    (input.attribute ? `Área de vida: ${input.attribute}\n` : '') +
    `Hábitos que ya tengo (no los repitas): ${input.existingHabits.join(', ') || 'ninguno'}\n` +
    `Mis atributos: ${input.attributes.map((a) => a.name).join(', ') || 'ninguno'}\n` +
    `Iconos disponibles: ${ICON_HINT}\n\n` +
    'Propón entre 2 y 5 hábitos nuevos, empezando por el más fácil de mantener.'

  return callTool({
    apiKey,
    model,
    effort: 'low',
    system: ADHD_SYSTEM,
    user,
    tool,
    validate: (raw) => validateHabitSuggestions(raw, { existingNames: input.existingHabits, attributes: input.attributes }),
  })
}

export async function generateProjectTemplate(
  apiKey: string,
  model: AiModel,
  input: { description: string; bias: EstimateAccuracyResult },
): Promise<ProjectTemplateDraft> {
  const tool: Anthropic.Tool = {
    name: 'project_template',
    description: 'Genera una plantilla de proyecto reutilizable: nombre y lista ordenada de tareas.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre corto y genérico de la plantilla' },
        icon: { type: 'string', enum: ICON_KEYS },
        description: { type: 'string', description: 'Una frase: para qué sirve la plantilla' },
        tasks: { type: 'array', minItems: 3, maxItems: 15, items: taskItemSchema },
      },
      required: ['name', 'icon', 'description', 'tasks'],
      additionalProperties: false,
    },
    strict: true,
  }

  return callTool({
    apiKey,
    model,
    effort: 'medium',
    system: ADHD_SYSTEM,
    user:
      `Proyecto: ${input.description}\n${biasNote(input.bias)}\nIconos disponibles: ${ICON_HINT}\n\n` +
      'Crea una plantilla reutilizable: tareas en el orden en que se harían, cada una de menos de medio día.',
    tool,
    validate: validateProjectTemplate,
  })
}

const PERIOD_LABEL: Record<GoalPeriod, string> = { week: 'esta semana', month: 'este mes' }

export async function proposeGoalTasks(
  apiKey: string,
  model: AiModel,
  input: { goal: string; notes?: string; period: GoalPeriod; existingTasks: string[]; bias: EstimateAccuracyResult },
): Promise<Subtask[]> {
  const tool: Anthropic.Tool = {
    name: 'propose_goal_tasks',
    description: 'Propone las siguientes tareas concretas para avanzar hacia un objetivo.',
    input_schema: {
      type: 'object',
      properties: { tasks: { type: 'array', minItems: 2, maxItems: 8, items: taskItemSchema } },
      required: ['tasks'],
      additionalProperties: false,
    },
    strict: true,
  }

  return callTool({
    apiKey,
    model,
    effort: 'medium',
    system: ADHD_SYSTEM,
    user:
      `Objetivo para ${PERIOD_LABEL[input.period]}: "${input.goal}"` +
      (input.notes ? `\nNotas: ${input.notes}` : '') +
      `\nTareas ya vinculadas (no las repitas): ${input.existingTasks.join(', ') || 'ninguna'}\n${biasNote(input.bias)}\n\n` +
      'Propón entre 2 y 8 tareas que quepan en ese plazo, en el orden en que conviene hacerlas.',
    tool,
    validate: (raw) => validateGoalTasks(raw, input.existingTasks),
  })
}
