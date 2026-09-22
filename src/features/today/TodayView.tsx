import { useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { format, getDay } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCheck, Compass, Flame, Plus, Sparkles, Target } from 'lucide-react'
import { Button, EmptyState, Skeleton } from '../../design/primitives'
import { useInsights } from '../stats/insights/useInsights'
import { todayKey, isHabitScheduledOn, parseDateKey, weekKey } from '../../lib/dates'
import { useHabitsWithStats } from '../habits/useHabitsWithStats'
import { HabitCard } from '../habits/HabitCard'
import { activateHabitEntry } from '../habits/activateHabit'
import { reconcileShields } from '../../db/repositories/habits'
import { useHabitFormStore } from '../habits/habitFormStore'
import { useContextPanel } from '../../app/dock/contextPanelStore'
import { useListNav } from '../../app/shortcuts/listNavStore'
import { Timeline } from '../planner/Timeline'
import { UnscheduledTray } from '../planner/UnscheduledTray'
import { CapacityBanner } from '../planner/CapacityBanner'
import { OverdueTasks } from '../planner/OverdueTasks'
import { getNorthStarStreak, getPriorityGoal } from '../../db/repositories/goals'
import { getReview } from '../../db/repositories/reviews'
import { previousPeriodKey } from '../planner/goalProgress'
import { useWeeklyReviewStore } from '../planner/weeklyReviewStore'
import { DayPlanSuggestion } from '../ai/DayPlanSuggestion'

export function TodayView() {
  const date = todayKey()
  const entries = useHabitsWithStats(date)
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const openEdit = useHabitFormStore((s) => s.openEdit)
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    reconcileShields()
  }, [])

  const todaysEntries = useMemo(
    () => entries?.filter((e) => isHabitScheduledOn(e.habit, parseDateKey(date))),
    [entries, date],
  )
  const label = format(parseDateKey(date), "EEEE d 'de' MMMM", { locale: es })
  const doneCount = todaysEntries?.filter((e) => e.log?.completed).length ?? 0
  const totalCount = todaysEntries?.length ?? 0
  const pending = todaysEntries?.filter((e) => !e.log?.completed) ?? []

  const currentWeekKey = weekKey()
  const northStar = useLiveQuery(() => getPriorityGoal('week', currentWeekKey), [currentWeekKey])
  const northStarStreak = useLiveQuery(() => getNorthStarStreak('week', currentWeekKey), [currentWeekKey]) ?? 0
  const isMonday = getDay(parseDateKey(date)) === 1
  const lastWeekKey = previousPeriodKey('week', currentWeekKey)
  const lastWeekReview = useLiveQuery(() => getReview(lastWeekKey), [lastWeekKey])
  const needsReview = isMonday && lastWeekReview === undefined
  const openWeeklyReview = useWeeklyReviewStore((s) => s.openReview)
  const navigate = useNavigate()
  const { insights } = useInsights('30d')
  const topInsight = insights[0]

  useContextPanel(
    'Resumen del día',
    <div className="space-y-4">
      {northStar && (
        <div className="rounded-xl bg-accent-soft p-3">
          <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-accent">
            <Compass size={11} /> Objetivo principal
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-text">{northStar.title}</p>
          {northStarStreak > 0 && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-text-muted">
              <Flame size={12} className="text-accent" /> {northStarStreak} semanas seguidas
            </p>
          )}
        </div>
      )}
      {needsReview && (
        <button
          onClick={() => openWeeklyReview(currentWeekKey)}
          className="w-full rounded-xl border border-dashed border-border p-3 text-left text-xs text-text-muted hover:border-accent hover:text-accent"
        >
          Toca hacer la revisión semanal →
        </button>
      )}
      {topInsight && (
        <button
          onClick={() => navigate('/estadisticas?tab=insights')}
          className="flex w-full items-start gap-1.5 rounded-xl border border-border p-2.5 text-left hover:border-accent"
        >
          <Sparkles size={12} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" />
          <span className="truncate text-xs text-text-muted">{topInsight.title}</span>
        </button>
      )}
      <p className="text-2xl font-semibold tabular-nums text-text">
        {doneCount}
        <span className="text-sm font-normal text-text-faint"> / {totalCount} completados</span>
      </p>
      {pending.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-faint">
            Pendientes
          </p>
          <ul className="space-y-1">
            {pending.map((e) => (
              <li key={e.habit.id} className="truncate text-xs text-text-muted">
                {e.habit.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        totalCount > 0 && <p className="text-xs text-accent">Todo completado por hoy.</p>
      )}
    </div>,
    [
      doneCount,
      totalCount,
      pending.map((e) => e.habit.id).join(','),
      northStar?.id,
      northStar?.title,
      northStarStreak,
      needsReview,
      topInsight?.key,
    ],
  )

  useListNav(
    todaysEntries && todaysEntries.length > 0
      ? {
          onNext: () => setSelectedIndex((i) => Math.min(i + 1, todaysEntries.length - 1)),
          onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
          onActivate: () => {
            const entry = todaysEntries[selectedIndex]
            if (entry) activateHabitEntry(entry, date)
          },
          onCreate: openCreate,
        }
      : null,
  )

  return (
    <div className="mx-auto max-w-6xl p-6 lg:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Hoy</p>
          <h1 className="mt-1 text-2xl font-semibold capitalize text-text">{label}</h1>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm text-text-muted">
            <CheckCheck size={15} strokeWidth={2} className="text-accent" />
            <span className="tabular-nums">
              {doneCount}/{totalCount} completados
            </span>
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3 lg:order-1">
          <OverdueTasks date={date} />
          <CapacityBanner date={date} />
          <Timeline date={date} />
        </div>

        <div className="space-y-6 lg:order-2">
          <div>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-muted">Hábitos de hoy</h2>
              <Button variant="ghost" onClick={() => openCreate()} className="px-2 py-1 text-xs">
                <Plus size={14} strokeWidth={2} /> Nuevo
              </Button>
            </div>

            {todaysEntries === undefined && (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            )}

            {todaysEntries?.length === 0 && (
              <EmptyState
                icon={Target}
                title="Sin hábitos programados para hoy"
                description="Crea tu primer hábito y empieza a construir una racha."
                action={
                  <Button onClick={() => openCreate()} className="text-xs">
                    <Plus size={13} strokeWidth={2} /> Crear hábito
                  </Button>
                }
              />
            )}

            <div className="space-y-2">
              {todaysEntries?.map((entry, i) => (
                <HabitCard
                  key={entry.habit.id}
                  entry={entry}
                  date={date}
                  selected={i === selectedIndex}
                  onEdit={() => openEdit(entry.habit)}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-1 text-sm font-semibold text-text-muted">Sin planificar</h2>
            <UnscheduledTray date={date} />
          </div>

          <DayPlanSuggestion date={date} />
        </div>
      </div>
    </div>
  )
}
