import { useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Button, Card } from '../../design/primitives'
import { getTask, getUnscheduledTasks } from '../../db/repositories/tasks'
import { getCheckInForDate } from '../../db/repositories/checkins'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useDailyCapacity } from '../planner/useDailyCapacity'
import { useAiAvailable } from './useAiAvailable'
import { suggestDayPlan, type DayPlanSuggestion as DayPlanResult } from './prompts'
import { AiError, recordAiUsage } from './client'
import { useTaskFormStore } from '../tasks/taskFormStore'

interface DayPlanSuggestionProps {
  date: string
}

export function DayPlanSuggestion({ date }: DayPlanSuggestionProps) {
  const { available } = useAiAvailable()
  const { availableMin, scheduledMin } = useDailyCapacity(date)
  const openEdit = useTaskFormStore((s) => s.openEdit)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<DayPlanResult | null>(null)
  const [byId, setById] = useState<Record<number, string>>({})

  if (!available) return null

  const run = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const settings = await getOrCreateSettings()
      const apiKey = settings.claudeApiKey?.trim()
      if (!apiKey) return
      const [tasks, checkIn] = await Promise.all([getUnscheduledTasks(date), getCheckInForDate(date)])
      if (tasks.length === 0) {
        setError('No hay tareas sin planificar hoy.')
        return
      }
      const plan = await suggestDayPlan(apiKey, {
        capacityMin: Math.max(0, availableMin - scheduledMin),
        checkIn:
          checkIn && (checkIn.energy != null || checkIn.mood != null || checkIn.focus != null)
            ? { energy: checkIn.energy, mood: checkIn.mood, focus: checkIn.focus }
            : undefined,
        tasks: tasks.map((t) => ({ id: t.id!, title: t.title, estimateMin: t.estimateMin, energy: t.energy })),
      })
      void recordAiUsage(settings)
      setById(Object.fromEntries(tasks.map((t) => [t.id!, t.title])))
      setResult(plan)
    } catch (err) {
      setError(err instanceof AiError ? err.message : 'Error inesperado.')
    } finally {
      setLoading(false)
    }
  }

  const openTask = async (id: number) => {
    const task = await getTask(id)
    if (task) openEdit(task)
  }

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
          <Sparkles size={13} strokeWidth={1.75} /> Plan del día con IA
        </h3>
        <Button variant="ghost" onClick={run} disabled={loading} className="h-6 px-2 py-0 text-[11px]">
          {loading ? <Loader2 size={12} className="animate-spin" /> : 'Sugerir'}
        </Button>
      </div>

      {error && <p className="mt-2 text-[11px] text-text-faint">{error}</p>}

      {result && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] text-text-faint">{result.note}</p>
          {result.orderedTaskIds.length > 0 && (
            <ol className="space-y-1">
              {result.orderedTaskIds.map((id, i) => (
                <li key={id}>
                  <button
                    onClick={() => openTask(id)}
                    className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left text-xs text-text hover:bg-surface-hover"
                  >
                    <span className="text-text-faint">{i + 1}.</span>
                    <span className="truncate">{byId[id]}</span>
                  </button>
                </li>
              ))}
            </ol>
          )}
          {result.deferTaskIds.length > 0 && (
            <p className="text-[11px] text-text-faint">
              Mejor otro día: {result.deferTaskIds.map((id) => byId[id]).filter(Boolean).join(', ')}
            </p>
          )}
        </div>
      )}
    </Card>
  )
}
