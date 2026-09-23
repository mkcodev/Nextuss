// Parser local del quick-add (Fase 8.1) — sin IA, puro y determinista. Reconoce, en cualquier
// orden dentro del texto: fechas/horas relativas en español, `#etiqueta`, `!1`-`!4` prioridad,
// duraciones (`45m`, `1h`, `1h30`) y `@objetivo`. Cada token reconocido se retira del título.
import { addDays } from 'date-fns'
import { dateKey } from './dates'

export interface QuickParseResult {
  title: string
  scheduledDate?: string
  scheduledStart?: string
  priority?: number
  estimateMin?: number
  tagNames: string[]
  goalQuery?: string
}

// Patrón por día — con clases de acento para poder aplicarse tal cual sobre el texto original
// (con tildes) aunque la detección de qué día es se haga sobre la versión sin acentos.
const WEEKDAY_PATTERNS: [pattern: string, weekday: number][] = [
  ['domingo', 0],
  ['lunes', 1],
  ['martes', 2],
  ['mi[eé]rcoles', 3],
  ['jueves', 4],
  ['viernes', 5],
  ['s[aá]bado', 6],
]

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function consume(text: string, re: RegExp, onMatch: (m: RegExpMatchArray) => void): string {
  return text.replace(re, (...args) => {
    onMatch(args as unknown as RegExpMatchArray)
    return ' '
  })
}

function clampTime(h: number, m: number): string | undefined {
  if (h < 0 || h > 23 || m < 0 || m > 59) return undefined
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function quickParse(raw: string, now: Date = new Date()): QuickParseResult {
  let text = raw
  const tagNames: string[] = []
  let goalQuery: string | undefined
  let priority: number | undefined
  let estimateMin: number | undefined
  let scheduledDate: string | undefined
  let scheduledStart: string | undefined

  text = consume(text, /#([\p{L}\d_-]+)/gu, (m) => tagNames.push(m[1]))
  text = consume(text, /@([\p{L}\d_-]+)/gu, (m) => {
    if (!goalQuery) goalQuery = m[1].replace(/[_-]+/g, ' ')
  })
  text = consume(text, /(?:^|\s)!([1-4])(?=\s|$)/, (m) => {
    priority = Number(m[1])
  })

  // Duración: "1h30", "1h30m", "1h", "45m", "45min" — se prueba primero el patrón con horas.
  text = consume(text, /(?:^|\s)(\d+)h(\d{1,2})?(?=\s|$)/i, (m) => {
    const hours = Number(m[1])
    const minutes = m[2] ? Number(m[2]) : 0
    estimateMin = hours * 60 + minutes
  })
  if (estimateMin === undefined) {
    text = consume(text, /(?:^|\s)(\d+)\s?(?:min|m)(?=\s|$)/i, (m) => {
      estimateMin = Number(m[1])
    })
  }

  // Hora explícita: "15:00", "a las 9", "a las 9:30", "9am", "9 pm".
  text = consume(text, /\b(?:a\s+las\s+)?(\d{1,2}):(\d{2})\b/, (m) => {
    scheduledStart = clampTime(Number(m[1]), Number(m[2]))
  })
  if (scheduledStart === undefined) {
    text = consume(text, /\b(?:a\s+las\s+)?(\d{1,2})\s?(am|pm)\b/i, (m) => {
      let h = Number(m[1]) % 12
      if (m[2].toLowerCase() === 'pm') h += 12
      scheduledStart = clampTime(h, 0)
    })
  }

  // Fecha relativa. "pasado mañana" se comprueba antes que "mañana" (subcadena de la primera).
  const normalized = stripAccents(text.toLowerCase())
  if (/\bpasado\s+manana\b/.test(normalized)) {
    scheduledDate = dateKey(addDays(now, 2))
    text = text.replace(/pasado\s+ma[ñn]ana/i, ' ')
  } else if (/\bmanana\b/.test(normalized)) {
    scheduledDate = dateKey(addDays(now, 1))
    text = text.replace(/ma[ñn]ana/i, ' ')
  } else if (/\bhoy\b/.test(normalized)) {
    scheduledDate = dateKey(now)
    text = text.replace(/hoy/i, ' ')
  } else {
    const enDiasMatch = normalized.match(/\ben\s+(\d+)\s+dias?\b/)
    const enSemanasMatch = normalized.match(/\ben\s+(\d+)\s+semanas?\b/)
    if (enSemanasMatch) {
      scheduledDate = dateKey(addDays(now, Number(enSemanasMatch[1]) * 7))
      text = text.replace(/en\s+\d+\s+semanas?/i, ' ')
    } else if (enDiasMatch) {
      scheduledDate = dateKey(addDays(now, Number(enDiasMatch[1])))
      text = text.replace(/en\s+\d+\s+dias?/i, ' ')
    } else {
      for (const [pattern, weekday] of WEEKDAY_PATTERNS) {
        const re = new RegExp(`\\b(?:el\\s+|pr[oó]ximo\\s+)?${pattern}\\b`, 'i')
        const match = normalized.match(re)
        if (match) {
          let delta = (weekday - now.getDay() + 7) % 7
          if (/proximo/i.test(match[0]) && delta === 0) delta = 7
          scheduledDate = dateKey(addDays(now, delta))
          text = text.replace(re, ' ')
          break
        }
      }
    }
  }

  const title = text.replace(/\s+/g, ' ').trim()

  return { title, scheduledDate, scheduledStart, priority, estimateMin, tagNames, goalQuery }
}
