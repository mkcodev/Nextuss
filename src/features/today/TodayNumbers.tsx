import { useId } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Skeleton } from '../../design/primitives'
import { db } from '../../db/schema'
import { getFocusSessionsInRange, getHabitLogsInRange, getTasksCompletedInRange } from '../../db/repositories/stats'
import { getTasksForDate } from '../../db/repositories/tasks'
import { cn } from '../../lib/cn'
import { progressForXp } from '../../lib/xp'
import { formatMinutes } from '../routines/schedule'
import { usePluginEnabled } from '../plugins/pluginsStore'
import { countTasks, focusComparison, focusRangeFor, summarizeFocus, xpEarnedToday, type FocusSummary } from './todayNumbersData'

const CELL = 'flex min-w-0 flex-col gap-0.5 rounded-md border border-border bg-surface px-4 py-3.5 shadow-card'
const LABEL = 'text-xs font-medium text-text-muted'
const VALUE = 'text-xl font-semibold tracking-[-0.02em] tabular-nums text-text'
const META = 'text-xs text-text-muted'

/** «Tu día en números» (Hoy, mockup de Línea): foco con barras de 7 días, tareas hechas y XP.
 *  Las celdas de Foco y Progreso siguen a sus plugins en vivo (`focus`, `gamification`). */
export function TodayNumbers({ date }: { date: string }) {
  const titleId = useId()
  const focusOn = usePluginEnabled('focus')
  const gamificationOn = usePluginEnabled('gamification')

  const focus = useLiveQuery(async () => {
    const { fromTs, toTs } = focusRangeFor(date)
    return summarizeFocus(await getFocusSessionsInRange(fromTs, toTs), date)
  }, [date])
  const tasks = useLiveQuery(async () => countTasks(await getTasksForDate(date)), [date])
  const xp = useLiveQuery(async () => {
    const [done, logs, progress] = await Promise.all([
      getTasksCompletedInRange(date, date),
      getHabitLogsInRange(date, date),
      db.progress.get(1),
    ])
    return { today: xpEarnedToday(done, logs), level: progressForXp(progress?.totalXp ?? 0) }
  }, [date])

  const loading = focus === undefined || tasks === undefined || xp === undefined

  return (
    <section aria-labelledby={titleId}>
      <h2 id={titleId} className="mb-2.5 text-sm font-semibold text-text">
        Tu día en números
      </h2>
      <div
        className={cn(
          'grid grid-cols-2 gap-3',
          focusOn && gamificationOn && 'sm:grid-cols-[1.4fr_1fr_1fr]',
          focusOn && !gamificationOn && 'sm:grid-cols-[1.4fr_1fr]',
        )}
      >
        {loading ? (
          <>
            {focusOn && <Skeleton className="col-span-2 h-[132px] sm:col-span-1" />}
            <Skeleton className="h-[132px]" />
            {gamificationOn && <Skeleton className="h-[132px]" />}
          </>
        ) : (
          <>
            {focusOn && <FocusCell s={focus} />}
            <div className={CELL}>
              <span className={LABEL}>Tareas</span>
              <span className={VALUE}>
                {tasks.done} <span className="text-text-muted">de</span> {tasks.total}
              </span>
              <span className={META}>hechas hoy</span>
            </div>
            {gamificationOn && (
              <div className={CELL}>
                <span className={LABEL}>Progreso</span>
                <span className={VALUE}>+{xp.today} XP</span>
                <span className={META}>
                  quedan {xp.level.xpForNextLevel - xp.level.xpIntoLevel} para el nivel {xp.level.level + 1}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function FocusCell({ s }: { s: FocusSummary }) {
  const max = Math.max(...s.days.map((d) => d.minutes), 1)
  return (
    <div className={cn(CELL, 'col-span-2 sm:col-span-1')}>
      <span className={LABEL}>Foco</span>
      <span className={VALUE}>{formatMinutes(s.todayMin)}</span>
      <span className={META}>{focusComparison(s.todayMin, s.avgPrevMin)}</span>
      <ol aria-label="Minutos de foco de los últimos 7 días" className="mt-2.5 grid h-[52px] grid-cols-7 items-end gap-1">
        {s.days.map((d) => (
          <li
            key={d.date}
            aria-label={`${d.isToday ? 'Hoy' : d.label}, ${d.date.slice(8)}: ${d.minutes} min`}
            title={`${d.label} ${d.date.slice(8)} · ${formatMinutes(d.minutes)}`}
            className="flex h-full flex-col items-center justify-end gap-1"
          >
            {d.isToday && (
              <span aria-hidden="true" className="text-xs leading-none font-semibold tabular-nums text-text">
                {d.minutes}
              </span>
            )}
            <span
              aria-hidden="true"
              className={cn('w-full max-w-[18px] rounded-[2px]', d.isToday ? 'bg-accent' : 'bg-border-strong')}
              style={{ height: `${Math.max(d.minutes / max, 0.04) * 32}px` }}
            />
            <span aria-hidden="true" className="text-2xs leading-none text-text-muted">
              {d.label}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
