import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addDays, format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import { CheckCheck, ChevronLeft, ChevronRight, Moon, Plus, Sparkles, Target } from 'lucide-react'
import { Alert, Button, EmptyState, Skeleton } from '../../design/primitives'
import { useInsights } from '../stats/insights/useInsights'
import { todayKey, isHabitScheduledOn, dateKey, parseDateKey, weekKey } from '../../lib/dates'
import { useHabitsWithStats } from '../habits/useHabitsWithStats'
import { HabitCard } from '../habits/HabitCard'
import { activateHabitEntry } from '../habits/activateHabit'
import { useHabitFormStore } from '../habits/habitFormStore'
import { useContextPanel } from '../../app/dock/contextPanelStore'
import { usePageTitle } from '../../app/pageTitleStore'
import { useListNav } from '../../app/shortcuts/listNavStore'
import { useDayNav } from '../../app/shortcuts/dayNavStore'
import { Timeline } from '../planner/Timeline'
import { UnscheduledTray } from '../planner/UnscheduledTray'
import { CapacityBanner } from '../planner/CapacityBanner'
import { OverdueTasks } from '../planner/OverdueTasks'
import { NorthStarCallout } from '../planner/NorthStarCallout'
import { getTasksForDate, getOverdueTasks } from '../../db/repositories/tasks'
import { getReview } from '../../db/repositories/reviews'
import { getCheckInForDate } from '../../db/repositories/checkins'
import { previousPeriodKey } from '../../lib/periods'
import { useWeeklyReviewStore } from '../planner/weeklyReviewStore'
import { DayPlanSuggestion } from '../ai/DayPlanSuggestion'
import { CheckInCard } from './CheckInCard'
import { db } from '../../db/schema'
import { shouldShowDayClose, shouldShowDayStart } from '../rituals/gates'
import type { CheckIn, Task } from '../../db/types'
import { useDayStartStore } from '../rituals/dayStartStore'
import { useDayCloseStore } from '../rituals/dayCloseStore'

