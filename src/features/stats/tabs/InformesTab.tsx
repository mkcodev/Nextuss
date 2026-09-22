import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronLeft, ChevronRight, Compass, Download, FileJson, Printer, Sparkles, Trophy } from 'lucide-react'
import { useStatsData } from '../useStatsData'
import { useInsights } from '../insights/useInsights'
import { nextPeriodKey, periodDateRange, previousPeriodKey } from '../../../lib/periods'
import { monthKey, parseDateKey, weekKey } from '../../../lib/dates'
import { formatMinutes } from '../format'
import { downloadCsv, downloadJson } from '../export'
import { getReview } from '../../../db/repositories/reviews'
import { getNorthStarStreak, listGoalsForPeriod } from '../../../db/repositories/goals'
import { ACHIEVEMENTS_BY_KEY } from '../../../lib/achievements'
import { Badge, Button, Card, Icon, Tabs } from '../../../design/primitives'
import { useToastStore } from '../../../lib/toastStore'
import type { GoalPeriod, WeeklyReview } from '../../../db/types'

const PERIOD_TABS: { key: GoalPeriod; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
]

function currentKeyFor(period: GoalPeriod): string {
  return period === 'week' ? weekKey() : monthKey()
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-text-faint">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-text">{value}</p>
    </div>
  )
}

