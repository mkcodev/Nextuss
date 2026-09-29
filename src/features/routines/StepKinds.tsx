// Cuerpo de los pasos con tipo (#97 PR5): agradecimientos, intención del día, visualización y tarea
// del día. `RoutinePlayer#StepView` los monta en vez del contenido normal cuando `step.kind !==
// 'simple'`. Todo lee/escribe `dailyEntries` para `date` (la fecha de la pasada en curso, ver
// `actions.ts#runDateKey`), con autoguardado — nunca hay un botón "guardar" propio.
import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getDailyEntry, upsertDailyEntry, upsertReflection } from '../../db/repositories/dailyEntries'
import { getOverdueTasks, getTask, getTasksForDate } from '../../db/repositories/tasks'
import type { RoutineStepKind, RoutineStepStyle, Task } from '../../db/types'
import { subDaysKey } from '../../lib/dates'
import { cn } from '../../lib/cn'
import { useDebouncedCallback } from '../../lib/useDebouncedCallback'
import { DEFAULT_VISUALIZATION_PROMPT } from './routineStepKinds'

type TypedKind = Exclude<RoutineStepKind, 'simple'>

const FIELD_CLASS =
  'w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-text-faint focus:border-accent'

function headlineFor(kind: TypedKind, prompt: string | undefined): string {
  switch (kind) {
    case 'gratitude':
      return 'Tres cosas buenas de hoy'
    case 'intention':
      return '¿Qué quieres que hoy tenga de especial?'
    case 'visualization':
      return prompt?.trim() || DEFAULT_VISUALIZATION_PROMPT
    case 'focusTask':
      return 'Elige tu tarea del día'
  }
}

/** 'card' lo pide siempre; 'direct' (por defecto) lo toma prestado solo en los 2 pasos "de ritual"
 * (esteroides acordados con el usuario sobre el mockup); 'journal' nunca lo usa, tiene su propio look. */
function useBigHeadline(kind: TypedKind, style: RoutineStepStyle): boolean {
  if (style === 'card') return true
  if (style === 'journal') return false
  return kind === 'intention' || kind === 'visualization'
}

interface TypedStepBodyProps {
  kind: TypedKind
  prompt: string | undefined
  style: RoutineStepStyle
  date: string
}

export function TypedStepBody({ kind, prompt, style, date }: TypedStepBodyProps) {
  const entry = useLiveQuery(() => getDailyEntry(date), [date])
  const yesterday = useLiveQuery(() => getDailyEntry(subDaysKey(date, 1)), [date])
  const big = useBigHeadline(kind, style)
  const journal = style === 'journal'
  const headline = headlineFor(kind, prompt)

  return (
    <div className="flex w-full flex-col items-center">
      {big ? (
        <p className="max-w-sm text-2xl font-semibold tracking-tight text-balance text-text sm:text-[26px]">{headline}</p>
      ) : (
        <p
          className={cn(
            'text-xs font-medium tracking-wide text-text-muted',
            journal ? 'italic normal-case text-text-muted/90' : 'uppercase',
          )}
        >
          {journal ? journalIntro(kind) : headline}
        </p>
      )}

      <div className={cn('mt-4 w-full max-w-sm', journal && 'rounded-md border border-border bg-surface p-3')}>
        {kind === 'gratitude' && <GratitudeFields date={date} entry={entry} journal={journal} />}
        {kind === 'intention' && <IntentionField date={date} entry={entry} journal={journal} />}
        {kind === 'visualization' && <VisualizationField date={date} prompt={headline} entry={entry} journal={journal} />}
        {kind === 'focusTask' && <FocusTaskPicker date={date} entry={entry} />}
      </div>

      <Echo kind={kind} yesterday={yesterday} />
    </div>
  )
}

function journalIntro(kind: TypedKind): string {
  switch (kind) {
    case 'gratitude':
      return 'Hoy agradezco'
    case 'intention':
      return 'Hoy me propongo —'
    case 'focusTask':
      return 'Mi tarea de hoy —'
    case 'visualization':
      return ''
  }
}

function GratitudeFields({
  date,
  entry,
  journal,
}: {
  date: string
  entry: { gratitudes: string[] } | null | undefined
  journal: boolean
}) {
  const [values, setValues] = useState(['', '', ''])
  const loaded = useRef(false)
  useEffect(() => {
    if (entry && !loaded.current) {
      setValues([entry.gratitudes[0] ?? '', entry.gratitudes[1] ?? '', entry.gratitudes[2] ?? ''])
      loaded.current = true
    }
  }, [entry])

  const save = useDebouncedCallback((next: string[]) => {
    void upsertDailyEntry(date, { gratitudes: next.map((v) => v.trim()).filter(Boolean) })
  }, 500)

  const setAt = (i: number, v: string) => {
    const next = [...values]
    next[i] = v
    setValues(next)
    save(next)
  }

  return (
    <div className="space-y-2">
      {values.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className={cn('w-4 shrink-0 text-right text-xs tabular-nums', journal ? 'text-accent font-semibold' : 'text-text-faint')}>
            {i + 1}
          </span>
          <input
            aria-label={`Agradecimiento ${i + 1}`}
            value={v}
            onChange={(e) => setAt(i, e.target.value)}
            placeholder="…"
            className={cn(FIELD_CLASS, journal && 'border-0 border-b border-border-strong bg-transparent rounded-none px-1')}
          />
        </div>
      ))}
    </div>
  )
}

