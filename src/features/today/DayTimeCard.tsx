import { useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Clock3 } from 'lucide-react'
import { RingProgress, SegmentedControl } from '../../design/primitives'
import { getTasksForDate } from '../../db/repositories/tasks'
import { getOrCreateSettings, updateSettings } from '../../db/repositories/settings'
import type { DayTimeView } from '../../db/types'
import { cn } from '../../lib/cn'
import { useNowMinutes } from '../../lib/useNowMinutes'
import { formatMinutes } from '../routines/schedule'
import { dayCells, formatClock, summarizeDay, type DayTimeSummary } from './dayTime'

const VIEW_OPTIONS: { value: DayTimeView; label: string }[] = [
  { value: 'ruler', label: 'Regla' },
  { value: 'ring', label: 'Anillo' },
  { value: 'blocks', label: 'Bloques' },
]

/** "Tiempo de hoy" (Fase 28b): cuánto queda de la jornada, qué hay ya planificado y qué viene, con tres
 * estilos intercambiables (regla, anillo, casillas de 30 min) guardados en Ajustes. Solo para el hoy real
 * y dentro de la jornada (o antes de que empiece). */
export function DayTimeCard({ date }: { date: string }) {
  const nowMin = useNowMinutes()
  const titleId = useId()
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const tasks = useLiveQuery(() => getTasksForDate(date), [date])
  if (!settings || !tasks) return null

  const summary = summarizeDay({ tasks, nowMin, dayStartHour: settings.dayStartHour, dayEndHour: settings.dayEndHour })
  if (summary.phase === 'after') return null
  const view: DayTimeView = settings.dayTimeView ?? 'ruler'

  return (
    <section aria-labelledby={titleId} className="rounded-md border border-border bg-surface px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="flex items-center gap-1.5 text-sm font-semibold text-text">
          <Clock3 size={14} strokeWidth={1.75} className="text-text-muted" aria-hidden="true" /> Tiempo de hoy
        </h2>
        <SegmentedControl
          options={VIEW_OPTIONS}
          value={view}
          onChange={(v) => void updateSettings({ dayTimeView: v })}
          label="Estilo del tiempo de hoy"
        />
      </div>
      {view === 'ruler' && <RulerView s={summary} nowMin={nowMin} />}
      {view === 'ring' && <RingView s={summary} />}
      {view === 'blocks' && <BlocksView s={summary} nowMin={nowMin} />}
    </section>
  )
}

function Headline({ s }: { s: DayTimeSummary }) {
  if (s.phase === 'before') {
    return (
      <>
        La jornada empieza a las <b className="font-semibold text-text">{formatClock(s.startMin)}</b>
      </>
    )
  }
  return (
    <>
      <b className="font-semibold text-text">Quedan {formatMinutes(s.leftMin)}</b>
      {s.plannedLeftMin > 0 && <> · {formatMinutes(s.freeLeftMin)} libres</>}
    </>
  )
}

function NextLine({ s }: { s: DayTimeSummary }) {
  if (!s.next) return <span>Sin más bloques hoy</span>
  return (
    <span className="min-w-0 truncate">
      Siguiente: <b className="font-semibold text-text">{s.next.title}</b> {s.next.inMin < 60 ? `en ${formatMinutes(s.next.inMin)}` : `a las ${s.next.start}`}
    </span>
  )
}

