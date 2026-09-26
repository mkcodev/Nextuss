import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowRight, Check, Loader2, Plus, Sparkles, X } from 'lucide-react'
import { Button, Dialog, Skeleton } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { listGoalsForPeriod, carryOverGoal, createGoal } from '../../db/repositories/goals'
import { getReview, saveReview } from '../../db/repositories/reviews'
import { previousPeriodKey } from '../../lib/periods'
import { useWeeklyReviewStore } from './weeklyReviewStore'
import { useAiAvailable } from '../ai/useAiAvailable'
import { AiError, recordAiUsage } from '../ai/errors'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { useStatsData } from '../stats/useStatsData'
import { summarizePeriod } from '../stats/aggregate'
import { periodDateRange } from '../../lib/periods'
import { useToastStore } from '../../lib/toastStore'
import type { Goal, WeeklyReview } from '../../db/types'

type Decision = 'carry' | 'drop'
type Step = 1 | 2 | 3

const MAX_NEW_GOALS = 3

export function WeeklyReviewDialog() {
  const { open, targetWeekKey, close } = useWeeklyReviewStore()
  const previousWeekKey = targetWeekKey ? previousPeriodKey('week', targetWeekKey) : null

  const previousGoals = useLiveQuery(
    (): Promise<Goal[]> => (previousWeekKey ? listGoalsForPeriod('week', previousWeekKey) : Promise.resolve([])),
    [previousWeekKey],
  )
  const existingReview = useLiveQuery(
    (): Promise<WeeklyReview | null> =>
      previousWeekKey ? getReview(previousWeekKey) : Promise.resolve(null),
    [previousWeekKey],
  )

  const [step, setStep] = useState<Step>(1)
  const [reflection, setReflection] = useState('')
  const [decisions, setDecisions] = useState<Record<number, Decision>>({})
  const [newGoalTitles, setNewGoalTitles] = useState<string[]>([''])
  const { available: aiAvailable } = useAiAvailable()
  const [summarizing, setSummarizing] = useState(false)
  const push = useToastStore((s) => s.push)

  const periodRange = previousWeekKey ? periodDateRange('week', previousWeekKey) : null
  const days =
    periodRange != null
      ? Math.round((new Date(periodRange.to).getTime() - new Date(periodRange.from).getTime()) / 86_400_000) + 1
      : 0
  const weekStats = useStatsData(periodRange ? { ...periodRange, days } : '7d')

  const generateSummary = async () => {
    if (!previousWeekKey) return
    setSummarizing(true)
    try {
      const settings = await getOrCreateSettings()
      const apiKey = settings.claudeApiKey?.trim()
      if (!apiKey) return
      const summary = summarizePeriod(weekStats.points)
      const { summarizeWeeklyReview } = await import('../ai/prompts')
      const text = await summarizeWeeklyReview(apiKey, summary, previousWeekKey)
      void recordAiUsage(settings)
      setReflection(text)
    } catch (err) {
      push({ title: 'No se pudo generar el resumen', description: err instanceof AiError ? err.message : undefined })
    } finally {
      setSummarizing(false)
    }
  }

  // Reset the wizard's local state each time it's (re)opened for a given week.
  useEffect(() => {
    if (!open) return
    setStep(1)
    setReflection(existingReview?.answers.reflection ?? '')
    setNewGoalTitles([''])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, targetWeekKey])

  useEffect(() => {
    if (!previousGoals) return
    setDecisions((prev) => {
      const next = { ...prev }
      for (const g of previousGoals) {
        if (!g.done && g.id != null && !(g.id in next)) next[g.id] = 'carry'
      }
      return next
    })
  }, [previousGoals])

  if (!targetWeekKey || !previousWeekKey) return null

  const incompleteGoals = (previousGoals ?? []).filter((g) => !g.done)
  const completedCount = (previousGoals ?? []).length - incompleteGoals.length

  const handleClose = () => close()

  const handleFinish = async () => {
    const carriedGoalIds: number[] = []
    const droppedGoalIds: number[] = []
    for (const goal of incompleteGoals) {
      if (!goal.id) continue
      if (decisions[goal.id] === 'drop') {
        droppedGoalIds.push(goal.id)
      } else {
        await carryOverGoal(goal.id, targetWeekKey)
        carriedGoalIds.push(goal.id)
      }
    }

    for (const title of newGoalTitles) {
      const trimmed = title.trim()
      if (trimmed) await createGoal({ period: 'week', periodKey: targetWeekKey, title: trimmed })
    }

    await saveReview({
      weekKey: previousWeekKey,
      answers: { reflection },
      carriedGoalIds,
      droppedGoalIds,
    })

    handleClose()
  }

  const setDecision = (goalId: number, decision: Decision) =>
    setDecisions((prev) => ({ ...prev, [goalId]: decision }))

  const setNewGoalTitle = (index: number, value: string) =>
    setNewGoalTitles((prev) => prev.map((t, i) => (i === index ? value : t)))

  return (
    <Dialog open={open} onClose={handleClose} title="Revisión semanal">
      <div className="space-y-4">
        <div className="flex items-center gap-1.5">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={cn('h-1 flex-1 rounded-full', s <= step ? 'bg-accent' : 'bg-border')}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Semana pasada ({previousWeekKey})</p>
            {previousGoals === undefined ? (
              <Skeleton className="h-16 w-full" />
            ) : previousGoals.length === 0 ? (
              <p className="text-sm text-text-muted">No hubo objetivos la semana pasada.</p>
            ) : (
              <>
                <p className="text-sm text-text">
                  Completaste <span className="font-semibold text-accent">{completedCount}</span> de{' '}
                  {previousGoals.length}.
                </p>
                <ul className="space-y-1">
                  {previousGoals.map((g) => (
                    <li key={g.id} className="flex items-center gap-2 text-sm">
                      {g.done ? (
                        <Check size={14} className="shrink-0 text-accent" />
                      ) : (
                        <X size={14} className="shrink-0 text-text-faint" />
                      )}
                      <span className={cn('truncate', g.done && 'text-text-faint line-through')}>{g.title}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs font-medium text-text-muted">¿Cómo fue la semana? (opcional)</label>
                {aiAvailable && (
                  <button
                    type="button"
                    onClick={generateSummary}
                    disabled={summarizing}
                    className="flex items-center gap-1 text-xs font-medium text-accent hover:underline disabled:opacity-50"
                  >
                    {summarizing ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} strokeWidth={1.75} />}
                    Generar con IA
                  </button>
                )}
              </div>
              <textarea
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={3}
                placeholder="Una reflexión rápida…"
                className="w-full resize-none rounded-lg border border-border bg-bg-soft px-3 py-2 text-sm text-text outline-none focus:border-accent"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Objetivos que quedaron incompletos</p>
            {incompleteGoals.length === 0 ? (
              <p className="text-sm text-text-muted">No quedó ninguno pendiente.</p>
            ) : (
              <div className="space-y-1.5">
                {incompleteGoals.map((g) => (
                  <div key={g.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-sm text-text">{g.title}</span>
                    <button
                      type="button"
                      onClick={() => setDecision(g.id!, 'carry')}
                      className={cn(
                        'flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium',
                        decisions[g.id!] === 'carry' ? 'bg-accent-soft text-accent' : 'text-text-faint hover:text-text',
                      )}
                    >
                      Llevar <ArrowRight size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDecision(g.id!, 'drop')}
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-medium',
                        decisions[g.id!] === 'drop' ? 'bg-danger/10 text-danger' : 'text-text-faint hover:text-text',
                      )}
                    >
                      Descartar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-xs text-text-faint">Objetivos para la nueva semana (1-3)</p>
            <div className="space-y-1.5">
              {newGoalTitles.map((t, i) => (
                <input
                  key={i}
                  autoFocus={i === 0}
                  value={t}
                  onChange={(e) => setNewGoalTitle(i, e.target.value)}
                  placeholder="Objetivo de la semana…"
                  className="w-full rounded-lg border border-border bg-bg-soft px-3 py-1.5 text-sm text-text outline-none focus:border-accent"
                />
              ))}
            </div>
            {newGoalTitles.length < MAX_NEW_GOALS && (
              <button
                type="button"
                onClick={() => setNewGoalTitles((prev) => [...prev, ''])}
                className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text"
              >
                <Plus size={13} /> Añadir otro
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cerrar
          </Button>
          <div className="flex gap-2">
            {step > 1 && (
              <Button type="button" variant="secondary" onClick={() => setStep((s) => (s - 1) as Step)}>
                Atrás
              </Button>
            )}
            {step < 3 ? (
              <Button type="button" onClick={() => setStep((s) => (s + 1) as Step)}>
                Siguiente
              </Button>
            ) : (
              <Button type="button" onClick={handleFinish}>
                Terminar
              </Button>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
