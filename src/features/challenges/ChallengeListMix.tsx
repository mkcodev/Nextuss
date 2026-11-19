import { Check, Flame, Shield } from 'lucide-react'
import { Celebration } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { DayStrip } from './DayMark'
import { playFor } from './useCelebratedChallengeMark'
import { isLastDay, progressText, rowStatus } from './rowStatus'
import { FinishedGlyph, StatusLabel, TAG } from './listParts'
import type { ChallengeItem } from './challengesData'

export interface ChallengeListProps {
  items: ChallengeItem[]
  today: string
  /** Qué reto celebra ahora (ver `useCelebratedChallengeMark`). */
  playing: { id: number; n: number } | null
  /** Reto cuya ficha está abierta. */
  openId?: number | null
  onOpen: (id: number) => void
  onToggleToday: (item: ChallengeItem) => void
  /** Cabecera de columnas (solo en pantallas anchas). */
  header?: boolean
  /** Nombre de la lista para lectores de pantalla. */
  label: string
}

/** Columnas de la vista Mezcla desde `md`: marca, reto, racha, últimos 7 días, escudos, progreso, hoy. */
const COLS = 'md:grid-cols-[2.75rem_minmax(0,1fr)_4rem_7.5rem_4.5rem_6.5rem_7rem]'

/** Vista D · Mezcla: tabla densa de retos propios, con la racha, los últimos 7 días, los escudos y el
 *  estado de hoy a la vista sin abrir la ficha. En pantallas estrechas cada fila pasa a dos líneas. */
export function ChallengeListMix({ items, today, playing, openId, onOpen, onToggleToday, header = true, label }: ChallengeListProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-card">
      {header && (
        <div
          aria-hidden="true"
          className={cn('hidden h-8 items-center gap-x-3 border-b border-border bg-bg-soft px-2 text-xs font-medium text-text-muted md:grid', COLS)}
        >
          <span />
          <span>Reto</span>
          <span>Racha</span>
          <span>Últimos 7 días</span>
          <span>Escudos</span>
          <span>Progreso</span>
          <span>Hoy</span>
        </div>
      )}
      <ul aria-label={label} className="divide-y divide-border">
        {items.map((item) => (
          <ChallengeRow
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
    </div>
  )
}

interface RowProps {
  item: ChallengeItem
  today: string
  play: number | null
  open: boolean
  onOpen: (id: number) => void
  onToggleToday: (item: ChallengeItem) => void
}

function ChallengeRow({ item, today, play, open, onOpen, onToggleToday }: RowProps) {
  const { challenge, summary, params } = item
  const status = rowStatus(item, today)
  const doneToday = summary.todayState === 'done'
  const pauseFromTomorrow =
    challenge.status === 'paused' && challenge.pausedSince !== undefined && challenge.pausedSince > today
  const shieldsText = `${summary.shieldsLeft}/${params.shields}`

  return (
    <li
      data-challenge-id={challenge.id}
      className={cn(
        'relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-0.5 overflow-hidden px-1 py-1.5 transition-colors duration-(--dur-fast) hover:bg-surface-hover/60 md:h-row md:gap-x-3 md:px-2 md:py-0',
        COLS,
        open && 'bg-surface-hover/60',
      )}
    >
      {/* Destello de la microcelebración: solo al marcar un día por acción de la persona. */}
      <Celebration play={play} playOnMount />

      <div className="row-span-2 grid place-items-center md:row-span-1">
        {item.finished ? (
          <FinishedGlyph status={challenge.status} />
        ) : (
          <button
            type="button"
            onClick={() => onToggleToday(item)}
            disabled={item.markReason !== null}
            aria-pressed={doneToday}
            aria-label={`Marcar hoy: ${challenge.title}`}
            title={item.markReason ?? (doneToday ? 'Hoy marcado. Pulsa para quitar la marca (x)' : 'Marcar hoy (x)')}
            className="grid size-11 place-items-center rounded-md disabled:opacity-40 md:size-8"
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

      <div className="col-start-2 flex min-w-0 items-center gap-2 md:row-start-1">
        <button
          type="button"
          data-challenge-row={challenge.id}
          onClick={() => onOpen(challenge.id)}
          aria-haspopup="dialog"
          className="min-h-6 min-w-0 truncate rounded-xs text-left text-ui font-medium text-text hover:underline md:min-h-0"
          title={challenge.title}
        >
          {challenge.title}
        </button>
        {isLastDay(item, today) && <span className={cn(TAG, 'bg-accent-soft text-accent-text')}>Último día</span>}
        {pauseFromTomorrow && <span className={cn(TAG, 'bg-warning/10 text-warning')}>Pausa desde mañana</span>}
      </div>

      <StatusLabel
        status={status}
        className="col-start-3 justify-end md:col-start-7 md:row-start-1 md:justify-start"
      />

      <div className="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted md:contents">
        <span className="inline-flex items-center gap-1 tabular-nums md:col-start-3 md:row-start-1">
          <Flame size={12} strokeWidth={2} aria-hidden="true" className={summary.currentStreak > 0 ? 'text-accent-text' : 'text-text-faint'} />
          {summary.currentStreak}
          <span className="sr-only"> {summary.currentStreak === 1 ? 'día' : 'días'} de racha</span>
        </span>
        <span className="md:col-start-4 md:row-start-1">
          <DayStrip cells={item.strip} />
        </span>
        <span
          className={cn('inline-flex items-center gap-1 tabular-nums md:col-start-5 md:row-start-1', summary.shieldsLeft === 0 && 'text-text-faint')}
          title="Escudos que quedan"
        >
          <Shield size={12} strokeWidth={2} aria-hidden="true" />
          {shieldsText}
          <span className="sr-only"> escudos</span>
        </span>
        <span className="tabular-nums md:col-start-6 md:row-start-1">{progressText(item)}</span>
      </div>
    </li>
  )
}
