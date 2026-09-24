import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { CalendarCheck, CheckCircle2, Compass, Flame, ListChecks, Timer, Zap } from 'lucide-react'
import { useStatsData } from '../useStatsData'
import type { StatsRange } from '../range'
import { ChartCard, CalendarHeatmap, LineTrend, BarSeries, StatTile } from '../charts'
import { getNorthStarStreak, listGoalsForPeriod } from '../../../db/repositories/goals'
import { weekKey, monthKey } from '../../../lib/dates'
import { formatMinutes } from '../format'
import type { KpiDelta } from '../aggregate'

interface ResumenTabProps {
  range: StatsRange
}

function deltaLabel(delta: KpiDelta | undefined, formatter: (v: number) => string): string | undefined {
  if (!delta || delta.direction === 'flat') return undefined
  const sign = delta.delta > 0 ? '+' : ''
  return `${sign}${formatter(delta.delta)} vs. periodo anterior`
}

export function ResumenTab({ range }: ResumenTabProps) {
  const navigate = useNavigate()
  const data = useStatsData(range)
  // El heatmap solo lee `points` del año: no necesita el año anterior (mitad de las consultas).
  const yearData = useStatsData('year', false, false)
  const northStarStreak = useLiveQuery(() => getNorthStarStreak('week', weekKey()), []) ?? 0
  const thisWeekGoals = useLiveQuery(() => listGoalsForPeriod('week', weekKey()), []) ?? []
  const thisMonthGoals = useLiveQuery(() => listGoalsForPeriod('month', monthKey()), []) ?? []

  const kpi = (key: KpiDelta['key']) => data.kpiDeltas.find((d) => d.key === key)

  const xpCurve = useMemo(
    () =>
      data.points.reduce<{ date: string; xp: number }[]>((acc, p) => {
        const previousXp = acc.length > 0 ? acc[acc.length - 1].xp : 0
        acc.push({ date: p.date.slice(5), xp: previousXp + p.xp })
        return acc
      }, []),
    [data.points],
  )

  const weeklyHabits = useMemo(() => {
    const buckets = new Map<string, { week: string; done: number; scheduled: number }>()
    for (const p of data.points) {
      const wk = weekKey(new Date(p.date))
      const bucket = buckets.get(wk) ?? { week: wk.slice(6), done: 0, scheduled: 0 }
      bucket.done += p.habitsDone
      bucket.scheduled += p.habitsScheduled
      buckets.set(wk, bucket)
    }
    return [...buckets.values()]
  }, [data.points])

  const heatmapValues = useMemo(() => {
    const values: Record<string, number> = {}
    for (const p of yearData.points) {
      const habitPart = p.habitsScheduled > 0 ? p.complianceRatio : 0
      const taskPart = Math.min(1, p.tasksCompleted / 3)
      const focusPart = Math.min(1, p.focusMin / 120)
      values[p.date] = habitPart * 0.5 + taskPart * 0.3 + focusPart * 0.2
    }
    return values
  }, [yearData.points])

  const longestActiveStreak = data.habitMatrix.reduce((max, h) => Math.max(max, h.currentStreak), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Días activos"
          value={String(data.points.filter((p) => p.habitsDone > 0 || p.tasksCompleted > 0).length)}
          icon={<CalendarCheck size={13} strokeWidth={1.75} />}
          direction={kpi('activeDays')?.direction}
          deltaLabel={deltaLabel(kpi('activeDays'), (v) => Math.round(v).toString())}
        />
        <StatTile
          label="Cumplimiento hábitos"
          value={`${Math.round((kpi('complianceRatio')?.current ?? 0) * 100)}%`}
          icon={<ListChecks size={13} strokeWidth={1.75} />}
          direction={kpi('complianceRatio')?.direction}
          deltaLabel={deltaLabel(kpi('complianceRatio'), (v) => `${Math.round(v * 100)}pp`)}
        />
        <StatTile
          label="Tareas completadas"
          value={String(kpi('tasksCompleted')?.current ?? 0)}
          icon={<CheckCircle2 size={13} strokeWidth={1.75} />}
          direction={kpi('tasksCompleted')?.direction}
          deltaLabel={deltaLabel(kpi('tasksCompleted'), (v) => Math.round(v).toString())}
        />
        <StatTile
          label="Minutos de foco"
          value={formatMinutes(kpi('focusMin')?.current ?? 0)}
          icon={<Timer size={13} strokeWidth={1.75} />}
          direction={kpi('focusMin')?.direction}
          deltaLabel={deltaLabel(kpi('focusMin'), (v) => formatMinutes(Math.abs(v)))}
        />
        <StatTile
          label="XP ganado"
          value={String(kpi('xp')?.current ?? 0)}
          icon={<Zap size={13} strokeWidth={1.75} />}
          direction={kpi('xp')?.direction}
          deltaLabel={deltaLabel(kpi('xp'), (v) => Math.round(v).toString())}
        />
        <StatTile
          label="Racha más larga viva"
          value={String(longestActiveStreak)}
          icon={<Flame size={13} strokeWidth={1.75} />}
        />
      </div>

      <ChartCard
        title="Intensidad del día"
        subtitle="Últimos 12 meses · mezcla de hábitos, tareas y foco"
        loading={yearData.loading}
        empty={!yearData.loading && yearData.points.every((p) => (heatmapValues[p.date] ?? 0) === 0)}
      >
        <CalendarHeatmap
          from={yearData.range.from}
          to={yearData.range.to}
          values={heatmapValues}
          onDayClick={() => navigate('/planificacion')}
          formatTooltip={(date, value) => `${date} · ${value ? Math.round(value * 100) : 0}%`}
        />
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="XP acumulado" subtitle="En el periodo seleccionado" loading={data.loading} empty={xpCurve.length === 0}>
          <LineTrend data={xpCurve} xKey="date" series={[{ key: 'xp', label: 'XP', color: 'var(--nx-accent)' }]} />
        </ChartCard>

        <ChartCard
          title="Hábitos por semana"
          subtitle="Completados vs. programados"
          loading={data.loading}
          empty={weeklyHabits.length === 0}
        >
          <BarSeries
            data={weeklyHabits}
            xKey="week"
            series={[
              { key: 'scheduled', label: 'Programados', color: 'var(--nx-border-strong)' },
              { key: 'done', label: 'Completados', color: 'var(--nx-accent)' },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard title="Objetivos" subtitle="Periodo actual">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <Compass size={18} strokeWidth={1.75} className="shrink-0 text-accent" />
            <div>
              <p className="text-xs text-text-faint">Racha North Star</p>
              <p className="text-lg font-semibold text-text">{northStarStreak} periodos</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0 text-accent" />
            <div>
              <p className="text-xs text-text-faint">Objetivos de la semana</p>
              <p className="text-lg font-semibold text-text">
                {thisWeekGoals.filter((g) => g.done).length}/{thisWeekGoals.length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0 text-accent" />
            <div>
              <p className="text-xs text-text-faint">Objetivos del mes</p>
              <p className="text-lg font-semibold text-text">
                {thisMonthGoals.filter((g) => g.done).length}/{thisMonthGoals.length}
              </p>
            </div>
          </div>
        </div>
      </ChartCard>
    </div>
  )
}
