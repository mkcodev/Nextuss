import { useMemo } from 'react'
import type { ChallengeDay } from '../../db/types'
import { DAY_LABEL, calendarWeeks, formatWeekdayDay, indexDays } from '../../lib/challenges/calendar'
import { cn } from '../../lib/cn'
import { DayMark } from './DayMark'
import type { StoredChallenge } from './challengesData'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const ROW = 'grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] items-center gap-1'

/** Calendario del reto por semanas (lunes a domingo), con el mes a la izquierda. Cada día lleva su
 *  texto para lectores de pantalla y `title`; hoy se distingue con un contorno aunque ya esté marcado. */
export function ChallengeCalendar({ challenge, days, today }: { challenge: StoredChallenge; days: ChallengeDay[]; today: string }) {
  const weeks = useMemo(() => calendarWeeks(challenge, indexDays(days), today), [challenge, days, today])

  return (
    <div>
      <div aria-hidden="true" className={cn(ROW, 'mb-1 text-2xs font-medium text-text-faint')}>
        <span />
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-center">
            {d}
          </span>
        ))}
      </div>
      <ol aria-label="Calendario del reto" className="space-y-1">
        {weeks.map((week, i) => (
          <li key={i} className={ROW}>
            <span aria-hidden="true" className="text-2xs text-text-faint">
              {week.label}
            </span>
            {week.cells.map((cell, j) =>
              cell === null ? (
                <span key={j} />
              ) : (
                <span key={cell.date} title={`${formatWeekdayDay(cell.date)}: ${DAY_LABEL[cell.visual]}`} className="justify-self-center">
                  <DayMark
                    visual={cell.visual}
                    size="md"
                    className={cn(cell.isToday && cell.visual !== 'today' && 'outline-[1.5px] outline-offset-2 outline-text-muted')}
                  />
                  <span className="sr-only">
                    {cell.isToday ? 'Hoy' : formatWeekdayDay(cell.date)}: {DAY_LABEL[cell.visual]}
                  </span>
                </span>
              ),
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
