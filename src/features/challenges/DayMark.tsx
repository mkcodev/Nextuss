import { Check, Pause, Shield, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { DAY_LABEL, formatWeekdayDay, type DayCell, type DayVisual } from '../../lib/challenges/calendar'

type Size = 'sm' | 'md'

const BOX: Record<Size, string> = { sm: 'size-3.5', md: 'size-5.5' }
const GLYPH: Record<Size, number> = { sm: 8, md: 12 }

/** Cada estado se distingue por su forma además de por el color (DESIGN.md): relleno sólido = hecho;
 *  relleno suave con escudo = cubierto; el mismo con borde discontinuo = «Hoy no»; borde y aspa = fallo;
 *  barras = pausa; anillo = hoy; trazo fino = por llegar; trazo discontinuo = pasado sin registrar. */
const SHAPE: Record<Exclude<DayVisual, 'out'>, string> = {
  done: 'bg-accent text-on-accent',
  shield: 'bg-accent-soft text-accent-text',
  skip: 'bg-accent-soft text-accent-text border border-dashed border-accent',
  fail: 'border border-border-strong text-danger',
  pause: 'border border-border bg-bg-soft text-text-faint',
  today: 'ring-[1.5px] ring-inset ring-accent',
  upcoming: 'border border-border',
  open: 'border border-dashed border-border-strong',
}

/** La marca de un día. Solo decoración (`aria-hidden`): quien la usa pone el texto del estado. */
export function DayMark({ visual, size = 'sm', className }: { visual: DayVisual; size?: Size; className?: string }) {
  if (visual === 'out') return <span aria-hidden="true" className={cn('inline-block shrink-0', BOX[size], className)} />
  const g = GLYPH[size]
  return (
    <span aria-hidden="true" className={cn('inline-grid shrink-0 place-items-center rounded-[3px]', BOX[size], SHAPE[visual], className)}>
      {visual === 'done' && size === 'md' && <Check size={g} strokeWidth={3} />}
      {(visual === 'shield' || visual === 'skip') && <Shield size={g} strokeWidth={2.25} />}
      {visual === 'fail' && <X size={g} strokeWidth={2.5} />}
      {visual === 'pause' && <Pause size={g} strokeWidth={2.5} />}
    </span>
  )
}

const dayText = (c: DayCell) => `${c.isToday ? 'Hoy' : formatWeekdayDay(c.date)}: ${DAY_LABEL[c.visual]}`

/** Los últimos días de un reto, en una fila. Cada uno lleva su texto para lectores de pantalla y `title`. */
export function DayStrip({ cells, label = 'Últimos 7 días' }: { cells: DayCell[]; label?: string }) {
  return (
    <ol aria-label={label} className="flex items-center gap-1">
      {cells.map((c) => (
        <li key={c.date} title={c.visual === 'out' ? undefined : dayText(c)} className="inline-flex">
          <DayMark visual={c.visual} />
          {c.visual !== 'out' && <span className="sr-only">{dayText(c)}</span>}
        </li>
      ))}
    </ol>
  )
}

const LEGEND: { visual: DayVisual; text: string }[] = [
  { visual: 'done', text: 'Hecho' },
  { visual: 'shield', text: 'Escudo' },
  { visual: 'skip', text: '«Hoy no»' },
  { visual: 'fail', text: 'Fallado' },
  { visual: 'pause', text: 'Pausa' },
  { visual: 'today', text: 'Hoy' },
]

/** Leyenda de las marcas: la forma y el texto, nunca solo el color. */
export function DayLegend({ className }: { className?: string }) {
  return (
    <ul aria-label="Leyenda del calendario" className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs text-text-muted', className)}>
      {LEGEND.map((l) => (
        <li key={l.visual} className="inline-flex items-center gap-1.5">
          <DayMark visual={l.visual} />
          {l.text}
        </li>
      ))}
    </ul>
  )
}
