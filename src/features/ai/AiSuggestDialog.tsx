import { useEffect, useId, useState } from 'react'
import { subDays } from 'date-fns'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Button, Checkbox, Dialog, Icon, Textarea } from '../../design/primitives'
import { db } from '../../db/schema'
import { listAttributes } from '../../db/repositories/gamification'
import { createHabit, listHabits } from '../../db/repositories/habits'
import { createTask, getTasksForRange } from '../../db/repositories/tasks'
import { linkTaskToGoal } from '../../db/repositories/goals'
import { createProjectTemplate } from '../../db/repositories/templates'
import { getOrCreateSettings } from '../../db/repositories/settings'
import type { Attribute, HabitType } from '../../db/types'
import { buildEstimateAccuracy } from '../stats/aggregate'
import { DEFAULT_ENTITY_COLOR, ENTITY_COLORS } from '../../lib/colors'
import { dateKey, describeHabitSchedule } from '../../lib/dates'
import { cn } from '../../lib/cn'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import { useToastStore } from '../../lib/toastStore'
import { AiError, recordAiUsage } from './errors'
import type { Subtask } from './prompts'
import type { HabitSuggestion, ProjectTemplateDraft } from './validators'
import { useAiSuggestStore, type AiSuggestRequest } from './aiSuggestStore'

type Picked<T> = T & { picked: boolean }
type Result =
  | { kind: 'habits'; items: Picked<HabitSuggestion>[] }
  | { kind: 'template'; draft: ProjectTemplateDraft; tasks: Picked<Subtask>[] }
  | { kind: 'goalTasks'; goalId: number; items: Picked<Subtask>[] }

const TITLES: Record<AiSuggestRequest['kind'], string> = {
  habits: 'Sugerir hábitos',
  template: 'Generar plantilla de proyecto',
  goalTasks: 'Proponer tareas',
}

const PROMPT_COPY: Record<'habits' | 'template', { label: string; placeholder: string }> = {
  habits: { label: '¿Qué quieres mejorar?', placeholder: 'Dormir mejor y tener más energía por la mañana' },
  template: { label: '¿Qué tipo de proyecto?', placeholder: 'Lanzar un podcast de 10 episodios' },
}

const HABIT_TYPE_LABEL: Record<HabitType, string> = { binary: 'Sí / No', quantity: 'Cantidad', duration: 'Duración', negative: 'A evitar' }

function habitMeta(h: HabitSuggestion): string {
  const measure = h.targetValue != null ? ` · ${h.targetValue} ${h.unit ?? ''}`.trimEnd() : ''
  return `${HABIT_TYPE_LABEL[h.type]}${measure} · ${describeHabitSchedule({ weekdays: h.weekdays }).toLowerCase()}`
}

/** Últimos 6 meses de tareas cerradas: la misma señal de sesgo de estimación que usa «Desglosar». */
async function estimateBias() {
  return buildEstimateAccuracy(await getTasksForRange(dateKey(subDays(new Date(), 180)), dateKey()))
}

async function runRequest(request: AiSuggestRequest, apiKey: string, text: string, attribute: Attribute | null): Promise<Result> {
  const prompts = await import('./prompts')
  if (request.kind === 'habits') {
    const [habits, attributes] = await Promise.all([listHabits(), listAttributes()])
    const items = await prompts.suggestHabits(apiKey, {
      goal: text,
      attribute: attribute?.name,
      existingHabits: habits.map((h) => h.name),
      attributes: attributes.map((a) => ({ id: a.id!, name: a.name })),
    })
    // El área elegida manda sobre la que deduzca el modelo.
    return { kind: 'habits', items: items.map((h) => ({ ...h, attributeId: attribute?.id ?? h.attributeId, picked: true })) }
  }
  if (request.kind === 'template') {
    const draft = await prompts.generateProjectTemplate(apiKey, { description: text, bias: await estimateBias() })
    return { kind: 'template', draft, tasks: draft.tasks.map((t) => ({ ...t, picked: true })) }
  }
  const goal = await db.goals.get(request.goalId)
  if (!goal) throw new AiError('unknown', 'El objetivo ya no existe.')
  const linked = (await db.tasks.bulkGet(goal.taskIds)).filter((t) => t && t.deletedAt === 0)
  const items = await prompts.proposeGoalTasks(apiKey, {
    goal: goal.title,
    notes: goal.notes,
    period: goal.period,
    existingTasks: linked.map((t) => t!.title),
    bias: await estimateBias(),
  })
  return { kind: 'goalTasks', goalId: request.goalId, items: items.map((t) => ({ ...t, picked: true })) }
}

/** Diálogo único de la IA opcional (issue #60): pedir → revisar con casillas y editar → crear.
 * Nada se guarda hasta pulsar el botón principal. Montado una vez en AppShell. */
