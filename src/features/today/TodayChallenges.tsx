import { useId, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChevronRight, Shield } from 'lucide-react'
import { Celebration } from '../../design/primitives'
import { cn } from '../../lib/cn'
import { elapsedDays } from '../../lib/challenges/horizon'
import { useChallengesData } from '../challenges/useChallengesData'
import { playFor, useCelebratedChallengeMark } from '../challenges/useCelebratedChallengeMark'
import { hasTodayContent, summarizeForToday } from '../challenges/todaySummary'
import { isLastDay } from '../challenges/rowStatus'
import type { ChallengeItem } from '../challenges/challengesData'
import { CountUp } from './CountUp'
import { CELL, LABEL, META, VALUE } from './numbersStyle'

/** Filas que caben en Hoy; el resto está en /retos. */
const MAX_ROWS = 3

/** Celda ancha «Retos» de «Tu día en números»: misiones de hoy, retos por marcar y, para cada reto, el
 *  botón de marcar con su progreso. Marcar desde aquí celebra igual que en /retos (es una acción de la
 *  persona). No aparece sin misiones ni retos en marcha. Quien la monta decide si el plugin está activo. */
export function TodayChallenges({ date }: { date: string }) {
  const titleId = useId()
  const data = useChallengesData(date)
  const { playing, toggleToday } = useCelebratedChallengeMark(date)
  const summary = useMemo(() => (data ? summarizeForToday(data) : undefined), [data])

  if (!summary || !hasTodayContent(summary)) return null
  const { missionsDone, missionsTotal, items, toMark } = summary
  const shown = items.slice(0, MAX_ROWS)
  const hidden = items.length - shown.length

  return (
    // `@container`: la columna de Hoy es estrecha con los paneles abiertos, así que el resumen y la lista
    // solo van lado a lado cuando hay sitio para los dos; si no, uno encima del otro.
    <div className="@container">
      <section aria-labelledby={titleId} className={cn(CELL, 'gap-3 @lg:grid @lg:grid-cols-[9.5rem_minmax(0,1fr)] @lg:items-center @lg:gap-x-6')}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 id={titleId} className={LABEL}>
            <Link to="/retos" className="-mx-1 inline-flex min-h-11 items-center md:min-h-6 gap-0.5 rounded-xs px-1 hover:text-text">
              Retos <ChevronRight size={12} strokeWidth={2} aria-hidden="true" />
              <span className="sr-only">: ver todos</span>
            </Link>
          </h3>
          {missionsTotal > 0 ? (
            <>
              <span className={VALUE}>
                <CountUp value={missionsDone} /> <span className="text-text-muted">de</span> {missionsTotal}
              </span>
              <span className={META}>
                misiones hoy{items.length > 0 && ` · ${toMark} ${toMark === 1 ? 'reto' : 'retos'} por marcar`}
              </span>
            </>
          ) : (
            <>
              <span className={VALUE}>
                <CountUp value={items.length - toMark} /> <span className="text-text-muted">de</span> {items.length}
              </span>
              <span className={META}>retos marcados hoy</span>
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="min-w-0">
            <ul aria-label="Retos en marcha" className="space-y-0.5">
              {shown.map((item) => (
                <Row key={item.challenge.id} item={item} today={date} play={playFor(playing, item.challenge.id)} onToggle={toggleToday} />
              ))}
            </ul>
            {hidden > 0 && (
              <Link to="/retos" className={cn(META, 'mt-1 inline-flex min-h-11 items-center md:min-h-6 rounded-xs hover:text-text hover:underline')}>
                y {hidden} {hidden === 1 ? 'reto más' : 'retos más'}
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

function Row({ item, today, play, onToggle }: { item: ChallengeItem; today: string; play: number | null; onToggle: (i: ChallengeItem) => Promise<void> }) {
  const { challenge, summary } = item
  const state = summary.todayState
  const done = state === 'done'
  const elapsed = elapsedDays({ status: challenge.status, totalDays: summary.totalDays, dayIndex: summary.dayIndex, todayState: state, rowCount: item.days.length })
  const remaining = Math.max(0, summary.totalDays - summary.dayIndex)
  const when = item.finished ? 'cumplido' : isLastDay(item, today) ? 'último día' : `quedan ${remaining} d`

  return (
    <li
      data-challenge-id={challenge.id}
      className="relative grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-1 overflow-hidden rounded-sm sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:gap-x-2"
    >
      <Celebration play={play} playOnMount />
      <button
        type="button"
        onClick={() => void onToggle(item)}
        aria-pressed={done}
        aria-label={`Marcar hoy: ${challenge.title}`}
        title={done ? 'Hoy marcado. Pulsa para quitar la marca' : state === 'skip' ? '«Hoy no». Pulsa para marcarlo como hecho' : 'Marcar hoy'}
        className="row-span-2 grid size-11 place-items-center rounded-md sm:size-8"
      >
        <span
          aria-hidden="true"
          className={cn(
            'grid size-5 place-items-center rounded-full border-2 transition-colors duration-(--dur-fast)',
            done ? 'border-accent bg-accent text-on-accent' : 'border-border-strong text-accent-text',
          )}
        >
          {done ? <Check size={12} strokeWidth={3} /> : state === 'skip' ? <Shield size={10} strokeWidth={2.5} /> : null}
        </span>
      </button>
      <Link to={`/retos/${challenge.id}`} className="col-start-2 min-w-0 truncate rounded-xs py-1 text-ui text-text hover:underline" title={challenge.title}>
        {challenge.title}
      </Link>
      <span className="col-start-3 text-right text-xs whitespace-nowrap text-text-muted tabular-nums">{when}</span>
      <span
        aria-hidden="true"
        className="relative col-span-2 col-start-2 row-start-2 mb-1.5 h-1.5 rounded-full bg-border"
      >
        <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${(elapsed / summary.totalDays) * 100}%` }} />
        {summary.dayIndex > 0 && (
          <i className="absolute -top-0.5 -bottom-0.5 w-px bg-text" style={{ left: `${((summary.dayIndex - 0.5) / summary.totalDays) * 100}%` }} />
        )}
      </span>
      <span className="sr-only">
        Día {summary.dayIndex} de {summary.totalDays}.
      </span>
    </li>
  )
}
