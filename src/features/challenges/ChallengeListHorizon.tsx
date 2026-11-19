import { Check, Flame, Shield, X } from 'lucide-react'
import { useMemo } from 'react'
import { Celebration } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { daysText, formatDayMonth } from '../../lib/challenges/calendar'
import { barMarks, centerPct, elapsedDays, horizonRange, horizonTicks, leftPct, widthPct, type HorizonRange } from '../../lib/challenges/horizon'
import { dateKey } from '../../lib/dates'
import { FinishedGlyph, StatusIcon } from './listParts'
import { isLastDay, rowStatus } from './rowStatus'
import { playFor } from './useCelebratedChallengeMark'
import type { ChallengeItem } from './challengesData'
import type { ChallengeListProps } from './ChallengeListMix'

const LABEL_COL = 'md:grid-cols-[minmax(11rem,15rem)_minmax(0,1fr)]'

/** Vista Horizonte: cada reto es una barra sobre un eje de fechas, con «hoy» marcado, para ver dónde
 *  empezó, dónde estás y cuánto falta. No hay arrastre en ningún sitio: marcar, abrir y crear usan los
 *  mismos botones, teclas y diálogo que las otras vistas. */
export function ChallengeListHorizon({ items, today, playing, openId, onOpen, onToggleToday, label }: ChallengeListProps) {
  const range = useMemo(() => horizonRange(items.map((i) => i.challenge), today), [items, today])
  const todayLeft = centerPct(range, today)

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      <Legend />
      <div className={cn('grid', LABEL_COL)}>
        <div aria-hidden="true" className="hidden md:block" />
        <Axis range={range} today={today} todayLeft={todayLeft} />
      </div>
      <ul aria-label={label} className="divide-y divide-border border-t border-border">
        {items.map((item) => (
          <HorizonRow
            key={item.challenge.id}
            item={item}
            today={today}
            range={range}
            todayLeft={todayLeft}
            play={playFor(playing, item.challenge.id)}
            open={openId === item.challenge.id}
            onOpen={onOpen}
            onToggleToday={onToggleToday}
          />
        ))}
      </ul>
    </div>
  )
}

/** Leyenda de las marcas de la barra: forma y texto, no solo color. */
function Legend() {
  return (
    <ul aria-label="Leyenda del horizonte" className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 px-4 pt-3 text-xs text-text-muted">
      <li className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2 w-4 rounded-xs bg-accent" />
        Hecho
      </li>
      <li className="inline-flex items-center gap-1.5">
        <MarkChip state="shield" />
        Escudo
      </li>
      <li className="inline-flex items-center gap-1.5">
        <MarkChip state="fail" />
        Fallo
      </li>
    </ul>
  )
}

function MarkChip({ state }: { state: 'shield' | 'skip' | 'fail' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid size-4 place-items-center rounded-[3px] border bg-surface',
        state === 'fail' ? 'border-border-strong text-danger' : 'border-accent text-accent-text',
        state === 'skip' && 'border-dashed',
      )}
    >
      {state === 'fail' ? <X size={10} strokeWidth={2.5} /> : <Shield size={10} strokeWidth={2.25} />}
    </span>
  )
}

/** El eje: marcas los días 1 y 15 y la etiqueta «hoy». Decorativo; las fechas reales van en cada fila. */
function Axis({ range, today, todayLeft }: { range: HorizonRange; today: string; todayLeft: number }) {
  const ticks = useMemo(() => horizonTicks(range, today), [range, today])
  return (
    <div aria-hidden="true" className="relative mx-4 h-8 md:mr-4 md:ml-0">
      {ticks.map((t) => (
        <span
          key={t.key}
          className={cn('absolute bottom-1 border-l border-border pl-1 text-2xs leading-none whitespace-nowrap', t.month ? 'font-medium text-text-muted' : 'text-text-faint')}
          style={{ left: `${t.left}%` }}
        >
          {formatDayMonth(t.key)}
        </span>
      ))}
      <span
        className="absolute bottom-0.5 -translate-x-1/2 rounded-sm bg-text px-1.5 py-0.5 text-2xs leading-none font-medium text-bg"
        style={{ left: `${todayLeft}%` }}
      >
        hoy
      </span>
    </div>
  )
}

interface RowProps {
  item: ChallengeItem
  today: string
  range: HorizonRange
  todayLeft: number
  play: number | null
  open: boolean
  onOpen: (id: number) => void
  onToggleToday: (item: ChallengeItem) => void
}