function RulerView({ s, nowMin }: { s: DayTimeSummary; nowMin: number }) {
  const span = s.endMin - s.startMin
  const pct = (min: number) => `${((Math.min(Math.max(min, s.startMin), s.endMin) - s.startMin) / span) * 100}%`
  // Marcas cada 3 h (o cada hora en jornadas cortas), sin las de los extremos, que ya se rotulan.
  const step = span > 8 * 60 ? 180 : 60
  const ticks: number[] = []
  for (let m = s.startMin + step; m < s.endMin; m += step) ticks.push(m)

  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs tabular-nums text-text-muted">
        <span>
          <Headline s={s} />
        </span>
        <NextLine s={s} />
      </div>
      <div
        role="meter"
        aria-label="Jornada"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(s.elapsed * 100)}
        aria-valuetext={`Pasado el ${Math.round(s.elapsed * 100)} % de la jornada, de ${formatClock(s.startMin)} a ${formatClock(s.endMin)}`}
        className="relative mt-3 h-5"
      >
        <span className="absolute inset-x-0 top-2 h-1 rounded-full bg-surface-hover" />
        <span className="absolute left-0 top-2 h-1 rounded-full bg-border-strong" style={{ width: pct(nowMin) }} />
        {s.blocks.map((b) => (
          <span
            key={b.taskId}
            title={`${b.title} · ${formatClock(b.startMin)}–${formatClock(b.endMin)}`}
            className={cn('absolute top-[5px] h-2.5 min-w-[3px] rounded-xs bg-accent', b.done || b.endMin <= nowMin ? 'opacity-35' : 'opacity-90')}
            style={{ left: pct(b.startMin), width: `calc(${pct(b.endMin)} - ${pct(b.startMin)})` }}
          />
        ))}
        {s.phase === 'during' && (
          <span aria-hidden="true" className="absolute top-0 h-5 w-0.5 -translate-x-1/2 rounded-full bg-danger" style={{ left: pct(nowMin) }}>
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-danger" />
          </span>
        )}
      </div>
      <div aria-hidden="true" className="relative mt-1 h-4 text-xs tabular-nums text-text-faint">
        <span className="absolute left-0">{formatClock(s.startMin)}</span>
        {ticks.map((m) => (
          <span key={m} className="absolute hidden -translate-x-1/2 sm:inline" style={{ left: pct(m) }}>
            {formatClock(m)}
          </span>
        ))}
        <span className="absolute right-0">{formatClock(s.endMin)}</span>
      </div>
    </div>
  )
}

function RingView({ s }: { s: DayTimeSummary }) {
  const leftPct = Math.round((1 - s.elapsed) * 100)
  return (
    <div className="mt-3">
      <div className="flex items-center gap-4">
        <RingProgress value={1 - s.elapsed} size={68} strokeWidth={6}>
          <span className="text-xs font-semibold tabular-nums text-text">{leftPct}%</span>
        </RingProgress>
        <div className="min-w-0">
          <p className="text-2xl font-semibold tracking-tight tabular-nums text-text">
            {s.phase === 'before' ? formatClock(s.startMin) : formatMinutes(s.leftMin)}
          </p>
          <p className="text-xs tabular-nums text-text-muted">
            {s.phase === 'before'
              ? 'empieza la jornada'
              : `quedan hasta las ${formatClock(s.endMin)}${s.plannedLeftMin > 0 ? ` · ${formatMinutes(s.freeLeftMin)} libres` : ''}`}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-xs tabular-nums text-text-muted">
        <NextLine s={s} />
      </div>
    </div>
  )
}

function BlocksView({ s, nowMin }: { s: DayTimeSummary; nowMin: number }) {
  const cells = dayCells(s, nowMin)
  const left = cells.filter((c) => c.status !== 'past')
  const free = left.filter((c) => c.status === 'free').length
  return (
    <div className="mt-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs tabular-nums text-text-muted">
        <span>
          <b className="font-semibold text-text">
            {left.length} {left.length === 1 ? 'bloque' : 'bloques'}
          </b>{' '}
          de 30 min hasta las {formatClock(s.endMin)} · {free} {free === 1 ? 'libre' : 'libres'}
        </span>
        <NextLine s={s} />
      </div>
      <ol
        aria-label={`${left.length} bloques de 30 minutos, ${free} libres`}
        className="mt-3 grid gap-[3px]"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(14px, 1fr))' }}
      >
        {cells.map((c) => (
          <li
            key={c.startMin}
            title={`${formatClock(c.startMin)} · ${c.status === 'past' ? 'pasado' : c.status === 'busy' ? 'ocupado' : 'libre'}`}
            className={cn(
              'h-4 rounded-xs',
              c.status === 'past' && 'border border-dashed border-border',
              c.status === 'busy' && 'bg-accent/85',
              c.status === 'free' && 'bg-success/50',
              c.current && 'outline-2 outline-offset-1 outline-text',
            )}
          />
        ))}
      </ol>
      <div aria-hidden="true" className="mt-2 flex gap-3 text-xs text-text-faint">
        <span className="inline-flex items-center gap-1">
          <i className="size-2.5 rounded-xs bg-accent/85" /> ocupado
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="size-2.5 rounded-xs bg-success/50" /> libre
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="size-2.5 rounded-xs border border-dashed border-border" /> pasado
        </span>
      </div>
    </div>
  )
}
