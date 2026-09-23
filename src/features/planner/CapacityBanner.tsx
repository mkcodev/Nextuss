import { AlertTriangle, Clock } from 'lucide-react'
import { useDailyCapacity } from './useDailyCapacity'

function formatHours(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

export function CapacityBanner({ date }: { date: string }) {
  const { scheduledMin, availableMin, overCapacity } = useDailyCapacity(date)
  if (scheduledMin === 0) return null

  if (overCapacity) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5">
        <AlertTriangle size={16} strokeWidth={2} className="shrink-0 text-warning" />
        <p className="text-xs text-text-muted">
          Has planificado <span className="font-medium text-text">{formatHours(scheduledMin)}</span>{' '}
          de tareas, más de lo que cabe en tu horario ({formatHours(availableMin)}).
        </p>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border px-4 py-2.5">
      <Clock size={16} strokeWidth={2} className="shrink-0 text-text-faint" />
      <p className="text-xs text-text-muted">
        Te quedan <span className="font-medium text-text">{formatHours(availableMin - scheduledMin)}</span> libres.
      </p>
    </div>
  )
}
