import { useId, useState, type ReactNode } from 'react'
import { Archive, Check, MoreHorizontal, Pause, Play, ShieldOff, Trash2, X } from 'lucide-react'
import { Button, Celebration, IconButton, Kbd, Menu, MenuItem, MenuSeparator, Sheet } from '../../design/primitives'
import { DAY_LABEL, formatDayMonth, formatWeekdayDay, logEntries } from '../../lib/challenges/calendar'
import { cn } from '../../lib/cn'
import { dateKey } from '../../lib/dates'
import { XP_PER_CHALLENGE_DAY, challengePerfectBonus } from '../../lib/xp'
import { ChallengeCalendar } from './ChallengeCalendar'
import { DayLegend, DayMark } from './DayMark'
import { pauseNow, resumeNow, skipToday, trashNow, undoSkipToday } from './challengeActions'
import { rowStatus, isLastDay } from './rowStatus'
import { playFor } from './useCelebratedChallengeMark'
import { useMarkShortcut } from './useMarkShortcut'
import type { ChallengeItem } from './challengesData'

interface SheetProps {
  /** El reto abierto, o `null` si no hay ficha. */
  item: ChallengeItem | null
  today: string
  playing: { id: number; n: number } | null
  gamified: boolean
  onClose: () => void
  onToggleToday: (item: ChallengeItem) => void
  /** Pide confirmación para abandonar (el diálogo vive en la página, por encima de la ficha). */
  onAskAbandon: (item: ChallengeItem) => void
  /** Dónde va el foco al cerrar si quien abrió la ficha ya no está (enlace directo). */
  returnFocusTo: () => HTMLElement | null
}

const TAG = 'rounded-full px-2 py-0.5 text-2xs font-medium whitespace-nowrap'

/** La ficha de un reto propio: a la derecha en pantallas anchas y como hoja inferior en estrechas. */
export function ChallengeSheet({ item, onClose, returnFocusTo, ...rest }: SheetProps) {
  const titleId = useId()
  // La última ficha mostrada se conserva mientras la hoja se cierra, para que su contenido no desaparezca a mitad de animación.
  const [last, setLast] = useState<ChallengeItem | null>(item)
  if (item && item !== last) setLast(item)
  const shown = item ?? last

  return (
    <Sheet open={item !== null} onClose={onClose} labelledBy={titleId} returnFocusTo={returnFocusTo}>
      {shown && <SheetBody item={shown} titleId={titleId} onClose={onClose} {...rest} />}
    </Sheet>
  )
}

