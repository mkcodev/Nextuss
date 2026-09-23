import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Calendar, Clock, Flag, Hourglass, Loader2, Sparkles, Tag, Target } from 'lucide-react'
import { Button, Dialog, Input, Kbd } from '../../design/primitives'
import { quickParse } from '../../lib/quickParse'
import { foldText } from '../../lib/text'
import { minutesToTime, timeToMinutes, todayKey } from '../../lib/dates'
import { createTask } from '../../db/repositories/tasks'
import { linkTaskToGoal, listOpenGoals } from '../../db/repositories/goals'
import { findOrCreateTag } from '../../db/repositories/tags'
import { useQuickAddStore } from './quickAddStore'
import { useTaskFormStore } from './taskFormStore'
import { useAiAvailable } from '../ai/useAiAvailable'
import { parseQuickCapture, type ParsedCapture } from '../ai/prompts'
import { AiError, recordAiUsage } from '../ai/client'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useToastStore } from '../../lib/toastStore'

const PRIORITY_COLORS: Record<number, string> = {
  1: 'text-danger',
  2: 'text-warning',
  3: 'text-accent',
  4: 'text-text-faint',
}

const WEEKDAY_LABEL = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' })

function formatDateChip(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  return WEEKDAY_LABEL.format(new Date(y, m - 1, d))
}

/** Caja única de quick-add (Fase 8.1): parsea la fecha/hora/prioridad/duración/etiqueta/objetivo en
 * el propio texto, sin abrir ningún formulario. `Tab` abre el formulario completo prellenado. */
export function QuickAddDialog() {
  const { open, close } = useQuickAddStore()
  const openFullForm = useTaskFormStore((s) => s.openCreate)
  const { available: aiAvailable } = useAiAvailable()
  const push = useToastStore((s) => s.push)

  const [text, setText] = useState('')
  const [aiResult, setAiResult] = useState<ParsedCapture | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const parsed = useMemo(() => quickParse(text), [text])
  const openGoals = useLiveQuery(() => listOpenGoals(), []) ?? []
  const matchedGoal = parsed.goalQuery
    ? openGoals.find(
        (g) =>
          foldText(g.title).includes(foldText(parsed.goalQuery!)) ||
          foldText(parsed.goalQuery!).includes(foldText(g.title)),
      )
    : undefined

  const finalTitle = aiResult?.title ?? parsed.title
  const finalScheduledDate = aiResult?.scheduledDate ?? parsed.scheduledDate
  const finalEstimateMin = aiResult?.estimateMin ?? parsed.estimateMin
  const finalEnergy = aiResult?.energy

  const reset = () => {
    setText('')
    setAiResult(null)
  }

  const handleClose = () => {
    reset()
    close()
  }

  const handleCreate = async () => {
    if (!finalTitle.trim()) return
    const scheduledEnd = parsed.scheduledStart
      ? minutesToTime(timeToMinutes(parsed.scheduledStart) + (finalEstimateMin ?? 30))
      : undefined
    const tagIds = await Promise.all(parsed.tagNames.map((name) => findOrCreateTag(name)))
    const id = await createTask({
      title: finalTitle.trim(),
      scheduledDate: finalScheduledDate,
      scheduledStart: parsed.scheduledStart,
      scheduledEnd,
      priority: parsed.priority,
      estimateMin: finalEstimateMin,
      energy: finalEnergy,
      tagIds,
    })
    if (matchedGoal?.id) await linkTaskToGoal(matchedGoal.id, id)
    handleClose()
  }

  const handleTab = () => {
    openFullForm({
      title: finalTitle.trim() || undefined,
      scheduledDate: finalScheduledDate,
      scheduledStart: parsed.scheduledStart,
      estimateMin: finalEstimateMin,
      energy: finalEnergy,
      priority: parsed.priority,
    })
    handleClose()
  }

  const reinforceWithAi = async () => {
    if (!text.trim()) return
    setAiLoading(true)
    try {
      const settings = await getOrCreateSettings()
      const apiKey = settings.claudeApiKey?.trim()
      if (!apiKey) return
      const result = await parseQuickCapture(apiKey, text, todayKey())
      void recordAiUsage(settings)
      setAiResult(result)
    } catch (err) {
      push({ title: 'No se pudo interpretar con IA', description: err instanceof AiError ? err.message : undefined })
    } finally {
      setAiLoading(false)
    }
  }

  const hasPreview =
    finalScheduledDate || parsed.scheduledStart || parsed.priority || finalEstimateMin || parsed.tagNames.length > 0 || parsed.goalQuery

  return (
    <Dialog open={open} onClose={handleClose} title="Tarea rápida">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleCreate()
        }}
        className="space-y-3"
      >
        <Input
          autoFocus
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setAiResult(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Tab') {
              e.preventDefault()
              handleTab()
            }
          }}
          placeholder="Ej. Preparar demo mañana 10:00 !2 45m #trabajo @lanzamiento"
          className="!py-2.5 !text-sm"
        />

        {hasPreview && (
          <div className="flex flex-wrap gap-1.5">
            {finalScheduledDate && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted">
                <Calendar size={11} strokeWidth={1.75} /> {formatDateChip(finalScheduledDate)}
              </span>
            )}
            {parsed.scheduledStart && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted">
                <Clock size={11} strokeWidth={1.75} /> {parsed.scheduledStart}
              </span>
            )}
            {parsed.priority && (
              <span
                className={`flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-medium ${PRIORITY_COLORS[parsed.priority]}`}
              >
                <Flag size={11} strokeWidth={1.75} /> P{parsed.priority}
              </span>
            )}
            {finalEstimateMin != null && (
              <span className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted">
                <Hourglass size={11} strokeWidth={1.75} />
                {finalEstimateMin < 60 ? `${finalEstimateMin} min` : `${finalEstimateMin / 60} h`}
              </span>
            )}
            {parsed.tagNames.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted"
              >
                <Tag size={11} strokeWidth={1.75} /> {tag}
              </span>
            ))}
            {parsed.goalQuery && (
              <span
                className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] ${
                  matchedGoal ? 'border-accent bg-accent-soft text-accent' : 'border-border bg-surface text-text-faint'
                }`}
              >
                <Target size={11} strokeWidth={1.75} /> {matchedGoal ? matchedGoal.title : `sin coincidencia: ${parsed.goalQuery}`}
              </span>
            )}
          </div>
        )}

        {aiAvailable && (
          <button
            type="button"
            onClick={reinforceWithAi}
            disabled={aiLoading || !text.trim()}
            className="flex items-center gap-1.5 text-xs font-medium text-accent hover:underline disabled:opacity-50"
          >
            {aiLoading ? <Loader2 size={13} className="animate-spin" strokeWidth={1.75} /> : <Sparkles size={13} strokeWidth={1.75} />}
            Interpretar con IA
          </button>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="flex items-center gap-1 text-[11px] text-text-faint">
            <Kbd>Tab</Kbd> formulario completo
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!finalTitle.trim()}>
              Crear tarea
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