export function AiSuggestDialog() {
  const { open, request, close } = useAiSuggestStore()
  const promptId = useId()
  const [text, setText] = useState('')
  const [attributes, setAttributes] = useState<Attribute[]>([])
  const [attributeId, setAttributeId] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [goalTitle, setGoalTitle] = useState('')
  const push = useToastStore((s) => s.push)

  const needsPrompt = request?.kind === 'habits' || request?.kind === 'template'

  const generate = async (req: AiSuggestRequest, input: string, attrId: number | null) => {
    setError(null)
    setResult(null)
    setLoading(true)
    try {
      const settings = await getOrCreateSettings()
      const apiKey = settings.claudeApiKey?.trim()
      if (!apiKey) throw new AiError('no-key', 'No hay clave de API configurada en Ajustes.')
      const attribute = attributes.find((a) => a.id === attrId) ?? null
      setResult(await runRequest(req, apiKey, input, attribute))
      void recordAiUsage(settings)
    } catch (err) {
      setError(err instanceof AiError ? err.message : 'Error inesperado al pedir la sugerencia.')
    } finally {
      setLoading(false)
    }
  }

  // Al abrir: estado limpio; «Proponer tareas» no necesita pregunta (el objetivo ya es el contexto).
  useEffect(() => {
    if (!open || !request) return
    setText('')
    setAttributeId(null)
    setError(null)
    setResult(null)
    if (request.kind === 'habits') void listAttributes().then(setAttributes)
    if (request.kind === 'goalTasks') {
      void db.goals.get(request.goalId).then((g) => setGoalTitle(g?.title ?? ''))
      void generate(request, '', null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request])

  const [creating, create] = useSubmitGuard(async () => {
    if (!result) return
    if (result.kind === 'habits') {
      const picked = result.items.filter((h) => h.picked && h.name.trim())
      for (const [i, h] of picked.entries()) {
        await createHabit({
          name: h.name.trim(),
          icon: h.icon,
          color: ENTITY_COLORS[i % ENTITY_COLORS.length],
          type: h.type,
          targetValue: h.targetValue,
          unit: h.unit,
          weekdays: h.weekdays,
          attributeId: h.attributeId,
        })
      }
      push({ title: `${picked.length} hábito${picked.length === 1 ? '' : 's'} creado${picked.length === 1 ? '' : 's'}`, icon: 'sparkles' })
    } else if (result.kind === 'template') {
      const tasks = result.tasks.filter((t) => t.picked && t.title.trim()).map(({ title, estimateMin }) => ({ title: title.trim(), estimateMin }))
      await createProjectTemplate({
        name: result.draft.name.trim() || 'Plantilla',
        color: DEFAULT_ENTITY_COLOR,
        icon: result.draft.icon,
        description: result.draft.description,
        tasks,
      })
      push({ title: 'Plantilla guardada', description: 'Úsala con Ctrl K › Proyecto desde plantilla.', icon: 'sparkles' })
    } else {
      const picked = result.items.filter((t) => t.picked && t.title.trim())
      for (const t of picked) {
        const taskId = await createTask({ title: t.title.trim(), estimateMin: t.estimateMin })
        await linkTaskToGoal(result.goalId, taskId)
      }
      push({ title: `${picked.length} tarea${picked.length === 1 ? '' : 's'} vinculada${picked.length === 1 ? '' : 's'} al objetivo`, icon: 'sparkles' })
    }
    close()
  })

  if (!request) return null

  const pickedCount =
    result?.kind === 'habits'
      ? result.items.filter((h) => h.picked).length
      : result?.kind === 'template'
        ? result.tasks.filter((t) => t.picked).length
        : (result?.items.filter((t) => t.picked).length ?? 0)

  const createLabel =
    result?.kind === 'habits'
      ? `Crear ${pickedCount} hábito${pickedCount === 1 ? '' : 's'}`
      : result?.kind === 'template'
        ? 'Guardar plantilla'
        : `Crear ${pickedCount} tarea${pickedCount === 1 ? '' : 's'}`

  const title = request.kind === 'goalTasks' && goalTitle ? `Tareas para «${goalTitle}»` : TITLES[request.kind]

  return (
    <Dialog open={open} onClose={close} title={title} size="md" dirty={result != null}>
      <div className="space-y-3">
        {needsPrompt && !result && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (text.trim() && !loading) void generate(request, text.trim(), attributeId)
            }}
            className="space-y-3"
          >
            <div>
              <label htmlFor={promptId} className="mb-1 block text-xs font-semibold text-text-muted">
                {PROMPT_COPY[request.kind as 'habits' | 'template'].label}
              </label>
              <Textarea
                id={promptId}
                autoFocus
                rows={2}
                value={text}
                disabled={loading}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    e.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder={PROMPT_COPY[request.kind as 'habits' | 'template'].placeholder}
              />
            </div>
            {request.kind === 'habits' && attributes.length > 0 && (
              <div role="group" aria-label="Área (opcional)" className="flex flex-wrap gap-1.5">
                {attributes.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    aria-pressed={attributeId === a.id}
                    onClick={() => setAttributeId((cur) => (cur === a.id ? null : a.id!))}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs',
                      attributeId === a.id ? 'border-accent bg-accent-soft text-accent' : 'border-border-strong text-text-muted hover:text-text',
                    )}
                  >
                    <Icon name={a.icon} size={12} aria-hidden="true" /> {a.name}
                  </button>
                ))}
              </div>
            )}
            {!loading && (
              <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={close}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!text.trim()}>
                  <Sparkles size={14} strokeWidth={1.75} /> Sugerir
                </Button>
              </div>
            )}
          </form>
        )}

        {loading && (
          <p role="status" className="flex items-center gap-2 py-4 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Pensando propuestas…
          </p>
        )}

        {error && !loading && (
          <div className="space-y-2">
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {error}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={close}>
                Cerrar
              </Button>
              <Button type="button" variant="secondary" onClick={() => void generate(request, text.trim(), attributeId)}>
                <RefreshCw size={14} strokeWidth={1.75} /> Reintentar
              </Button>
            </div>
          </div>
        )}

        {result && !loading && (
          <>
            <p className="text-xs text-text-faint">Revisa y edita antes de crear: nada se guarda todavía.</p>
            {result.kind === 'habits' && (
              <ul className="space-y-1.5">
                {result.items.map((h, i) => (
                  <li key={i} className="flex items-start gap-2.5 rounded-md border border-border px-2.5 py-2">
                    <Checkbox
                      checked={h.picked}
                      aria-label={`Incluir «${h.name}»`}
                      onChange={(e) => setResult({ ...result, items: result.items.map((x, j) => (j === i ? { ...x, picked: e.target.checked } : x)) })}
                      className="mt-1.5"
                    />
                    <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-surface-hover text-text-muted" aria-hidden="true">
                      <Icon name={h.icon} size={15} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <input
                        value={h.name}
                        aria-label="Nombre del hábito"
                        onChange={(e) => setResult({ ...result, items: result.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })}
                        className="field-bare w-full bg-transparent text-sm font-medium text-text"
                      />
                      <p className="text-xs text-text-muted">{habitMeta(h)}</p>
                      {h.reason && <p className="text-xs text-text-faint">{h.reason}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {result.kind === 'template' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-surface-hover text-text-muted" aria-hidden="true">
                    <Icon name={result.draft.icon} size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      value={result.draft.name}
                      aria-label="Nombre de la plantilla"
                      onChange={(e) => setResult({ ...result, draft: { ...result.draft, name: e.target.value } })}
                      className="field-bare w-full bg-transparent text-sm font-medium text-text"
                    />
                    {result.draft.description && <p className="text-xs text-text-muted">{result.draft.description}</p>}
                  </div>
                </div>
                <TaskChecklist
                  items={result.tasks}
                  onChange={(tasks) => setResult({ ...result, tasks })}
                />
              </div>
            )}

            {result.kind === 'goalTasks' && (
              <TaskChecklist items={result.items} onChange={(items) => setResult({ ...result, items })} />
            )}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                className="mr-auto"
                onClick={() => void generate(request, text.trim(), attributeId)}
              >
                <RefreshCw size={14} strokeWidth={1.75} /> Otras ideas
              </Button>
              <Button type="button" variant="ghost" onClick={close}>
                Cancelar
              </Button>
              <Button type="button" loading={creating} disabled={pickedCount === 0} onClick={() => void create()}>
                <Sparkles size={14} strokeWidth={1.75} /> {createLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  )
}

function TaskChecklist({ items, onChange }: { items: Picked<Subtask>[]; onChange: (items: Picked<Subtask>[]) => void }) {
  const update = (i: number, changes: Partial<Picked<Subtask>>) => onChange(items.map((x, j) => (j === i ? { ...x, ...changes } : x)))
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-1.5">
          <Checkbox checked={t.picked} aria-label={`Incluir «${t.title}»`} onChange={(e) => update(i, { picked: e.target.checked })} />
          <input
            value={t.title}
            aria-label={`Tarea ${i + 1}`}
            onChange={(e) => update(i, { title: e.target.value })}
            className={cn('field-bare min-w-0 flex-1 bg-transparent text-sm text-text', !t.picked && 'text-text-faint')}
          />
          <input
            type="number"
            min={5}
            max={480}
            value={t.estimateMin}
            aria-label={`Minutos estimados de la tarea ${i + 1}`}
            onChange={(e) => update(i, { estimateMin: Math.min(480, Math.max(5, Number(e.target.value) || 5)) })}
            className="w-16 shrink-0 rounded-sm border border-border bg-bg-soft px-1.5 py-1 text-right text-xs text-text focus:border-accent"
          />
          <span className="shrink-0 text-xs text-text-faint">min</span>
        </li>
      ))}
    </ul>
  )
}