export function InformesTab() {
  const [period, setPeriod] = useState<GoalPeriod>('week')
  const [periodKey, setPeriodKey] = useState(weekKey())
  const push = useToastStore((s) => s.push)

  const changePeriod = (p: GoalPeriod) => {
    setPeriod(p)
    setPeriodKey(currentKeyFor(p))
  }

  const bounds = useMemo(() => periodDateRange(period, periodKey), [period, periodKey])
  const resolvedRange = useMemo(() => {
    const days = Math.round((parseDateKey(bounds.to).getTime() - parseDateKey(bounds.from).getTime()) / 86400000) + 1
    return { ...bounds, days }
  }, [bounds])

  const data = useStatsData(resolvedRange, true)
  const { insights } = useInsights(resolvedRange)
  const review = useLiveQuery(async (): Promise<WeeklyReview | undefined> => {
    if (period !== 'week') return undefined
    return getReview(periodKey)
  }, [period, periodKey])
  const northStarStreak = useLiveQuery(
    () => (period === 'week' ? getNorthStarStreak('week', periodKey) : Promise.resolve(0)),
    [period, periodKey],
  )
  // Los objetivos del informe son los que PERTENECEN a este periodo (period+periodKey), no los
  // creados/completados dentro de sus fechas naturales — `data.goals` (de useStatsData) usa ese
  // segundo criterio y no encaja aquí (mismo error que ya se evitó en ResumenTab).
  const periodGoals = useLiveQuery(() => listGoalsForPeriod(period, periodKey), [period, periodKey]) ?? []

  const isCurrent = periodKey === currentKeyFor(period)
  const periodLabel =
    period === 'week'
      ? `Semana ${periodKey}`
      : parseDateKey(`${periodKey}-01`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

  const doneGoals = periodGoals.filter((g) => g.done)
  const achievementRows = data.achievements
    .map((a) => ({ ...a, def: ACHIEVEMENTS_BY_KEY.get(a.key) }))
    .filter((a) => a.def != null)

  const complianceCurrent = data.points.length
    ? data.points.reduce((s, p) => s + p.habitsDone, 0) / Math.max(1, data.points.reduce((s, p) => s + p.habitsScheduled, 0))
    : 0
  const tasksCompletedCount = data.tasksCompleted.length
  const focusMinTotal = data.points.reduce((s, p) => s + p.focusMin, 0)
  const xpTotal = data.points.reduce((s, p) => s + p.xp, 0)

  const exportEntity = (name: string, rows: Record<string, unknown>[]) => {
    if (rows.length === 0) {
      push({ title: `Sin datos de "${name}" en este periodo` })
      return
    }
    downloadCsv(`nextuss-${name}-${periodKey}.csv`, rows as never)
  }

  const exportPeriodJson = () => {
    downloadJson(`nextuss-informe-${periodKey}.json`, {
      period,
      periodKey,
      range: bounds,
      habits: data.habits,
      habitLogs: data.habitLogs,
      tasksCompleted: data.tasksCompleted,
      checkins: data.checkins,
      focusSessions: data.focusSessions,
      goals: periodGoals,
      achievements: data.achievements,
    })
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Tabs tabs={PERIOD_TABS} value={period} onChange={changePeriod} />
          <button
            onClick={() => setPeriodKey((k) => previousPeriodKey(period, k))}
            className="rounded-lg border border-border p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={15} strokeWidth={1.75} />
          </button>
          <div className="min-w-[10rem] text-center">
            <p className="text-sm font-semibold capitalize text-text">{periodLabel}</p>
          </div>
          <button
            onClick={() => setPeriodKey((k) => nextPeriodKey(period, k))}
            className="rounded-lg border border-border p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={15} strokeWidth={1.75} />
          </button>
          {!isCurrent && (
            <button onClick={() => setPeriodKey(currentKeyFor(period))} className="text-xs font-medium text-accent hover:underline">
              Hoy
            </button>
          )}
        </div>
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer size={14} strokeWidth={1.75} /> Imprimir informe
        </Button>
      </div>

      <div className="print-area space-y-5">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">
            Informe de {period === 'week' ? 'la semana' : 'el mes'}
          </p>
          <h2 className="mt-1 text-xl font-semibold capitalize text-text">{periodLabel}</h2>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat label="Cumplimiento hábitos" value={`${Math.round(complianceCurrent * 100)}%`} />
            <MiniStat label="Tareas completadas" value={String(tasksCompletedCount)} />
            <MiniStat label="Minutos de foco" value={formatMinutes(focusMinTotal)} />
            <MiniStat label="XP ganado" value={String(xpTotal)} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <Compass size={15} strokeWidth={1.75} /> Objetivos cumplidos ({doneGoals.length}/{periodGoals.length})
          </h3>
          {doneGoals.length === 0 ? (
            <p className="text-sm text-text-faint">Ninguno completado en este periodo.</p>
          ) : (
            <ul className="space-y-1.5">
              {doneGoals.map((g) => (
                <li key={g.id} className="flex items-center gap-2 text-sm text-text">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {g.title}
                  {g.isPriority && <Badge tone="accent">North Star</Badge>}
                </li>
              ))}
            </ul>
          )}
          {period === 'week' && northStarStreak != null && northStarStreak > 0 && (
            <p className="mt-3 text-xs text-text-faint">Racha North Star: {northStarStreak} semanas seguidas.</p>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
            <Trophy size={15} strokeWidth={1.75} /> Logros desbloqueados ({achievementRows.length})
          </h3>
          {achievementRows.length === 0 ? (
            <p className="text-sm text-text-faint">Ninguno en este periodo.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {achievementRows.map((a) => (
                <div key={a.key} className="flex items-center gap-1.5 rounded-lg border border-accent/30 bg-accent-soft px-2.5 py-1.5 text-xs text-text">
                  <Icon name={a.def!.icon} size={14} strokeWidth={1.75} />
                  {a.def!.title}
                </div>
              ))}
            </div>
          )}
        </Card>

        {insights.length > 0 && (
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text">
              <Sparkles size={15} strokeWidth={1.75} /> Insights del periodo
            </h3>
            <ul className="space-y-2">
              {insights.slice(0, 3).map((insight) => (
                <li key={insight.key} className="text-sm">
                  <span className="font-medium text-text">{insight.title}.</span>{' '}
                  <span className="text-text-muted">{insight.body}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {period === 'week' && review && (
          <Card className="p-5">
            <h3 className="mb-2 text-sm font-semibold text-text">Revisión semanal</h3>
            <p className="text-sm text-text-muted">{review.answers.reflection || 'Sin reflexión registrada.'}</p>
          </Card>
        )}
      </div>

      <Card className="no-print p-5">
        <h3 className="mb-1 text-sm font-semibold text-text">Exportar datos del periodo</h3>
        <p className="mb-3 text-xs text-text-faint">CSV por entidad, o todo junto en un único JSON.</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => exportEntity('habitos', data.habits as never)}>
            <Download size={13} strokeWidth={1.75} /> Hábitos
          </Button>
          <Button variant="secondary" onClick={() => exportEntity('logs-habitos', data.habitLogs as never)}>
            <Download size={13} strokeWidth={1.75} /> Logs de hábitos
          </Button>
          <Button variant="secondary" onClick={() => exportEntity('tareas', data.tasksCompleted as never)}>
            <Download size={13} strokeWidth={1.75} /> Tareas
          </Button>
          <Button variant="secondary" onClick={() => exportEntity('check-ins', data.checkins as never)}>
            <Download size={13} strokeWidth={1.75} /> Check-ins
          </Button>
          <Button variant="secondary" onClick={() => exportEntity('foco', data.focusSessions as never)}>
            <Download size={13} strokeWidth={1.75} /> Sesiones de foco
          </Button>
          <Button variant="secondary" onClick={() => exportEntity('objetivos', periodGoals as never)}>
            <Download size={13} strokeWidth={1.75} /> Objetivos
          </Button>
          <Button variant="secondary" onClick={exportPeriodJson}>
            <FileJson size={13} strokeWidth={1.75} /> Todo (JSON)
          </Button>
        </div>
      </Card>

      <p className="no-print text-xs text-text-faint">
        ¿Backup completo de la base de datos o restaurar desde un archivo? Eso vive en{' '}
        <Link to="/ajustes" className="text-accent hover:underline">
          Ajustes → Datos
        </Link>
        .
      </p>
    </div>
  )
}
