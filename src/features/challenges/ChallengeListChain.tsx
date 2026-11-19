import { Check, Flame, Shield, ShieldOff } from 'lucide-react'
import { useMemo } from 'react'
import { Celebration } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { DAY_LABEL, chainCells, chainColumns, chainSummary, formatWeekdayDay, indexDays } from '../../lib/challenges/calendar'
import { DayMark } from './DayMark'
import { FinishedGlyph, StatusLabel, TAG } from './listParts'
import { isLastDay, progressText, rowStatus, type RowStatus } from './rowStatus'
import { playFor } from './useCelebratedChallengeMark'
import type { ChallengeItem } from './challengesData'
import type { ChallengeListProps } from './ChallengeListMix'

/** Vista Cadena: una tarjeta por reto con su cadena completa, una celda por día. Es la que mejor enseña
 *  la racha y los escudos, a costa de espacio. */
export function ChallengeListChain({ items, today, playing, openId, onOpen, onToggleToday, label }: ChallengeListProps) {
  return (
    <ul aria-label={label} className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <ChainCard
          key={item.challenge.id}
          item={item}
          today={today}
          play={playFor(playing, item.challenge.id)}
          open={openId === item.challenge.id}
          onOpen={onOpen}
          onToggleToday={onToggleToday}
        />
      ))}
    </ul>
  )
}

interface CardProps {
  item: ChallengeItem
  today: string
  play: number | null
  open: boolean
  onOpen: (id: number) => void
  onToggleToday: (item: ChallengeItem) => void
}

function ChainCard({ item, today, play, open, onOpen, onToggleToday }: CardProps) {
  const { challenge, summary, params } = item
  const status = rowStatus(item, today)
  const pauseFromTomorrow = challenge.status === 'paused' && challenge.pausedSince !== undefined && challenge.pausedSince > today

  return (
    <li
      data-challenge-id={challenge.id}
      className={cn(
        'relative flex flex-col gap-3 overflow-hidden rounded-lg border border-border bg-surface p-4 shadow-card transition-colors duration-(--dur-fast)',
        open && 'border-border-strong bg-surface-hover/60',
      )}
    >
      {/* Destello de la microcelebración: solo al marcar un día por acción de la persona. */}
      <Celebration play={play} playOnMount />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <button
            type="button"
            data-challenge-row={challenge.id}
            onClick={() => onOpen(challenge.id)}
            aria-haspopup="dialog"
            className="min-h-11 min-w-0 md:min-h-6 rounded-xs text-left text-ui font-semibold text-balance text-text hover:underline"
          >
            {challenge.title}
          </button>
          {isLastDay(item, today) && <span className={cn(TAG, 'bg-accent-soft py-0.5 text-accent-text')}>Último día</span>}
          {pauseFromTomorrow && <span className={cn(TAG, 'bg-warning/10 py-0.5 text-warning')}>Pausa desde mañana</span>}
        </div>
        <span
          className={cn('inline-flex shrink-0 items-center gap-1 text-lg font-semibold tracking-[-0.02em] tabular-nums', summary.currentStreak > 0 ? 'text-text' : 'text-text-faint')}
        >
          <Flame size={16} strokeWidth={2} aria-hidden="true" className={summary.currentStreak > 0 ? 'text-accent-text' : undefined} />
          {summary.currentStreak}
          <span className="sr-only"> {summary.currentStreak === 1 ? 'día' : 'días'} de racha</span>
        </span>
      </div>

      <Chain item={item} today={today} />

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-text-muted">
        <span className="inline-flex items-center gap-3 tabular-nums">
          <span>{progressText(item)}</span>
          <span className={cn('inline-flex items-center gap-1', summary.shieldsLeft === 0 && 'text-text-faint')} title="Escudos que quedan">
            <Shield size={12} strokeWidth={2} aria-hidden="true" />
            {summary.shieldsLeft}/{params.shields}
            <span className="sr-only"> escudos</span>
          </span>
        </span>
        <TodayControl item={item} status={status} onToggleToday={onToggleToday} />
      </div>
    </li>
  )
}

/** La cadena como una imagen con su texto: 66 elementos sueltos serían ruido para un lector de pantalla.
 *  El día a día está en el calendario de la ficha. */
function Chain({ item, today }: { item: ChallengeItem; today: string }) {
  const cells = useMemo(() => chainCells(item.challenge, indexDays(item.days), today), [item.challenge, item.days, today])
  return (
    <div
      role="img"
      aria-label={chainSummary(cells)}
      className="grid justify-start gap-[3px]"
      style={{ gridTemplateColumns: `repeat(${chainColumns(cells.length)}, minmax(0, 1.125rem))` }}
    >
      {cells.map((c, i) => (
        <DayMark key={c.date} visual={c.visual} size="fill" title={`Día ${i + 1}, ${formatWeekdayDay(c.date)}: ${DAY_LABEL[c.visual]}`} />
      ))}
    </div>
  )
}

/** Abajo a la derecha: el botón de hoy si se puede marcar y, si no, el estado (terminado, en pausa…). */
function TodayControl({ item, status, onToggleToday }: { item: ChallengeItem; status: RowStatus; onToggleToday: (i: ChallengeItem) => void }) {
  if (item.finished) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <FinishedGlyph status={item.challenge.status} />
        <StatusLabel status={status} />
      </span>
    )
  }
  if (item.markReason !== null) return <StatusLabel status={status} title={item.markReason} />

  const state = item.summary.todayState
  const done = state === 'done'
  return (
    <button
      type="button"
      onClick={() => onToggleToday(item)}
      aria-pressed={done}
      aria-label={`Marcar hoy: ${item.challenge.title}`}
      title={done ? 'Hoy marcado. Pulsa para quitar la marca (x)' : state === 'skip' ? '«Hoy no». Pulsa para marcarlo como hecho (x)' : 'Marcar hoy (x)'}
      className={cn(
        'inline-flex min-h-11 items-center gap-1.5 rounded-sm border px-3 text-ui font-medium transition-colors duration-(--dur-fast) md:min-h-7 md:px-2.5',
        done ? 'border-transparent text-accent-text hover:bg-accent-soft' : 'border-border bg-surface text-text shadow-card hover:bg-surface-hover',
      )}
    >
      {done ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : state === 'skip' ? <ShieldOff size={14} strokeWidth={2} aria-hidden="true" /> : <span aria-hidden="true" className="size-3.5 rounded-full border-2 border-border-strong" />}
      {done ? 'Hecho hoy' : state === 'skip' ? '«Hoy no»' : 'Marcar hoy'}
    </button>
  )
}