function SheetBody({
  item,
  titleId,
  today,
  playing,
  gamified,
  onClose,
  onToggleToday,
  onAskAbandon,
}: Omit<SheetProps, 'item' | 'returnFocusTo'> & { item: ChallengeItem; titleId: string }) {
  const { challenge, summary, params, days } = item
  const { id, title } = challenge
  const status = rowStatus(item, today)
  const doneToday = summary.todayState === 'done'
  const skippedToday = summary.todayState === 'skip'
  const canMark = item.markReason === null
  const lastDay = isLastDay(item, today)
  const pausedNow = status.key === 'pause'
  // «Reanudar» también cancela una pausa que empieza mañana.
  const isPaused = challenge.status === 'paused'
  const log = logEntries(days, today)

  useMarkShortcut(() => {
    if (canMark) onToggleToday(item)
  }, 'sheet')

  return (
    <div className="space-y-5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn(TAG, 'bg-border text-text-muted')}>Reto propio</span>
          {lastDay && <span className={cn(TAG, 'bg-accent-soft text-accent-text')}>Último día</span>}
          {(item.finished || pausedNow) && <span className={cn(TAG, 'bg-accent-soft text-accent-text')}>{status.text}</span>}
        </div>
        <IconButton label="Cerrar (Esc)" onClick={onClose} className="-m-1.5 shrink-0">
          <X size={16} strokeWidth={1.75} aria-hidden="true" />
        </IconButton>
      </div>

      <h2 id={titleId} className="text-lg font-semibold tracking-tight text-balance text-text">
        {title}
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-md border border-border bg-bg-soft px-3 py-2.5">
          <p className="text-xs font-medium text-text-muted">Racha</p>
          <p className="text-xl font-semibold tracking-[-0.02em] tabular-nums text-text">
            {summary.currentStreak} <span className="text-xs font-normal text-text-muted">{summary.currentStreak === 1 ? 'día' : 'días'}</span>
          </p>
          <p className="text-xs tabular-nums text-text-muted">mejor: {summary.bestStreak}</p>
        </div>
        <div className="rounded-md border border-border bg-bg-soft px-3 py-2.5">
          <p className="text-xs font-medium text-text-muted">Cumplimiento</p>
          <p className="text-xl font-semibold tracking-[-0.02em] tabular-nums text-text">{Math.round(summary.compliance * 100)} %</p>
          <p className="text-xs tabular-nums text-text-muted">
            {summary.counts.done} de {summary.counts.done + summary.counts.shield + summary.counts.skip + summary.counts.fail} días
          </p>
        </div>
      </div>

      {/* Acciones arriba, para que el menú «Más acciones» se abra sobre el contenido y no lo recorte la hoja. */}
      <div className="space-y-2">
        <div className="relative flex flex-wrap items-center gap-2 overflow-hidden rounded-md">
          <Celebration play={playFor(playing, id)} />
          {!item.finished && (
            <>
              <Button
                autoFocus={canMark}
                variant={doneToday ? 'secondary' : 'primary'}
                disabled={!canMark}
                aria-pressed={doneToday}
                onClick={() => onToggleToday(item)}
                title={item.markReason ?? undefined}
              >
                {doneToday ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
                {doneToday ? 'Hecho hoy · quitar' : lastDay ? 'Marcar y cumplir el reto' : 'Marcar hoy'}
                <Kbd className={doneToday ? '' : 'bg-on-accent/20 text-on-accent'}>x</Kbd>
              </Button>
              {canMark && !doneToday && (
                <Button
                  variant="secondary"
                  disabled={!skippedToday && summary.shieldsLeft === 0}
                  onClick={() => void (skippedToday ? undoSkipToday(id, title, today) : skipToday(id, title, today))}
                >
                  <ShieldOff size={14} strokeWidth={2} aria-hidden="true" />
                  {skippedToday ? 'Quitar «Hoy no»' : summary.shieldsLeft === 0 ? 'Hoy no · sin escudos' : 'Hoy no · gasta 1 escudo'}
                </Button>
              )}
            </>
          )}
          <div className="ml-auto">
            <Menu
              trigger={(p) => (
                <IconButton label="Más acciones: pausar, abandonar o eliminar" {...p}>
                  <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
                </IconButton>
              )}
            >
              {!item.finished && !isPaused && (
                <MenuItem icon={<Pause size={14} aria-hidden="true" />} onSelect={() => void pauseNow(id, title, today)}>
                  Pausar desde mañana
                </MenuItem>
              )}
              {isPaused && (
                <MenuItem icon={<Play size={14} aria-hidden="true" />} onSelect={() => void resumeNow(id, title, today)}>
                  Reanudar
                </MenuItem>
              )}
              {!item.finished && (
                <MenuItem icon={<Archive size={14} aria-hidden="true" />} onSelect={() => onAskAbandon(item)}>
                  Abandonar…
                </MenuItem>
              )}
              {!item.finished && <MenuSeparator />}
              <MenuItem
                destructive
                icon={<Trash2 size={14} aria-hidden="true" />}
                onSelect={() => {
                  void trashNow(id).then((ok) => ok && onClose())
                }}
              >
                Eliminar
              </MenuItem>
            </Menu>
          </div>
        </div>
        {item.markReason && !item.finished && <p className="text-xs text-text-muted">{item.markReason}</p>}
        {item.finished && (
          <p className="text-xs text-text-muted">
            {status.text}
            {challenge.completedAt ? ` el ${formatDayMonth(dateKey(new Date(challenge.completedAt)))}` : ''}. Se queda en tu historial.
          </p>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-ui">
        <Prop label="Progreso">
          {!item.finished && summary.dayIndex > 0 ? `Día ${summary.dayIndex} de ${summary.totalDays}` : `${summary.totalDays} días`}
        </Prop>
        <Prop label="Fechas">
          {formatDayMonth(challenge.startDate)} – {formatDayMonth(challenge.endDate)}
        </Prop>
        <Prop label="Escudos">
          {summary.shieldsLeft} de {params.shields}
          <span className="text-text-muted"> · no se recargan</span>
        </Prop>
        {gamified && (
          <Prop label="Recompensa">
            +{XP_PER_CHALLENGE_DAY} XP/día · +{challengePerfectBonus(params.durationDays)} si no fallas ningún día
          </Prop>
        )}
      </dl>

      <section className="space-y-2.5">
        <h3 className="text-sm font-semibold text-text">Calendario</h3>
        <ChallengeCalendar challenge={challenge} days={days} today={today} />
        <DayLegend />
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-text">Registro</h3>
        {log.length === 0 ? (
          <p className="text-xs text-text-muted">Todavía no hay días registrados.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {log.map((e) => (
              <li key={e.date} className="flex items-center gap-2.5 px-3 py-1.5 text-ui">
                <DayMark visual={e.state} />
                <span className="w-16 shrink-0 text-xs tabular-nums text-text-muted">{e.date === today ? 'Hoy' : formatWeekdayDay(e.date)}</span>
                <span className="min-w-0 text-text">
                  {DAY_LABEL[e.state]}
                  {e.state === 'fail' && <span className="text-text-muted">: la racha vuelve a 0</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-text-muted">{label}</dt>
      <dd className="tabular-nums text-text">{children}</dd>
    </>
  )
}
