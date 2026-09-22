import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '../../design/primitives'
import { todayKey, WEEKDAY_LABELS_ES } from '../../lib/dates'
import { useHabitsWithStats } from './useHabitsWithStats'
import { HabitCard } from './HabitCard'
import { activateHabitEntry } from './activateHabit'
import { useHabitFormStore } from './habitFormStore'
import { useContextPanel } from '../../app/dock/contextPanelStore'
import { useListNav } from '../../app/shortcuts/listNavStore'

export function HabitsPage() {
  const date = todayKey()
  const entries = useHabitsWithStats(date)
  const openCreate = useHabitFormStore((s) => s.openCreate)
  const openEdit = useHabitFormStore((s) => s.openEdit)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const byType = useMemo(() => {
    const counts = { binary: 0, quantity: 0, duration: 0, negative: 0 }
    for (const e of entries ?? []) counts[e.habit.type]++
    return counts
  }, [entries])

  useContextPanel(
    'Resumen de hábitos',
    <div className="space-y-2 text-xs text-text-muted">
      <p className="text-2xl font-semibold tabular-nums text-text">{entries?.length ?? 0}</p>
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
    [entries?.length, byType.binary, byType.quantity, byType.duration, byType.negative],
  )

  useListNav(
    entries && entries.length > 0
      ? {
          onNext: () => setSelectedIndex((i) => Math.min(i + 1, entries.length - 1)),
          onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
          onActivate: () => {
            const entry = entries[selectedIndex]
            if (entry) activateHabitEntry(entry, date)
          },
          onCreate: openCreate,
        }
      : null,
  )

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6 lg:p-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-faint">Gestión</p>
          <h1 className="mt-1 text-2xl font-semibold text-text">Hábitos</h1>
        </div>
        <Button onClick={() => openCreate()}>
          <Plus size={14} strokeWidth={2} /> Nuevo hábito
        </Button>
      </header>

      {entries === undefined && <p className="text-sm text-text-faint">Cargando…</p>}

      {entries?.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-muted">Todavía no has creado ningún hábito.</p>
          <Button onClick={() => openCreate()} className="mt-3">
            <Plus size={14} strokeWidth={2} /> Crear tu primer hábito
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {entries?.map((entry, i) => (
          <div key={entry.habit.id}>
            <HabitCard
              entry={entry}
              date={date}
              selected={i === selectedIndex}
              onEdit={() => openEdit(entry.habit)}
            />
            <p className="mt-0.5 px-3 text-xs text-text-faint">
              {entry.habit.weekdays.length === 0
                ? 'Todos los días'
                : entry.habit.weekdays.map((d) => WEEKDAY_LABELS_ES[d]).join(' ')}
              {' · racha más larga: '}
              {entry.streak.longest}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