function IntentionField({
  date,
  entry,
  journal,
}: {
  date: string
  entry: { intention?: string; intentionSetAt?: number } | null | undefined
  journal: boolean
}) {
  const [value, setValue] = useState('')
  const loaded = useRef(false)
  useEffect(() => {
    if (entry && !loaded.current) {
      setValue(entry.intention ?? '')
      loaded.current = true
    }
  }, [entry])

  const save = useDebouncedCallback((text: string) => {
    const trimmed = text.trim()
    void upsertDailyEntry(date, {
      intention: trimmed || undefined,
      intentionSetAt: trimmed ? (entry?.intentionSetAt ?? Date.now()) : undefined,
    })
  }, 500)

  return (
    <input
      aria-label="Intención del día"
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        save(e.target.value)
      }}
      placeholder="Escribe tu intención…"
      className={cn(
        FIELD_CLASS,
        'text-center text-base',
        journal && 'border-0 border-b border-border-strong bg-transparent rounded-none',
      )}
    />
  )
}

function VisualizationField({
  date,
  prompt,
  entry,
  journal,
}: {
  date: string
  prompt: string
  entry: { reflections: { prompt: string; answer: string }[] } | null | undefined
  journal: boolean
}) {
  const [value, setValue] = useState('')
  const loaded = useRef(false)
  useEffect(() => {
    if (entry && !loaded.current) {
      setValue(entry.reflections.find((r) => r.prompt === prompt)?.answer ?? '')
      loaded.current = true
    }
  }, [entry, prompt])

  const save = useDebouncedCallback((text: string) => {
    if (text.trim()) void upsertReflection(date, prompt, text.trim())
  }, 600)

  return (
    <textarea
      aria-label="Respuesta a la visualización"
      rows={2}
      value={value}
      onChange={(e) => {
        setValue(e.target.value)
        save(e.target.value)
      }}
      placeholder="Escribe si te ayuda (opcional)…"
      className={cn(FIELD_CLASS, 'resize-none', journal && 'border-0 border-b border-border-strong bg-transparent rounded-none')}
    />
  )
}

function FocusTaskPicker({ date, entry }: { date: string; entry: { focusTaskId?: number } | null | undefined }) {
  const today = date
  const candidates = useLiveQuery(async () => {
    const [todays, overdue] = await Promise.all([getTasksForDate(today), getOverdueTasks(today)])
    const byId = new Map<number, Task>()
    for (const t of [...overdue, ...todays.filter((t) => t.status !== 'done')]) if (t.id != null) byId.set(t.id, t)
    return [...byId.values()]
  }, [today])

  if (candidates == null) return null
  if (candidates.length === 0) return <p className="text-sm text-text-muted">No tienes tareas para hoy todavía.</p>

  return (
    <div className="flex flex-col gap-1.5">
      {candidates.map((t) => {
        const selected = entry?.focusTaskId === t.id
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => void upsertDailyEntry(date, { focusTaskId: t.id })}
            className={cn(
              'flex items-center gap-2 rounded-sm border px-3 py-2 text-left text-sm transition-colors',
              selected ? 'border-accent bg-accent-soft text-text' : 'border-border text-text hover:bg-surface-hover',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-3.5 shrink-0 rounded-full border-[1.5px]',
                selected ? 'border-accent bg-accent shadow-[inset_0_0_0_3px_var(--color-bg)]' : 'border-border-strong',
              )}
            />
            <span className="min-w-0 flex-1 truncate">{t.title}</span>
          </button>
        )
      })}
    </div>
  )
}

function Echo({
  kind,
  yesterday,
}: {
  kind: TypedKind
  yesterday:
    | { gratitudes: string[]; intention?: string; intentionKept: boolean | null; focusTaskId?: number }
    | null
    | undefined
}) {
  const focusTask = useLiveQuery(
    () => (kind === 'focusTask' && yesterday?.focusTaskId != null ? getTask(yesterday.focusTaskId) : undefined),
    [kind, yesterday?.focusTaskId],
  )

  if (!yesterday) return null
  let text: string | null = null
  if (kind === 'gratitude') {
    const list = yesterday.gratitudes.filter(Boolean)
    if (list.length) text = `Ayer: "${list.join('", "')}"`
  } else if (kind === 'intention' && yesterday.intention) {
    const kept = yesterday.intentionKept === true ? ' · cumplida' : yesterday.intentionKept === false ? ' · no cumplida' : ''
    text = `Ayer: "${yesterday.intention}"${kept}`
  } else if (kind === 'focusTask' && focusTask) {
    text = `Ayer: ${focusTask.title}`
  }
  if (!text) return null
  return <p className="mt-3 text-xs italic text-text-faint">{text}</p>
}
