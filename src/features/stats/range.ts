import { subDays } from 'date-fns'
import { dateKey, parseDateKey } from '../../lib/dates'
import type { SegmentOption } from '../../design/primitives'

export type StatsRange = '7d' | '30d' | '90d' | 'year' | 'all'

export interface ResolvedRange {
  from: string
  to: string
  days: number
}

const RANGE_DAYS: Record<Exclude<StatsRange, 'all'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  year: 365,
}

// Suficientemente lejos como para cubrir cualquier historial real de la app sin tener que
// consultar antes la fecha más antigua registrada — mantiene `resolveRange` pura y barata.
const ALL_TIME_DAYS = 3650

export const STATS_RANGE_OPTIONS: SegmentOption<StatsRange>[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: 'year', label: 'Año' },
  { value: 'all', label: 'Todo' },
]

/** [from, to] inclusive, 'YYYY-MM-DD', terminando hoy. */
export function resolveRange(range: StatsRange, now: Date = new Date()): ResolvedRange {
  const days = range === 'all' ? ALL_TIME_DAYS : RANGE_DAYS[range]
  return { from: dateKey(subDays(now, days - 1)), to: dateKey(now), days }
}

/** El rango inmediatamente anterior a `current`, de la misma duración — sin gap ni solape. */
export function previousRangeOf(current: ResolvedRange): ResolvedRange {
  const currentFromDate = parseDateKey(current.from)
  return {
    from: dateKey(subDays(currentFromDate, current.days)),
    to: dateKey(subDays(currentFromDate, 1)),
    days: current.days,
  }
}

/** El periodo inmediatamente anterior, de la misma duración — para la comparativa periodo-vs-periodo. */
export function previousRange(range: StatsRange, now: Date = new Date()): ResolvedRange {
  return previousRangeOf(resolveRange(range, now))
}
