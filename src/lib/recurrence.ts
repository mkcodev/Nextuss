// Motor puro de recurrencia (Fase 9) — sin tocar la base de datos, testeable como `streaks.ts`.
// Dos formas de calcular la siguiente ocurrencia según `RecurrenceRule.mode`:
// - `schedule`: `occurrencesInRange` enumera todas las fechas de calendario en las que la regla cae
//   dentro de una ventana, para generarlas por adelantado (horizonte de 28 días).
// - `completion`: `nextCompletionOccurrence` calcula una única fecha desplazada desde el momento real
//   en que se completó la ocurrencia anterior — no tiene sentido enumerar un rango por adelantado
//   porque depende de cuándo el usuario complete cada una, no del calendario.
import { addDays, addMonths, addWeeks, differenceInCalendarDays, getDay, startOfWeek } from 'date-fns'
import { dateKey, parseDateKey, WEEKDAY_LABELS_ES_FULL, WEEKDAY_ORDER_MON_FIRST } from './dates'

export interface RecurrenceRuleLike {
  freq: 'daily' | 'weekly' | 'monthly'
  interval: number
  byWeekday?: number[]
  byMonthDay?: number[]
  startDate: string
  until?: string
  /** Solo para describirla: 'completion' = la siguiente se crea al completar la anterior. */
  mode?: 'schedule' | 'completion'
}

function matchesRule(rule: RecurrenceRuleLike, date: Date, anchor: Date): boolean {
  switch (rule.freq) {
    case 'daily': {
      const diffDays = differenceInCalendarDays(date, anchor)
      return diffDays % rule.interval === 0
    }
    case 'weekly': {
      if (!(rule.byWeekday ?? []).includes(getDay(date))) return false
      const anchorWeekStart = startOfWeek(anchor, { weekStartsOn: 1 })
      const dateWeekStart = startOfWeek(date, { weekStartsOn: 1 })
      const diffWeeks = differenceInCalendarDays(dateWeekStart, anchorWeekStart) / 7
      return diffWeeks % rule.interval === 0
    }
    case 'monthly': {
      if (!(rule.byMonthDay ?? []).includes(date.getDate())) return false
      const diffMonths = (date.getFullYear() - anchor.getFullYear()) * 12 + (date.getMonth() - anchor.getMonth())
      return diffMonths >= 0 && diffMonths % rule.interval === 0
    }
  }
}

/**
 * Fechas ('YYYY-MM-DD') en las que `rule` cae dentro de `[fromDate, toDate]` (ambos incluidos),
 * respetando `rule.until` si está definido. Nunca genera antes de `rule.startDate` **ni** antes de
 * `fromDate` — el llamador siempre acota `fromDate` a "hoy" (ver `generateUpcomingOccurrences`), así
 * que una regla creada hace tiempo o reanudada tras una pausa nunca produce un alud de ocurrencias
 * pasadas que se saltaron.
 */
export function occurrencesInRange(rule: RecurrenceRuleLike, fromDate: string, toDate: string): string[] {
  const start = rule.startDate > fromDate ? rule.startDate : fromDate
  const effectiveEnd = rule.until && rule.until < toDate ? rule.until : toDate
  if (effectiveEnd < start) return []

  const anchor = parseDateKey(rule.startDate)
  const end = parseDateKey(effectiveEnd)
  const dates: string[] = []
  let cursor = parseDateKey(start)
  while (cursor <= end) {
    if (matchesRule(rule, cursor, anchor)) dates.push(dateKey(cursor))
    cursor = addDays(cursor, 1)
  }
  return dates
}

/**
 * Siguiente fecha para una regla en modo `completion`, desplazada `interval` unidades desde
 * `completedOn` (la fecha real de finalización, no la fecha que tenía programada la ocurrencia
 * anterior). Devuelve `null` si esa fecha cae después de `rule.until`.
 */
export function nextCompletionOccurrence(rule: RecurrenceRuleLike, completedOn: string): string | null {
  const base = parseDateKey(completedOn)
  const next =
    rule.freq === 'daily'
      ? addDays(base, rule.interval)
      : rule.freq === 'weekly'
        ? addWeeks(base, rule.interval)
        : addMonths(base, rule.interval)
  const key = dateKey(next)
  if (rule.until && key > rule.until) return null
  return key
}

const LIST = new Intl.ListFormat('es', { type: 'conjunction' })

/** Regla de repetición en lenguaje llano: "Cada día", "Cada 2 semanas: lunes y jueves",
 *  "Cada mes: días 1 y 15", y "tras completarla" cuando la siguiente depende de terminar esta. */
export function describeRecurrence(rule: RecurrenceRuleLike): string {
  const n = rule.interval
  const unit = { daily: ['día', 'días'], weekly: ['semana', 'semanas'], monthly: ['mes', 'meses'] }[rule.freq]
  let text = n === 1 ? `Cada ${unit[0]}` : `Cada ${n} ${unit[1]}`
  if (rule.mode === 'completion') return `${text}, tras completarla`
  if (rule.freq === 'weekly' && rule.byWeekday?.length) {
    const days = WEEKDAY_ORDER_MON_FIRST.filter((d) => rule.byWeekday!.includes(d)).map((d) => WEEKDAY_LABELS_ES_FULL[d].toLowerCase())
    text += `: ${LIST.format(days)}`
  }
  if (rule.freq === 'monthly' && rule.byMonthDay?.length) {
    const days = [...rule.byMonthDay].sort((a, b) => a - b).map(String)
    text += `: ${days.length === 1 ? 'día' : 'días'} ${LIST.format(days)}`
  }
  return text
}
