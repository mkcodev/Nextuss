import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowDown, ArrowUp, ChevronRight, Minus, Shield } from 'lucide-react'
import { useStatsData } from '../useStatsData'
import type { StatsRange } from '../range'
import type { HabitMatrixRow } from '../aggregate'
import { CalendarHeatmap, LineTrend, BarSeries } from '../charts'
import { Card, EmptyState, Icon, Select } from '../../../design/primitives'
import { listAttributes } from '../../../db/repositories/gamification'
import { cn } from '../../../lib/cn'
import { WEEKDAY_LABELS_ES } from '../../../lib/dates'
import type { Habit, HabitLog } from '../../../db/types'

interface HabitosTabProps {
  range: StatsRange
}

type SortKey = 'name' | 'complianceRatio' | 'currentStreak' | 'bestStreak'

const SORTABLE_COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'complianceRatio', label: 'Cumplimiento' },
  { key: 'currentStreak', label: 'Racha actual' },
  { key: 'bestStreak', label: 'Mejor racha' },
]

function SortIcon({ dir }: { dir: 'asc' | 'desc' }) {
  return dir === 'desc' ? <ArrowDown size={11} strokeWidth={2} /> : <ArrowUp size={11} strokeWidth={2} />
}

export function HabitosTab({ range }: HabitosTabProps) {
  // Incluye archivados: un hábito que ya no sigues no debería perder su histórico en las estadísticas.
  const data = useStatsData(range, true)
  const attributes = useLiveQuery(() => listAttributes(), []) ?? []
  const [attributeFilter, setAttributeFilter] = useState<number | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('complianceRatio')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const habitsById = useMemo(() => new Map(data.habits.map((h) => [h.id!, h])), [data.habits])
  const logsByHabitId = useMemo(() => {
    const map = new Map<number, HabitLog[]>()
    for (const log of data.habitLogs) {
      const arr = map.get(log.habitId)
      if (arr) arr.push(log)
      else map.set(log.habitId, [log])
    }
    return map
  }, [data.habitLogs])

  const rows = useMemo(() => {
    const filtered =
      attributeFilter === 'all' ? data.habitMatrix : data.habitMatrix.filter((r) => r.attributeId === attributeFilter)
    const sorted = [...filtered].sort((a, b) => {
      if (sortKey === 'name') return a.name.localeCompare(b.name)
      return a[sortKey] - b[sortKey]
    })
    if (sortDir === 'desc') sorted.reverse()
    return sorted
  }, [data.habitMatrix, attributeFilter, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  if (!data.loading && data.habits.length === 0) {
    return (
      <EmptyState
        title="Todavía no hay hábitos"
        description="Crea un hábito para empezar a ver sus estadísticas aquí."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-faint">
          {rows.length} hábito{rows.length === 1 ? '' : 's'}
        </p>
        {attributes.length > 0 && (
          <div className="w-52">
            <Select
              value={attributeFilter}
              onChange={(e) => setAttributeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            >
              <option value="all">Todos los atributos</option>
              {attributes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-faint">
                <th className="px-4 py-2.5 font-medium">Hábito</th>
                {SORTABLE_COLUMNS.map(({ key, label }) => (
                  <th key={key} className="px-3 py-2.5 font-medium">
                    <button
                      onClick={() => toggleSort(key)}
                      className={cn(
                        'flex items-center gap-1 transition-colors',
                        sortKey === key ? 'text-text' : 'hover:text-text',
                      )}
                    >
                      {label}
                      {sortKey === key && <SortIcon dir={sortDir} />}
                    </button>
                  </th>
                ))}
                <th className="px-3 py-2.5 font-medium">Tendencia</th>
                <th className="px-3 py-2.5 font-medium">Mejor/peor día</th>
                <th className="px-3 py-2.5 font-medium">Escudos</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const habit = habitsById.get(row.habitId)
                if (!habit) return null
                return (
                  <HabitRow
                    key={row.habitId}
                    row={row}
                    habit={habit}
                    expanded={expandedId === row.habitId}
                    onToggle={() => setExpandedId((id) => (id === row.habitId ? null : row.habitId))}
                    range={data.range}
                    habitLogs={logsByHabitId.get(row.habitId) ?? []}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

interface HabitRowProps {
  row: HabitMatrixRow
  habit: Habit
  expanded: boolean
  onToggle: () => void
  range: { from: string; to: string }
  habitLogs: HabitLog[]
}

function HabitRow({ row, habit, expanded, onToggle, range, habitLogs }: HabitRowProps) {
  const trendIcon =
    row.trend === 'up' ? (
      <ArrowUp size={12} strokeWidth={2} className="text-success" />
    ) : row.trend === 'down' ? (
      <ArrowDown size={12} strokeWidth={2} className="text-danger" />
    ) : (
      <Minus size={12} strokeWidth={2} className="text-text-faint" />
    )

  return (
    <>
      <tr
        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-hover"
        onClick={onToggle}
      >
        <td className="px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ChevronRight
              size={14}
              strokeWidth={2}
              className={cn('shrink-0 text-text-faint transition-transform', expanded && 'rotate-90')}
            />
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ background: `color-mix(in srgb, ${row.color} 18%, transparent)`, color: row.color }}
            >
              <Icon name={row.icon} size={13} strokeWidth={1.75} />
            </span>
            <span className="font-medium text-text">{row.name}</span>
          </div>
        </td>
        <td className="px-3 py-2.5 tabular-nums text-text">{Math.round(row.complianceRatio * 100)}%</td>
        <td className="px-3 py-2.5 tabular-nums text-text">{row.currentStreak}</td>
        <td className="px-3 py-2.5 tabular-nums text-text">{row.bestStreak}</td>
        <td className="px-3 py-2.5">{trendIcon}</td>
        <td className="px-3 py-2.5 text-xs text-text-faint">
          {row.bestWeekday != null ? WEEKDAY_LABELS_ES[row.bestWeekday] : '—'} /{' '}
          {row.worstWeekday != null ? WEEKDAY_LABELS_ES[row.worstWeekday] : '—'}
        </td>
        <td className="px-3 py-2.5 tabular-nums text-text-faint">
          {row.shieldsUsed > 0 ? (
            <span className="flex items-center gap-1">
              <Shield size={11} strokeWidth={1.75} /> {row.shieldsUsed}
            </span>
          ) : (
            '—'
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-b border-border last:border-0">
          <td colSpan={6} className="bg-bg-soft/60 p-4">
            <HabitDetail row={row} habit={habit} range={range} habitLogs={habitLogs} />
          </td>
        </tr>
      )}
    </>
  )
}

function HabitDetail({
  row,
  habit,
  range,
  habitLogs,
}: {
  row: HabitMatrixRow
  habit: Habit
  range: { from: string; to: string }
  habitLogs: HabitLog[]
}) {
  const heatmapValues = useMemo(() => {
    const values: Record<string, number> = {}
    for (const log of habitLogs) values[log.date] = log.completed ? 1 : 0
    return values
  }, [habitLogs])

  const streakData = useMemo(() => row.streakSeries.map((s) => ({ date: s.date.slice(5), streak: s.streak })), [row])

  const valueData = useMemo(
    () =>
      [...habitLogs]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((l) => ({ date: l.date.slice(5), value: l.value })),
    [habitLogs],
  )

  const showValueChart = habit.type === 'quantity' || habit.type === 'duration'

  return (
    <div className={cn('grid grid-cols-1 gap-5', showValueChart ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
      <div>
        <p className="mb-2 text-xs font-medium text-text-faint">Actividad</p>
        <CalendarHeatmap from={range.from} to={range.to} values={heatmapValues} cellSize={10} />
      </div>
      <div>
        <p className="mb-2 text-xs font-medium text-text-faint">Evolución de la racha</p>
        <LineTrend data={streakData} xKey="date" series={[{ key: 'streak', label: 'Racha', color: row.color }]} height={150} />
      </div>
      {showValueChart && (
        <div>
          <p className="mb-2 text-xs font-medium text-text-faint">
            Valor registrado {habit.unit ? `(${habit.unit})` : ''}
          </p>
          <BarSeries
            data={valueData}
            xKey="date"
            series={[{ key: 'value', label: 'Valor', color: row.color }]}
            height={150}
            referenceValue={habit.targetValue}
            referenceLabel="objetivo"
          />
        </div>
      )}
    </div>
  )
}
