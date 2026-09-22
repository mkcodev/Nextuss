import { buildWeekdayProfile } from '../../aggregate'
import { WEEKDAY_LABELS_ES_FULL } from '../../../../lib/dates'
import type { Detector } from '../types'

const MIN_SAMPLE_PER_DAY = 2
const MIN_GAP = 0.22

/** "Lunes"→"lunes" (invariable en plural), pero "Domingo"→"domingos" y "Sábado"→"sábados". */
function pluralWeekday(name: string): string {
  const lower = name.toLowerCase()
  return lower === 'domingo' || lower === 'sábado' ? `${lower}s` : lower
}

export const weekdayEffect: Detector = (ctx) => {
  const profile = buildWeekdayProfile(ctx.points).filter((p) => p.sampleSize >= MIN_SAMPLE_PER_DAY)
  if (profile.length < 4) return null

  const best = profile.reduce((a, b) => (b.avgCompliance > a.avgCompliance ? b : a))
  const worst = profile.reduce((a, b) => (b.avgCompliance < a.avgCompliance ? b : a))
  const gap = best.avgCompliance - worst.avgCompliance
  if (gap < MIN_GAP) return null

  const worstDayName = pluralWeekday(WEEKDAY_LABELS_ES_FULL[worst.weekday])
  const bestDayName = pluralWeekday(WEEKDAY_LABELS_ES_FULL[best.weekday])

  return {
    key: 'weekdayEffect',
    title: `Los ${worstDayName} son tu día más flojo`,
    body: `De media cumples un ${Math.round(worst.avgCompliance * 100)}% de tus hábitos en ${worstDayName}, frente al ${Math.round(best.avgCompliance * 100)}% de tu mejor día (${bestDayName}).`,
    severity: 'warn',
    confidence: Math.min(1, gap * 1.5),
    evidence: {
      kind: 'bar',
      points: profile.map((p) => ({ label: p.label, value: Math.round(p.avgCompliance * 100) })),
    },
  }
}