export function TodayView() {
  const today = todayKey()
  const [searchParams, setSearchParams] = useSearchParams()
  const dParam = searchParams.get('d')
  const date = dParam ?? today
  const isToday = date === today
  const entries = useHabitsWithStats(date)
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const openEdit = useHabitFormStore((s) => s.openEdit)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const todaysEntries = useMemo(
    () => entries?.filter((e) => isHabitScheduledOn(e.habit, parseDateKey(date))),
    [entries, date],
  )
  const label = format(parseDateKey(date), "EEEE d 'de' MMMM", { locale: es })
  const doneCount = todaysEntries?.filter((e) => e.log?.completed).length ?? 0
  const totalCount = todaysEntries?.length ?? 0
  const pending = todaysEntries?.filter((e) => !e.log?.completed) ?? []

  const currentWeekKey = weekKey()
  // El aviso de revisión semanal es sobre el calendario real, no sobre el día que se esté viendo —
  // navegar a un lunes pasado/futuro no debe disparar el aviso espuriamente. Ya no depende de que
  // "hoy" sea literalmente lunes (Fase 12): si te saltas el lunes, el aviso sigue vigente toda la
  // semana hasta que exista una revisión para la semana pasada.
  const lastWeekKey = previousPeriodKey('week', currentWeekKey)
  const lastWeekReview = useLiveQuery(() => getReview(lastWeekKey), [lastWeekKey])
  const needsReview = isToday && lastWeekReview === undefined
  const openWeeklyReview = useWeeklyReviewStore((s) => s.openReview)
  const navigate = useNavigate()
  const { insights } = useInsights('30d')
  const topInsight = insights[0]

  usePageTitle(isToday ? null : format(parseDateKey(date), "EEE d MMM", { locale: es }), [date, isToday])

  const goToDate = (next: string) =>
    setSearchParams(next === today ? {} : { d: next }, { replace: true })

  useDayNav({
    onPrev: () => goToDate(dateKey(subDays(parseDateKey(date), 1))),
    onNext: () => goToDate(dateKey(addDays(parseDateKey(date), 1))),
    onToday: () => goToDate(today),
  })

  // Rituales del día (Fase 12) — solo evaluados para el "hoy" real, nunca al navegar a otro día.
  const checkin = useLiveQuery(
    () => (isToday ? getCheckInForDate(date) : Promise.resolve(undefined as CheckIn | undefined)),
    [isToday, date],
  )
  const overdueForGate = useLiveQuery(() => (isToday ? getOverdueTasks(date) : Promise.resolve([] as Task[])), [isToday, date])
  const tasksToday = useLiveQuery(() => (isToday ? getTasksForDate(date) : Promise.resolve([] as Task[])), [isToday, date])
  const settings = useLiveQuery(() => db.settings.get(1), [])
  const openDayStart = useDayStartStore((s) => s.openFlow)
  const openDayClose = useDayCloseStore((s) => s.openFlow)
  const dayStartOpen = useDayStartStore((s) => s.open)
  const dayCloseOpen = useDayCloseStore((s) => s.open)
  // Una vez se ha abierto (o descartado) un ritual para `date` en esta sesión, no se vuelve a
  // proponer aunque `checkin` tarde en reflejar el `markRitual*` que se escribió al cerrar — ese
  // escritura es fire-and-forget (`void markRitualStart(...)`), así que depender solo del
  // round-trip a Dexie para no reabrirse dejaba una ventana real en la que el diálogo se
  // reabría solo a sí mismo justo después de terminarlo.
  const promptedDayStartRef = useRef<string | null>(null)
  const promptedDayCloseRef = useRef<string | null>(null)

  // `checkin` deliberately NOT part of the "still loading" guard below: a missing check-in row
  // (the normal "haven't checked in today" case) resolves to `undefined` from Dexie exactly like
  // an unresolved query does, so gating on it would mean the flow could never open for anyone who
  // hasn't checked in yet. `overdueForGate`/`tasksToday`/`settings` are unambiguous (they always
  // resolve to a real array/object, never object).
  useEffect(() => {
    if (!isToday || dayStartOpen || dayCloseOpen || overdueForGate === undefined) return
    if (promptedDayStartRef.current === date) return
    if (shouldShowDayStart(checkin, overdueForGate.length)) {
      promptedDayStartRef.current = date
      openDayStart(date)
    }
  }, [isToday, dayStartOpen, dayCloseOpen, checkin, overdueForGate, date, openDayStart])

  useEffect(() => {
    if (!isToday || dayStartOpen || dayCloseOpen || tasksToday === undefined || !settings) return
    if (promptedDayCloseRef.current === date) return
    const pendingCount =
      tasksToday.filter((t) => t.status !== 'done').length + (todaysEntries?.filter((e) => !e.log?.completed).length ?? 0)
    if (shouldShowDayClose(checkin, pendingCount, new Date(), settings.eveningSummaryTime ?? '21:00')) {
      promptedDayCloseRef.current = date
      openDayClose(date)
    }
  }, [isToday, dayStartOpen, dayCloseOpen, checkin, tasksToday, settings, todaysEntries, date, openDayClose])

  useContextPanel(
    'Resumen del día',
    <div className="space-y-4">
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
    [doneCount, totalCount, pending.map((e) => e.habit.id).join(','), topInsight?.key],
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToDate(dateKey(subDays(parseDateKey(date), 1)))}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={17} strokeWidth={2} />
          </button>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
              {isToday ? 'Hoy' : 'Día'}
            </p>
            <h1 className="mt-1 text-2xl font-semibold capitalize text-text">{label}</h1>
          </div>
          <button
            onClick={() => goToDate(dateKey(addDays(parseDateKey(date), 1)))}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={17} strokeWidth={2} />
          </button>
          {!isToday && (
            <Button variant="ghost" onClick={() => goToDate(today)} className="px-2 py-1 text-xs">
              Hoy
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          {totalCount > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-text-muted">
              <CheckCheck size={15} strokeWidth={2} className="text-accent" />
              <span className="tabular-nums">
                {doneCount}/{totalCount} completados
              </span>
            </div>
          )}
          {isToday && (
            <Button variant="ghost" onClick={() => openDayClose(date)} className="px-2 py-1 text-xs">
              <Moon size={13} strokeWidth={2} /> Cerrar el día
            </Button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3 lg:order-1">
          <NorthStarCallout period="week" periodKey={currentWeekKey} />
          {needsReview && (
            <Alert tone="info">
              <button onClick={() => openWeeklyReview(currentWeekKey)} className="hover:underline">
                Toca hacer la revisión semanal →
              </button>
            </Alert>
          )}
          {isToday && <OverdueTasks date={date} />}
          <CapacityBanner date={date} />
          <Timeline date={date} />
        </div>

        <div className="space-y-6 lg:order-2">
          <CheckInCard date={date} />

          <div>
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-text-muted">{isToday ? 'Hábitos de hoy' : 'Hábitos ese día'}</h2>
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
