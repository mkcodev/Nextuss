// Piezas que comparten las tres listas de retos (Mezcla, Cadena y Horizonte): la etiqueta pequeña, el
// estado de hoy con su forma y su texto, y la marca de un reto terminado.
import { Archive, CalendarDays, Check, Circle, Pause, ShieldOff, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'
import type { RowStatus, RowStatusKey } from './rowStatus'
import type { ChallengeItem } from './challengesData'

/** Etiqueta pequeña junto al título («Último día»). */
export const TAG = 'shrink-0 rounded-full px-2 text-2xs font-medium whitespace-nowrap'

const STATUS_ICON: Record<RowStatusKey, ReactNode> = {
  done: <Check size={13} strokeWidth={2.5} />,
  skip: <ShieldOff size={13} strokeWidth={2} />,
  pause: <Pause size={13} strokeWidth={2.25} />,
  future: <CalendarDays size={13} strokeWidth={2} />,
  pending: <Circle size={13} strokeWidth={2} />,
  over: <Circle size={13} strokeWidth={2} />,
  completed: <Check size={13} strokeWidth={2.5} />,
  perfect: <Sparkles size={13} strokeWidth={2} />,
  abandoned: <Archive size={13} strokeWidth={2} />,
}

const STATUS_TONE: Partial<Record<RowStatusKey, string>> = {
  done: 'text-accent-text font-medium',
  completed: 'text-accent-text font-medium',
  perfect: 'text-accent-text font-medium',
  skip: 'text-accent-text',
}

/** Solo el icono de un estado (decorativo: quien lo usa pone el texto). */
export const StatusIcon = ({ statusKey }: { statusKey: RowStatusKey }) => <span aria-hidden="true">{STATUS_ICON[statusKey]}</span>

/** El estado de hoy de un reto: siempre una forma (icono) y un texto, nunca solo color. */
export function StatusLabel({ status, className, title }: { status: RowStatus; className?: string; title?: string }) {
  return (
    <span title={title} className={cn('inline-flex items-center gap-1.5 text-xs whitespace-nowrap', STATUS_TONE[status.key] ?? 'text-text-muted', className)}>
      <StatusIcon statusKey={status.key} />
      <span className="sr-only">Hoy: </span>
      {status.text}
    </span>
  )
}

/** La marca de un reto terminado: relleno con check (cumplido) o aro con archivo (abandonado). */
export function FinishedGlyph({ status }: { status: ChallengeItem['challenge']['status'] }) {
  return status === 'abandoned' ? (
    <span aria-hidden="true" className="grid size-5 place-items-center rounded-full border-2 border-border-strong text-text-faint">
      <Archive size={10} strokeWidth={2.5} />
    </span>
  ) : (
    <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-accent text-on-accent">
      <Check size={12} strokeWidth={3} />
    </span>
  )
}
