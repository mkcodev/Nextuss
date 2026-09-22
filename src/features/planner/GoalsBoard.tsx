import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, ClipboardCheck, Plus } from 'lucide-react'
import { Button, Card } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { monthKey, weekKey } from '../../lib/dates'
import { listGoalsForPeriod } from '../../db/repositories/goals'
import { listAttributes } from '../../db/repositories/gamification'
import { GoalCard } from './GoalCard'
import { NorthStarCallout } from './NorthStarCallout'
import { AttributePortfolio } from './AttributePortfolio'
import { parsePeriodKey, previousPeriodKey, nextPeriodKey } from './goalProgress'
import { useGoalFormStore } from './goalFormStore'
import { useWeeklyReviewStore } from './weeklyReviewStore'

export function GoalsBoard() {
  const [weekCursor, setWeekCursor] = useState(weekKey())
  const [showCompleted, setShowCompleted] = useState(false)
  const monthCursor = monthKey(parsePeriodKey('week', weekCursor))

  const monthGoals = useLiveQuery(() => listGoalsForPeriod('month', monthCursor), [monthCursor]) ?? []
  const weekGoals = useLiveQuery(() => listGoalsForPeriod('week', weekCursor), [weekCursor]) ?? []
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []

  const standaloneWeekGoals = weekGoals.filter((g) => g.parentGoalId == null)
  const visibleMonthGoals = monthGoals.filter((g) => showCompleted || !g.done)
  const visibleWeekGoals = standaloneWeekGoals.filter((g) => showCompleted || !g.done)
  const allGoalsThisScope = [...monthGoals, ...weekGoals]

  const openCreate = useGoalFormStore((s) => s.openCreate)
  const openReview = useWeeklyReviewStore((s) => s.openReview)

  const monthLabel = new Date(monthCursor + '-01').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setWeekCursor((k) => previousPeriodKey('week', k))}
            className="rounded-lg border border-border p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="min-w-[9rem] text-center">
            <p className="text-sm font-semibold capitalize text-text">{monthLabel}</p>
            <p className="text-xs text-text-faint">Semana {weekCursor}</p>
          </div>
          <button
            onClick={() => setWeekCursor((k) => nextPeriodKey('week', k))}
            className="rounded-lg border border-border p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={15} />
          </button>
          {weekCursor !== weekKey() && (
            <button
              onClick={() => setWeekCursor(weekKey())}
              className="ml-1 text-xs font-medium text-accent hover:underline"
            >
              Hoy
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-text-muted">
            <input type="checkbox" checked={showCompleted} onChange={(e) => setShowCompleted(e.target.checked)} />
            Mostrar completados
          </label>
          <Button variant="secondary" onClick={() => openReview(weekKey())} className="text-xs">
            <ClipboardCheck size={14} /> Revisión semanal
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NorthStarCallout period="month" periodKey={monthCursor} />
        <NorthStarCallout period="week" periodKey={weekCursor} />
      </div>

      <AttributePortfolio goals={allGoalsThisScope} attributes={attributes} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Objetivos del mes</h2>
          <button
            onClick={() => openCreate({ period: 'month', periodKey: monthCursor })}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>
        {visibleMonthGoals.length === 0 ? (
          <Card className="p-4 text-sm text-text-faint">Sin objetivos de mes todavía.</Card>
        ) : (
          <div className="space-y-3">
            {visibleMonthGoals.map((g) => (
              <GoalCard key={g.id} goal={g} attributes={attributes} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-muted">Objetivos sueltos de la semana</h2>
          <button
            onClick={() => openCreate({ period: 'week', periodKey: weekCursor })}
            className="flex items-center gap-1 text-xs font-medium text-accent hover:underline"
          >
            <Plus size={13} /> Nuevo
          </button>
        </div>
        {visibleWeekGoals.length === 0 ? (
          <Card className="p-4 text-sm text-text-faint">Sin objetivos sueltos esta semana.</Card>
        ) : (
          <div className={cn('grid grid-cols-1 gap-3', visibleWeekGoals.length > 1 && 'md:grid-cols-2')}>
            {visibleWeekGoals.map((g) => (
              <GoalCard key={g.id} goal={g} attributes={attributes} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
