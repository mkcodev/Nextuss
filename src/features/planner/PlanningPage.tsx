import { useSearchParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { cn } from '../../lib/cn'
import { monthKey, weekKey } from '../../lib/dates'
import { Tabs } from '../../design/primitives'
import { WeekView } from './WeekView'
import { MonthView } from './MonthView'
import { GoalsBoard } from './GoalsBoard'
import { GoalSection } from './GoalSection'
import { listGoalsForPeriod } from '../../db/repositories/goals'
import { useGoalFormStore } from './goalFormStore'

type Tab = 'week' | 'month' | 'objetivos'
const TABS: { key: Tab; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'objetivos', label: 'Objetivos' },
]

export function PlanningPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam === 'month' || tabParam === 'objetivos' ? tabParam : 'week'

  const currentWeekKey = weekKey()
  const currentMonthKey = monthKey()
  const weekGoals = useLiveQuery(() => listGoalsForPeriod('week', currentWeekKey), [currentWeekKey]) ?? []
  const monthGoals = useLiveQuery(() => listGoalsForPeriod('month', currentMonthKey), [currentMonthKey]) ?? []
  const openCreate = useGoalFormStore((s) => s.openCreate)

  const setTab = (t: Tab) => {
    setSearchParams(t === 'week' ? {} : { tab: t }, { replace: true })
  }

  return (
    <div className={cn('mx-auto p-6 lg:p-8', tab === 'objetivos' ? 'max-w-5xl' : 'max-w-6xl')}>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Planificación</p>
          <h1 className="mt-1 text-2xl font-semibold text-text">Semana y mes</h1>
        </div>
        <Tabs tabs={TABS} value={tab} onChange={setTab} />
      </header>

      {tab === 'objetivos' ? (
        <GoalsBoard />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
          <div className="lg:order-1">{tab === 'week' ? <WeekView /> : <MonthView />}</div>

          <div className="space-y-6 lg:order-2">
            <GoalSection
              title="Objetivos de la semana"
              emptyLabel="Sin objetivos esta semana todavía."
              goals={weekGoals}
              onCreate={() => openCreate({ period: 'week', periodKey: currentWeekKey })}
            />
            <GoalSection
              title="Objetivos del mes"
              emptyLabel="Sin objetivos este mes todavía."
              goals={monthGoals}
              onCreate={() => openCreate({ period: 'month', periodKey: currentMonthKey })}
            />
          </div>
        </div>
      )}
    </div>
  )
}
