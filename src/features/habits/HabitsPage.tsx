import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Archive, ChevronDown, ChevronUp, Plus } from 'lucide-react'
import { Button, DropIndicator } from '../../design/primitives'
import { CalendarHeatmap } from '../stats/charts/CalendarHeatmap'
import { describeHabitSchedule, subDaysKey, todayKey } from '../../lib/dates'
import { archiveHabit, getHabitLogs, moveHabitBetween } from '../../db/repositories/habits'
import { useHabitsWithStats, type HabitWithStats } from './useHabitsWithStats'
import { HabitCard } from './HabitCard'
import { activateHabitEntry } from './activateHabit'
import { useHabitFormStore } from './habitFormStore'
import { useContextPanel } from '../../app/dock/contextPanelStore'
import { useListNav } from '../../app/shortcuts/listNavStore'
import { useDragReorder } from '../../lib/useDragReorder'
import { reorderNeighbors, type DropPosition } from '../../lib/reorder'
import { cn } from '../../lib/cn'

const HABIT_DRAG_MIME = 'application/x-nextuss-habit'
const HISTORY_DAYS = 90

function HabitDetailPanel({ entry }: { entry: HabitWithStats }) {
  const { habit } = entry
  const logs = useLiveQuery(() => getHabitLogs(habit.id!), [habit.id]) ?? []
  const to = todayKey()
  const from = subDaysKey(to, HISTORY_DAYS)
  const values: Record<string, number> = {}
  for (const log of logs) {
    if (log.date < from) continue
    values[log.date] = log.completed ? 1 : 0
  }

  return (
    <div className="ml-2 space-y-2 rounded-xl border border-border bg-bg-soft p-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>{describeHabitSchedule(habit)}</span>
        <span>Racha actual: {entry.streak.current}</span>
        <span>Racha más larga: {entry.streak.longest}</span>
        {habit.pausedFrom && habit.pausedUntil && (
          <span className="text-warning">
            Pausado {habit.pausedFrom} → {habit.pausedUntil}
          </span>
        )}
      </div>
      <CalendarHeatmap from={from} to={to} values={values} cellSize={9} />
    </div>
  )
}

export function HabitsPage() {
  const date = todayKey()
  const [showArchived, setShowArchived] = useState(false)
  const allEntries = useHabitsWithStats(date, showArchived)
  const activeEntries = useMemo(() => allEntries?.filter((e) => !e.habit.archived), [allEntries])
  const archivedEntries = useMemo(() => allEntries?.filter((e) => e.habit.archived), [allEntries])
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const openEdit = useHabitFormStore((s) => s.openEdit)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const byType = useMemo(() => {
    const counts = { binary: 0, quantity: 0, duration: 0, negative: 0 }
    for (const e of activeEntries ?? []) counts[e.habit.type]++
    return counts
  }, [activeEntries])

  useContextPanel(
    'Resumen de hábitos',
    <div className="space-y-2 text-xs text-text-muted">
      <p className="text-2xl font-semibold tabular-nums text-text">{activeEntries?.length ?? 0}</p>
      <p className="text-text-faint">hábitos activos</p>
      <div className="mt-3 space-y-1 border-t border-border pt-3">
        <div className="flex justify-between">
          <span>Sí / No</span>
          <span className="tabular-nums text-text">{byType.binary}</span>
        </div>
        <div className="flex justify-between">
          <span>Cantidad</span>
          <span className="tabular-nums text-text">{byType.quantity}</span>
        </div>
        <div className="flex justify-between">
          <span>Duración</span>
          <span className="tabular-nums text-text">{byType.duration}</span>
        </div>
        <div className="flex justify-between">
          <span>A evitar</span>
          <span className="tabular-nums text-text">{byType.negative}</span>
        </div>
      </div>
    </div>,
    [activeEntries?.length, byType.binary, byType.quantity, byType.duration, byType.negative],
  )

  useListNav(
    activeEntries && activeEntries.length > 0
      ? {
          onNext: () => setSelectedIndex((i) => Math.min(i + 1, activeEntries.length - 1)),
          onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
          onActivate: () => {
            const entry = activeEntries[selectedIndex]
            if (entry) activateHabitEntry(entry, date)
          },
          onCreate: openCreate,
        }
      : null,
  )

  const handleMove = (draggedId: number, targetId: number, position: DropPosition) => {
    if (!activeEntries) return
    const n = reorderNeighbors(activeEntries.map((e) => e.habit), (h) => h.id, draggedId, targetId, position)
    if (n) void moveHabitBetween(draggedId, n.before, n.after)
  }
  const dnd = useDragReorder({ mime: HABIT_DRAG_MIME, onMove: handleMove })

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-text">Hábitos</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowArchived((v) => !v)}>
            <Archive size={14} strokeWidth={2} /> {showArchived ? 'Ocultar archivados' : 'Ver archivados'}
          </Button>
          <Button onClick={() => openCreate()}>
            <Plus size={14} strokeWidth={2} /> Nuevo hábito
          </Button>
        </div>
      </header>

      {activeEntries === undefined && <p className="text-sm text-text-faint">Cargando…</p>}

      {activeEntries?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-muted">Todavía no has creado ningún hábito.</p>
          <Button onClick={() => openCreate()} className="mt-3">
            <Plus size={14} strokeWidth={2} /> Crear tu primer hábito
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {activeEntries?.map((entry, i) => (
          <div key={entry.habit.id}>
            <div
              {...dnd.rowProps(entry.habit.id!)}
              className={cn('relative cursor-grab transition-opacity active:cursor-grabbing', dnd.dragging(entry.habit.id!) && 'opacity-40')}
            >
              <HabitCard
                entry={entry}
                date={date}
                selected={i === selectedIndex}
                onEdit={() => openEdit(entry.habit)}
              />
              <DropIndicator position={dnd.dropPosition(entry.habit.id!)} />
            </div>
            <button
              type="button"
              onClick={() => setExpandedId((id) => (id === entry.habit.id ? null : entry.habit.id!))}
              aria-expanded={expandedId === entry.habit.id}
              className="mt-1 flex items-center gap-1 pl-[68px] text-xs text-text-muted hover:text-text"
            >
              {describeHabitSchedule(entry.habit)}
              {' · racha más larga: '}
              {entry.streak.longest}
              {expandedId === entry.habit.id ? (
                <ChevronUp size={11} strokeWidth={2} />
              ) : (
                <ChevronDown size={11} strokeWidth={2} />
              )}
            </button>
            {expandedId === entry.habit.id && (
              <div className="mt-1.5">
                <HabitDetailPanel entry={entry} />
              </div>
            )}
          </div>
        ))}
      </div>

      {showArchived && (
        <div className="space-y-2 border-t border-border pt-4">
          <h2 className="text-sm font-semibold text-text-muted">Archivados</h2>
          {archivedEntries?.length === 0 && (
            <p className="text-sm text-text-faint">No hay hábitos archivados.</p>
          )}
          {archivedEntries?.map((entry) => (
            <div
              key={entry.habit.id}
              className="flex items-center justify-between rounded-xl border border-border bg-bg-soft px-3.5 py-2.5"
            >
              <span className="text-sm text-text-muted">{entry.habit.name}</span>
              <Button variant="secondary" onClick={() => archiveHabit(entry.habit.id!, false)} className="px-2.5 py-1 text-xs">
                Reactivar
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
