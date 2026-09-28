import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarClock } from 'lucide-react'
import { Card, Select } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { db } from '../../db/schema'
import { updateSettings } from '../../db/repositories/settings'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)

export function PlannerSection() {
  const settings = useLiveQuery(() => db.settings.get(1), [])

  return (
    <Card className="p-4">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-text">
        <CalendarClock size={15} strokeWidth={1.75} /> Planificador
      </h2>
      <p className="mb-3 text-xs text-text-faint">
        El rango horario del timeline diario y el cálculo de capacidad, y qué día abre la semana en
        las vistas de calendario.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-text-muted">
          El día empieza a las
          <Select
            value={settings?.dayStartHour ?? 7}
            onChange={(e) => updateSettings({ dayStartHour: Number(e.target.value) })}
            className="mt-1"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-text-muted">
          El día termina a las
          <Select
            value={settings?.dayEndHour ?? 22}
            onChange={(e) => updateSettings({ dayEndHour: Number(e.target.value) })}
            className="mt-1"
          >
            {HOUR_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}:00
              </option>
            ))}
          </Select>
        </label>
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <p className="mb-2 text-xs font-medium text-text-muted">La semana empieza en</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 1, label: 'Lunes' },
            { value: 0, label: 'Domingo' },
          ].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => updateSettings({ weekStartsOn: value as 0 | 1 })}
              className={cn(
                'rounded-lg border p-2.5 text-xs font-medium transition-colors',
                (settings?.weekStartsOn ?? 1) === value
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-border text-text-muted hover:bg-surface-hover',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </Card>
  )
}
