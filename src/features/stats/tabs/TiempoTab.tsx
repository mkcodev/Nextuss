import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { AlarmClock, GitCommitHorizontal, Target, Zap } from 'lucide-react'
import { useStatsData } from '../useStatsData'
import type { StatsRange } from '../range'
import { ChartCard, BarSeries, LineTrend, StatTile } from '../charts'
import { getOverdueTasks, ZOMBIE_THRESHOLD } from '../../../db/repositories/tasks'
import { todayKey } from '../../../lib/dates'
import { formatMinutes } from '../format'

interface TiempoTabProps {
  range: StatsRange
}

const RATIO_BUCKETS: { label: string; test: (r: number) => boolean }[] = [
  { label: '<0.7x', test: (r) => r < 0.7 },
  { label: '0.7-0.9x', test: (r) => r >= 0.7 && r < 0.9 },
  { label: '0.9-1.1x', test: (r) => r >= 0.9 && r < 1.1 },
  { label: '1.1-1.5x', test: (r) => r >= 1.1 && r < 1.5 },
  { label: '>1.5x', test: (r) => r >= 1.5 },
]

export function TiempoTab({ range }: TiempoTabProps) {
  const data = useStatsData(range)
  const overdueTasks = useLiveQuery(() => getOverdueTasks(todayKey()), []) ?? []
  const zombieCount = overdueTasks.filter((t) => t.postponedCount >= ZOMBIE_THRESHOLD).length

  const plannedVsActualByDay = useMemo(() => {
    const buckets = new Map<string, { date: string; planned: number; actual: number }>()
    for (const t of data.tasksCompleted) {
      if (t.completedAt == null) continue
      const key = new Date(t.completedAt).toISOString().slice(5, 10)
      const bucket = buckets.get(key) ?? { date: key, planned: 0, actual: 0 }
      bucket.planned += t.estimateMin ?? 0
      bucket.actual += t.actualMin ?? 0
      buckets.set(key, bucket)
    }
    return [...buckets.values()].sort((a, b) => a.date.localeCompare(b.date))
  }, [data.tasksCompleted])

  const cumulativePlannedVsActual = useMemo(
    () =>
      plannedVsActualByDay.reduce<{ date: string; planned: number; actual: number }[]>((acc, p) => {
        const prev = acc.length > 0 ? acc[acc.length - 1] : { planned: 0, actual: 0 }
        acc.push({ date: p.date, planned: prev.planned + p.planned, actual: prev.actual + p.actual })
        return acc
      }, []),
    [plannedVsActualByDay],
  )

  const hourData = useMemo(
    () => data.hourHistogram.map((h) => ({ hour: `${String(h.hour).padStart(2, '0')}h`, focusMin: h.focusMin })),
    [data.hourHistogram],
  )
  const bestHour = useMemo(
    () => data.hourHistogram.reduce((best, h) => (h.focusMin > best.focusMin ? h : best), data.hourHistogram[0]),
    [data.hourHistogram],
  )

  const ratioDistribution = useMemo(() => {
    const ratios = data.tasksCompleted
      .filter((t) => t.estimateMin && t.estimateMin > 0 && t.actualMin != null)
      .map((t) => t.actualMin! / t.estimateMin!)
    return RATIO_BUCKETS.map((b) => ({ label: b.label, count: ratios.filter(b.test).length }))
  }, [data.tasksCompleted])

  const interruptions = useMemo(() => {
    const sessions = data.focusSessions
    if (sessions.length === 0) return { avg: 0, trend: 'flat' as const }
    const sorted = [...sessions].sort((a, b) => a.start - b.start)
    const half = Math.floor(sorted.length / 2)
    const avgOf = (list: typeof sorted) => (list.length ? list.reduce((s, x) => s + x.interruptions, 0) / list.length : 0)
    const firstHalf = avgOf(sorted.slice(0, half))
    const secondHalf = avgOf(sorted.slice(half))
    const trend = secondHalf - firstHalf > 0.3 ? 'up' : firstHalf - secondHalf > 0.3 ? 'down' : 'flat'
    return { avg: avgOf(sorted), trend: trend as 'up' | 'down' | 'flat' }
  }, [data.focusSessions])

  const driftRatio = useMemo(() => {
    if (data.tasksCompleted.length === 0) return 0
    const rescheduled = data.tasksCompleted.filter((t) => t.postponedCount > 0).length
    return rescheduled / data.tasksCompleted.length
  }, [data.tasksCompleted])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Precisión de estimación"
          value={data.estimateAccuracy.medianRatio != null ? `x${data.estimateAccuracy.medianRatio.toFixed(1)}` : '—'}
          icon={<Target size={13} strokeWidth={1.75} />}
        />
        <StatTile
          label="Mejor franja de foco"
          value={bestHour && bestHour.focusMin > 0 ? `${String(bestHour.hour).padStart(2, '0')}:00` : '—'}
          icon={<Zap size={13} strokeWidth={1.75} />}
        />
        <StatTile
          label="Interrupciones/sesión"
          value={interruptions.avg.toFixed(1)}
          direction={interruptions.trend}
          goodDirection="down"
          icon={<AlarmClock size={13} strokeWidth={1.75} />}
        />
        <StatTile
          label="Tareas zombie"
          value={String(zombieCount)}
          icon={<GitCommitHorizontal size={13} strokeWidth={1.75} />}
        />
      </div>

      {data.estimateAccuracy.biasLabel && (
        <p className="text-sm text-text-muted">{data.estimateAccuracy.biasLabel}</p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Planificado vs. real"
          subtitle="Minutos por día, tareas completadas"
          loading={data.loading}
          empty={plannedVsActualByDay.length === 0}
        >
          <BarSeries
            data={plannedVsActualByDay}
            xKey="date"
            series={[
              { key: 'planned', label: 'Planificado', color: 'var(--nx-border-strong)' },
              { key: 'actual', label: 'Real', color: 'var(--nx-accent)' },
            ]}
            formatValue={(v) => formatMinutes(Number(v ?? 0))}
          />
        </ChartCard>

        <ChartCard
          title="Planificado vs. real (acumulado)"
          loading={data.loading}
          empty={cumulativePlannedVsActual.length === 0}
        >
          <LineTrend
            data={cumulativePlannedVsActual}
            xKey="date"
            series={[
              { key: 'planned', label: 'Planificado', color: 'var(--nx-border-strong)' },
              { key: 'actual', label: 'Real', color: 'var(--nx-accent)' },
            ]}
            formatValue={(v) => formatMinutes(Number(v ?? 0))}
          />
        </ChartCard>

        <ChartCard
          title="Minutos de foco por hora del día"
          subtitle="De dónde sale tu mejor franja"
          loading={data.loading}
          empty={data.hourHistogram.every((h) => h.focusMin === 0)}
        >
          <BarSeries data={hourData} xKey="hour" series={[{ key: 'focusMin', label: 'Minutos', color: 'var(--nx-accent)' }]} />
        </ChartCard>

        <ChartCard
          title="Dispersión de estimación"
          subtitle={`${data.estimateAccuracy.sampleSize} tareas con estimación y tiempo real`}
          loading={data.loading}
          empty={data.estimateAccuracy.sampleSize === 0}
        >
          <BarSeries
            data={ratioDistribution}
            xKey="label"
            series={[{ key: 'count', label: 'Tareas', color: 'var(--nx-accent)' }]}
          />
        </ChartCard>
      </div>

      <ChartCard title="Deriva del plan" subtitle="Tareas completadas que se reprogramaron al menos una vez">
        <p className="text-2xl font-semibold tabular-nums text-text">{Math.round(driftRatio * 100)}%</p>
      </ChartCard>
    </div>
  )
}