function HorizonRow({ item, today, range, todayLeft, play, open, onOpen, onToggleToday }: RowProps) {
  const { challenge, summary } = item
  const status = rowStatus(item, today)
  const doneToday = summary.todayState === 'done'
  const remaining = Math.max(0, summary.totalDays - summary.dayIndex)
  const elapsed = elapsedDays({
    status: challenge.status,
    totalDays: summary.totalDays,
    dayIndex: summary.dayIndex,
    todayState: summary.todayState,
    rowCount: item.days.length,
  })
  const marks = useMemo(() => barMarks(challenge, item.days, summary.totalDays), [challenge, item.days, summary.totalDays])
  const span = `Del ${formatDayMonth(challenge.startDate)} al ${formatDayMonth(challenge.endDate)}`
  const sub = item.finished
    ? challenge.status === 'abandoned'
      ? 'Abandonado'
      : challenge.completedAt
        ? `${item.perfect ? 'Perfecto' : 'Cumplido'} el ${formatDayMonth(dateKey(new Date(challenge.completedAt)))}`
        : 'Cumplido'
    : item.markReason !== null
      ? status.text
      : isLastDay(item, today)
        ? 'último día'
        : remaining > 0
          ? `quedan ${remaining} d`
          : null

  return (
    <li
      data-challenge-id={challenge.id}
      className={cn('relative grid gap-y-1 py-2.5', LABEL_COL, open && 'bg-surface-hover/60')}
    >
      <Celebration play={play} playOnMount />

      <div className="flex min-w-0 items-start gap-2 px-4">
        <div className="grid size-6 shrink-0 place-items-center">
          {item.finished ? (
            <FinishedGlyph status={challenge.status} />
          ) : item.markReason !== null ? (
            <span className="text-text-muted" title={item.markReason}>
              <StatusIcon statusKey={status.key} />
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onToggleToday(item)}
              aria-pressed={doneToday}
              aria-label={`Marcar hoy: ${challenge.title}`}
              title={doneToday ? 'Hoy marcado. Pulsa para quitar la marca (x)' : summary.todayState === 'skip' ? '«Hoy no». Pulsa para marcarlo como hecho (x)' : 'Marcar hoy (x)'}
              className="-m-2.5 grid size-11 place-items-center rounded-md"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'grid size-5 place-items-center rounded-full border-2 transition-colors duration-(--dur-fast)',
                  doneToday ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-accent-text',
                )}
              >
                {doneToday ? <Check size={12} strokeWidth={3} /> : summary.todayState === 'skip' ? <Shield size={10} strokeWidth={2.5} /> : null}
              </span>
            </button>
          )}
        </div>
        <div className="min-w-0">
          <button
            type="button"
            data-challenge-row={challenge.id}
            onClick={() => onOpen(challenge.id)}
            aria-haspopup="dialog"
            className="block min-h-6 max-w-full truncate rounded-xs text-left text-ui font-medium text-text hover:underline"
            title={challenge.title}
          >
            {challenge.title}
          </button>
          <p className="flex items-center gap-2 text-xs text-text-muted tabular-nums">
            <span className="inline-flex items-center gap-1">
              <Flame size={12} strokeWidth={2} aria-hidden="true" className={summary.currentStreak > 0 ? 'text-accent-text' : 'text-text-faint'} />
              <span className="font-semibold text-text">{summary.currentStreak}</span>
              <span className="sr-only"> {summary.currentStreak === 1 ? 'día' : 'días'} de racha</span>
            </span>
            {sub && <span>{sub}</span>}
            <span className="sr-only">
              . {span}, {item.finished ? daysText(summary.totalDays) : `día ${summary.dayIndex} de ${summary.totalDays}`}.
            </span>
          </p>
        </div>
      </div>

      <div className="relative mx-4 h-8 md:mr-4 md:ml-0" aria-hidden="true" title={`${span} · ${daysText(summary.totalDays)}`}>
        <div
          className={cn('absolute top-1/2 h-4 -translate-y-1/2 rounded-sm', challenge.status === 'abandoned' ? 'bg-border/70' : 'bg-border')}
          style={{ left: `${leftPct(range, challenge.startDate)}%`, width: `${widthPct(range, summary.totalDays)}%` }}
        >
          <span
            className={cn('absolute inset-y-0 left-0 rounded-sm', challenge.status === 'done' ? 'bg-accent/60' : challenge.status === 'abandoned' ? 'bg-border-strong' : 'bg-accent')}
            style={{ width: `${(elapsed / summary.totalDays) * 100}%` }}
          />
          {marks.map((m) => (
            <span key={m.date} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ left: `${m.left}%` }}>
              <MarkChip state={m.state} />
            </span>
          ))}
        </div>
        <span className="absolute inset-y-0 w-px bg-text/70" style={{ left: `${todayLeft}%` }} />
      </div>
    </li>
  )
}
