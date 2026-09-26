import { useId } from 'react'
import { ToggleGroup } from '../../../design/primitives'
import { cn } from '../../../lib/cn'
import { WEEKDAY_LABELS_ES } from '../../../lib/dates'
import type { RecurrenceFreq, RecurrenceMode } from '../../../db/types'

const FREQ_OPTIONS: { value: RecurrenceFreq; label: string }[] = [
  { value: 'daily', label: 'Días' },
  { value: 'weekly', label: 'Semanas' },
  { value: 'monthly', label: 'Meses' },
]
const WEEKDAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export interface RepeatValue {
  freq: RecurrenceFreq
  interval: number
  byWeekday: number[]
  byMonthDay: number[]
  mode: RecurrenceMode
  until: string
}

interface RepeatSectionProps {
  value: RepeatValue
  onChange: (patch: Partial<RepeatValue>) => void
  /** Solo en una ocurrencia de una serie ya existente. */
  onStop?: () => void
}

const dayButton = (on: boolean) =>
  cn(
    'grid place-items-center rounded-sm border text-xs font-medium transition-colors',
    on ? 'border-accent bg-accent-soft text-accent' : 'border-border text-text-muted hover:bg-surface-hover hover:text-text',
  )

/** Controles de repetición de una tarea: cada N días/semanas/meses, en qué días, fecha fija o tras
 *  completar, y hasta cuándo. Estado controlado por el formulario. */
export function RepeatSection({ value, onChange, onStop }: RepeatSectionProps) {
  const intervalId = useId()
  const untilId = useId()
  const modeName = useId()

  const toggle = (list: number[], n: number) => (list.includes(n) ? list.filter((d) => d !== n) : [...list, n])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={intervalId} className="text-sm text-text-muted">
          Cada
        </label>
        <input
          id={intervalId}
          type="number"
          min={1}
          inputMode="numeric"
          value={value.interval}
          onChange={(e) => {
            // Mientras se escribe se deja vacío; el mínimo se aplica al salir del campo.
            const n = Number(e.target.value)
            onChange({ interval: Number.isFinite(n) && n > 0 ? n : 1 })
          }}
          className="h-7 w-14 rounded-sm border border-border bg-surface px-2 text-sm tabular-nums text-text focus:border-accent"
        />
        <ToggleGroup
          label="Unidad de repetición"
          options={FREQ_OPTIONS}
          value={value.freq}
          onChange={(freq) => {
            if (!freq) return
            // Sin ningún día marcado la regla no generaría nada: arranca con el de hoy.
            const today = new Date()
            onChange({
              freq,
              byWeekday: freq === 'weekly' && value.byWeekday.length === 0 ? [today.getDay()] : value.byWeekday,
              byMonthDay: freq === 'monthly' && value.byMonthDay.length === 0 ? [today.getDate()] : value.byMonthDay,
            })
          }}
        />
      </div>

      {value.freq === 'weekly' && value.mode === 'schedule' && (
        <div role="group" aria-label="Días de la semana" className="flex gap-1">
          {WEEKDAY_LABELS_ES.map((label, day) => (
            <button
              key={day}
              type="button"
              aria-pressed={value.byWeekday.includes(day)}
              aria-label={WEEKDAY_NAMES[day]}
              title={WEEKDAY_NAMES[day]}
              onClick={() => onChange({ byWeekday: toggle(value.byWeekday, day) })}
              className={cn(dayButton(value.byWeekday.includes(day)), 'size-8')}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {value.freq === 'monthly' && value.mode === 'schedule' && (
        <div role="group" aria-label="Días del mes" className="grid grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-1">
          {MONTH_DAYS.map((day) => (
            <button
              key={day}
              type="button"
              aria-pressed={value.byMonthDay.includes(day)}
              aria-label={`Día ${day}`}
              onClick={() => onChange({ byMonthDay: toggle(value.byMonthDay, day) })}
              className={cn(dayButton(value.byMonthDay.includes(day)), 'h-7 tabular-nums')}
            >
              {day}
            </button>
          ))}
        </div>
      )}

      <fieldset>
        <legend className="sr-only">Cuándo se genera la siguiente</legend>
        <div className="flex flex-wrap gap-4">
          {(
            [
              ['schedule', 'Fecha fija'],
              ['completion', 'Tras completar'],
            ] as const
          ).map(([mode, label]) => (
            <label key={mode} className="flex items-center gap-2 text-sm text-text">
              <input
                type="radio"
                name={modeName}
                checked={value.mode === mode}
                onChange={() => onChange({ mode })}
                className="size-4 accent-[var(--color-accent)]"
              />
              {label}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-text-muted">
          {value.mode === 'schedule'
            ? 'Se crea en esas fechas aunque no hayas completado la anterior.'
            : 'La siguiente se crea al completar esta, desplazada el intervalo elegido.'}
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={untilId} className="text-sm text-text-muted">
          Hasta
        </label>
        <input
          id={untilId}
          type="date"
          value={value.until}
          onChange={(e) => onChange({ until: e.target.value })}
          className="h-7 rounded-sm border border-border bg-surface px-2 text-sm text-text focus:border-accent"
        />
        <span className="text-xs text-text-muted">opcional</span>
      </div>

      {onStop && (
        <button type="button" onClick={onStop} className="text-sm font-medium text-danger hover:underline">
          Dejar de repetir
        </button>
      )}
    </div>
  )
}
