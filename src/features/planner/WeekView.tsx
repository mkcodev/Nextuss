import { useState } from 'react'
import { addDays, addWeeks, format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Button } from '../../design/primitives'
import { dateKey } from '../../lib/dates'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { WeekGrid } from './WeekGrid'

export function WeekView() {
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const weekStartsOn = (settings?.weekStartsOn ?? 1) as 0 | 1
  // Offset in weeks from "this week", not a raw Date — so changing weekStartsOn (e.g. once settings
  // load) just shifts what "this week" resolves to on the next render, no effect/resync needed.
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const isCurrentWeek = weekOffset === 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-muted">
          {format(days[0], 'd MMM', { locale: es })} – {format(days[6], 'd MMM', { locale: es })}
        </p>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <Button variant="ghost" onClick={() => setWeekOffset(0)} className="px-2 py-1 text-xs">
              Hoy
            </Button>
          )}
          <button
            onClick={() => setWeekOffset((o) => o - 1)}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronLeft size={16} strokeWidth={2} />
          </button>
          <button
            onClick={() => setWeekOffset((o) => o + 1)}
            className="rounded-md p-1.5 text-text-faint hover:bg-surface-hover hover:text-text"
          >
            <ChevronRight size={16} strokeWidth={2} />
          </button>
        </div>
      </div>

      <WeekGrid key={dateKey(weekStart)} days={days} />
    </div>
  )
}
