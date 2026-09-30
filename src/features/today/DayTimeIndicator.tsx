import { useLiveQuery } from 'dexie-react-hooks'
import { useLocation, useNavigate } from 'react-router-dom'
import { Clock3, Grid3x3 } from 'lucide-react'
import { RingProgress } from '../../design/primitives'
import { getTasksForDate } from '../../db/repositories/tasks'
import { getOrCreateSettings } from '../../db/repositories/settings'
import { readSetting } from '../../db/settingsDefaults'
import { todayKey } from '../../lib/dates'
import { useNowMinutes } from '../../lib/useNowMinutes'
import { formatMinutes } from '../routines/schedule'
import { dayCells, formatShort, summarizeDay } from './dayTime'

/** "Tiempo de hoy" en miniatura en la barra superior (Fase 28b), con el mismo estilo elegido en la
 * tarjeta de Hoy. Solo durante la jornada y fuera de Hoy (allí ya está la tarjeta entera); clic: a Hoy. */
export function DayTimeIndicator() {
  const nowMin = useNowMinutes()
  const date = todayKey()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const settings = useLiveQuery(() => getOrCreateSettings(), [])
  const tasks = useLiveQuery(() => getTasksForDate(date), [date])
  if (!settings || !tasks || pathname === '/') return null

  const s = summarizeDay({ tasks, nowMin, dayStartHour: settings.dayStartHour, dayEndHour: settings.dayEndHour })
  if (s.phase !== 'during') return null
  const view = readSetting(settings, 'dayTimeView')
  const nextSoon = s.next && s.next.inMin <= 60 ? s.next : null
  const free = dayCells(s, nowMin).filter((c) => c.status === 'free').length

  let icon = <Clock3 size={14} strokeWidth={1.75} className="shrink-0" />
  let text: string
  if (view === 'ring') {
    icon = <RingProgress value={1 - s.elapsed} size={14} strokeWidth={2.5} className="shrink-0" />
    text = nextSoon ? `${formatShort(s.leftMin)} · ${nextSoon.title} ${formatShort(nextSoon.inMin)}` : formatShort(s.leftMin)
  } else if (view === 'blocks') {
    icon = <Grid3x3 size={14} strokeWidth={1.75} className="shrink-0" />
    text = nextSoon ? `${free} libres · ${nextSoon.title} ${formatShort(nextSoon.inMin)}` : `${free} ${free === 1 ? 'bloque libre' : 'bloques libres'}`
  } else {
    text = nextSoon ? `${nextSoon.title} en ${formatShort(nextSoon.inMin)}` : `Quedan ${formatShort(s.leftMin)}`
  }

  const label = [
    `Quedan ${formatMinutes(s.leftMin)} de jornada`,
    s.plannedLeftMin > 0 && `${formatMinutes(s.freeLeftMin)} libres`,
    s.next && `siguiente: ${s.next.title} a las ${s.next.start}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      onClick={() => navigate('/')}
      aria-label={`${label}. Ir a Hoy`}
      title={label}
      className="hidden h-8 max-w-60 items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-ui font-medium tabular-nums text-text-muted transition-colors hover:border-border-strong hover:text-text md:flex"
    >
      {icon}
      <span className="truncate">{text}</span>
    </button>
  )
}
