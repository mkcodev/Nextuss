import { useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { Button, ColorPicker, Dialog, FormRow, FormRows, IconButton, IconPicker, NumberInput, Select, TitleField } from '../../design/primitives'
import { DEFAULT_ROUTINE_ICON_KEY, ROUTINE_ICON_KEYS } from '../../design/icons'
import { createRoutine, trashRoutine, updateRoutine } from '../../db/repositories/routines'
import type { RoutineStep, RoutineStepKind } from '../../db/types'
import { DEFAULT_VISUALIZATION_PROMPT, ROUTINE_STEP_KIND_LABELS, ROUTINE_STEP_KIND_ORDER } from './routineStepKinds'
import { ENTITY_COLORS } from '../../lib/colors'
import { cn } from '../../lib/cn'
import { minutesToTime, timeToMinutes, WEEKDAY_LABELS_ES, WEEKDAY_LABELS_ES_FULL, WEEKDAY_ORDER_MON_FIRST } from '../../lib/dates'
import { useSubmitGuard } from '../../lib/useSubmitGuard'
import { useRoutineFormStore } from './routineFormStore'
import { formatMinutes } from './schedule'

const DEFAULT_STEP_MIN = 5

const newStep = (title = '', durationMin = DEFAULT_STEP_MIN): RoutineStep => ({
  id: crypto.randomUUID(),
  title,
  durationMin,
  kind: 'simple',
})

const dayButton = (on: boolean) =>
  cn(
    'grid size-8 place-items-center rounded-sm border text-xs font-medium transition-colors',
    on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:bg-surface-hover hover:text-text',
  )

/** Único diálogo global (montado en AppShell), mismo patrón que `ProjectForm`. */
export function RoutineForm() {
  const { open, routine, close } = useRoutineFormStore()
  const isEdit = !!routine
  const nameRef = useRef<HTMLInputElement>(null)
  const stepRefs = useRef(new Map<string, HTMLInputElement>())
  const timeId = useId()

  const [name, setName] = useState(routine?.name ?? '')
  const [icon, setIcon] = useState<string>(routine?.icon ?? DEFAULT_ROUTINE_ICON_KEY)
  const [color, setColor] = useState(routine?.color ?? ENTITY_COLORS[0])
  const [steps, setSteps] = useState<RoutineStep[]>(routine?.steps.length ? routine.steps : [newStep()])
  const [startTime, setStartTime] = useState(routine?.startTime ?? '')
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? [])
  const [nameError, setNameError] = useState(false)
  const [stepsError, setStepsError] = useState(false)

  const cleanSteps = () => steps.map((s) => ({ ...s, title: s.title.trim() })).filter((s) => s.title)
  const snapshot = () => JSON.stringify([name.trim(), icon, color, cleanSteps(), startTime, weekdays])
  const [initialSnapshot] = useState(snapshot)

  const totalMin = cleanSteps().reduce((sum, s) => sum + s.durationMin, 0)

  const focusStep = (id: string) => requestAnimationFrame(() => stepRefs.current.get(id)?.focus())

  const updateStep = (id: string, changes: Partial<RoutineStep>) => {
    setSteps((list) => list.map((s) => (s.id === id ? { ...s, ...changes } : s)))
    if (stepsError) setStepsError(false)
  }
  const addStepAfter = (index: number) => {
    const step = newStep()
    setSteps((list) => [...list.slice(0, index + 1), step, ...list.slice(index + 1)])
    focusStep(step.id)
  }
  const removeStep = (index: number) => {
    const neighbour = steps[index + 1] ?? steps[index - 1]
    setSteps((list) => (list.length === 1 ? [newStep()] : list.filter((_, i) => i !== index)))
    if (neighbour) focusStep(neighbour.id)
  }
  const moveStep = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= steps.length) return
    const next = [...steps]
    ;[next[index], next[target]] = [next[target], next[index]]
    setSteps(next)
    focusStep(steps[index].id)
  }
  const toggleWeekday = (day: number) =>
    setWeekdays((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day].sort()))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setNameError(true)
      nameRef.current?.focus()
      return
    }
    const finalSteps = cleanSteps()
    if (finalSteps.length === 0) {
      setStepsError(true)
      focusStep(steps[0].id)
      return
    }
    const payload = { name: name.trim(), icon, color, steps: finalSteps, startTime: startTime || undefined, weekdays }
    if (isEdit && routine?.id) await updateRoutine(routine.id, payload)
    else await createRoutine(payload)
    close()
  }
  const [saving, guardedSubmit] = useSubmitGuard(handleSubmit)

  const handleDelete = async () => {
    if (!routine?.id) return
    await trashRoutine(routine.id)
    close()
  }

  return (
    <Dialog open={open} onClose={close} title={isEdit ? 'Editar rutina' : 'Nueva rutina'} size="md" dirty={snapshot() !== initialSnapshot}>
      <form
        onSubmit={guardedSubmit}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault()
            void guardedSubmit(e)
          }
        }}
      >
        <TitleField
          ref={nameRef}
          label="Nombre de la rutina"
          autoFocus={!isEdit}
          value={name}
          onChange={(v) => {
            setName(v)
            if (nameError) setNameError(false)
          }}
          placeholder="Mañana, cerrar el día, arrancar a trabajar…"
          error={nameError ? 'Ponle un nombre para poder guardarla.' : undefined}
        />

        <fieldset className="mt-4 min-w-0">
          <legend className="mb-2 flex w-full items-baseline justify-between text-sm font-medium text-text">
            Pasos
            <span className="text-xs font-normal tabular-nums text-text-muted">
              {totalMin > 0 ? `Total ${formatMinutes(totalMin)}` : 'Sin pasos todavía'}
              {startTime && totalMin > 0 && ` · de ${startTime} a ${minutesToTime(timeToMinutes(startTime) + totalMin)}`}
            </span>
          </legend>
          <ol className="space-y-1.5">
            {steps.map((step, i) => (
              <li key={step.id} className="group flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="w-4 shrink-0 text-right text-xs tabular-nums text-text-faint">
                  {i + 1}
                </span>
                <input
                  ref={(el) => {
                    if (el) stepRefs.current.set(step.id, el)
                    else stepRefs.current.delete(step.id)
                  }}
                  aria-label={`Paso ${i + 1}`}
                  aria-invalid={stepsError && i === 0 ? true : undefined}
                  value={step.title}
                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                      e.preventDefault()
                      addStepAfter(i)
                    } else if (e.key === 'Backspace' && step.title === '' && steps.length > 1) {
                      e.preventDefault()
                      removeStep(i)
                    } else if (e.altKey && e.key === 'ArrowUp') {
                      e.preventDefault()
                      moveStep(i, -1)
                    } else if (e.altKey && e.key === 'ArrowDown') {
                      e.preventDefault()
                      moveStep(i, 1)
                    }
                  }}
                  placeholder={i === 0 ? 'Primer paso, p. ej. «Vestirse»' : 'Siguiente paso'}
                  className="h-8 min-w-0 flex-1 rounded-sm border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent"
                />
                <label className="flex shrink-0 items-center gap-1 text-xs text-text-muted">
                  <NumberInput
                    aria-label={`Minutos del paso ${i + 1}`}
                    value={step.durationMin}
                    onChange={(n) => updateStep(step.id, { durationMin: Math.min(n, 240) })}
                    max={240}
                    className="w-14"
                  />
                  min
                </label>
                <div className="w-28 shrink-0">
                  <Select
                    aria-label={`Tipo del paso ${i + 1}`}
                    value={step.kind ?? 'simple'}
                    onChange={(e) => {
                      const kind = e.target.value as RoutineStepKind
                      updateStep(step.id, { kind, prompt: kind === 'visualization' ? (step.prompt ?? '') : undefined })
                    }}
                    className="h-8 text-xs"
                  >
                    {ROUTINE_STEP_KIND_ORDER.map((kind) => (
                      <option key={kind} value={kind}>
                        {ROUTINE_STEP_KIND_LABELS[kind]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex shrink-0 opacity-60 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton type="button" label="Subir paso" onClick={() => moveStep(i, -1)} disabled={i === 0} className="p-1.5 disabled:opacity-30">
                    <ArrowUp size={14} strokeWidth={1.75} />
                  </IconButton>
                  <IconButton
                    type="button"
                    label="Bajar paso"
                    onClick={() => moveStep(i, 1)}
                    disabled={i === steps.length - 1}
                    className="p-1.5 disabled:opacity-30"
                  >
                    <ArrowDown size={14} strokeWidth={1.75} />
                  </IconButton>
                  <IconButton type="button" label="Quitar paso" onClick={() => removeStep(i)} className="p-1.5 hover:text-danger">
                    <X size={14} strokeWidth={1.75} />
                  </IconButton>
                </div>
              </div>
              {step.kind === 'visualization' && (
                <input
                  aria-label={`Pregunta guía del paso ${i + 1}`}
                  value={step.prompt ?? ''}
                  onChange={(e) => updateStep(step.id, { prompt: e.target.value })}
                  placeholder={DEFAULT_VISUALIZATION_PROMPT}
                  className="ml-6 h-8 min-w-0 rounded-sm border border-border bg-surface px-2.5 text-sm text-text placeholder:text-text-faint focus:border-accent"
                />
              )}
              </li>
            ))}
          </ol>
          {stepsError && <p className="mt-1.5 text-xs text-danger">Añade al menos un paso con nombre.</p>}
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={() => addStepAfter(steps.length - 1)}>
            <Plus size={14} strokeWidth={2} /> Añadir paso
          </Button>
          <p className="mt-1 text-xs text-text-faint">Enter añade otro paso · Alt + flechas lo mueve</p>
        </fieldset>

        <div className="mt-4">
          <FormRows>
            <FormRow label="Hora" htmlFor={timeId} hint="Opcional. A esa hora te avisa y aparece en Hoy.">
              <div className="flex items-center gap-2">
                <input
                  id={timeId}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 rounded-sm border border-border bg-surface px-2 text-sm text-text focus:border-accent"
                />
                {startTime && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setStartTime('')}>
                    Quitar hora
                  </Button>
                )}
              </div>
            </FormRow>
            <FormRow label="Días" top>
              <div role="group" aria-label="Días de la semana" className="flex gap-1">
                {WEEKDAY_ORDER_MON_FIRST.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={weekdays.includes(day)}
                    aria-label={WEEKDAY_LABELS_ES_FULL[day]}
                    title={WEEKDAY_LABELS_ES_FULL[day]}
                    onClick={() => toggleWeekday(day)}
                    className={dayButton(weekdays.includes(day))}
                  >
                    {WEEKDAY_LABELS_ES[day]}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-text-muted">
                {weekdays.length === 0 ? 'Sin marcar ninguno: todos los días.' : `${weekdays.length} ${weekdays.length === 1 ? 'día' : 'días'} a la semana.`}
              </p>
            </FormRow>
            <FormRow label="Icono" top>
              <IconPicker options={ROUTINE_ICON_KEYS} value={icon} onChange={setIcon} label="Icono de la rutina" />
            </FormRow>
            <FormRow label="Color">
              <ColorPicker value={color} onChange={setColor} label="Color de la rutina" />
            </FormRow>
          </FormRows>
        </div>

        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-6 py-3">
          {isEdit ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete()} className="hover:text-danger">
              <Trash2 size={14} strokeWidth={1.75} /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" loading={saving} title="Ctrl + Enter" aria-keyshortcuts="Control+Enter">
              {isEdit ? 'Guardar rutina' : 'Crear rutina'}
              <kbd aria-hidden="true" className="ml-1 rounded-xs border border-current/40 px-1 text-xs font-medium">
                Ctrl&nbsp;↵
              </kbd>
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
