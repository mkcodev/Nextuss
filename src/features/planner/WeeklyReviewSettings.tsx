import { useId, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, ClipboardCheck } from 'lucide-react'
import { EmptyState } from '../../design/primitives'
import { listReviews } from '../../db/repositories/reviews'
import { formatPeriodLabel } from '../../lib/periods'
import { cn } from '../../lib/cn'
import type { WeeklyReview } from '../../db/types'

/** Pregunta de cada clave de `answers` (la revisión guarda por clave, no por texto). */
const QUESTION_LABELS: Record<string, string> = { reflection: '¿Cómo fue la semana?' }

/** Historial de revisiones semanales — pieza a medida (#98 P5): lista expandible sobre datos de Dexie,
 * no un campo plano del esquema. */
export function WeeklyReviewSettings() {
  const reviews = useLiveQuery(async () => (await listReviews()).sort((a, b) => b.weekKey.localeCompare(a.weekKey)), [])

  return (
    <div className="py-2.5">
      <p className="mb-2 text-xs text-text-faint">Lo que respondiste al cerrar cada semana.</p>
      {reviews != null && reviews.length === 0 && (
        <EmptyState icon={ClipboardCheck} title="Aún no has hecho ninguna" description="La revisión se propone en Hoy al empezar una semana con objetivos en la anterior." />
      )}
      {reviews != null && reviews.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {reviews.map((r) => (
            <ReviewRow key={r.id} review={r} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ReviewRow({ review }: { review: WeeklyReview }) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const answers = Object.entries(review.answers).filter(([, v]) => v.trim())
  const carried = review.carriedGoalIds?.length ?? 0
  const dropped = review.droppedGoalIds?.length ?? 0

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface-hover"
      >
        <ChevronRight size={15} strokeWidth={2} className={cn('shrink-0 text-text-muted transition-transform', open && 'rotate-90')} aria-hidden="true" />
        <span className="flex-1 font-medium text-text">{formatPeriodLabel('week', review.weekKey)}</span>
        <span className="text-xs text-text-muted">
          {carried > 0 && `${carried} arrastrado${carried > 1 ? 's' : ''}`}
          {carried > 0 && dropped > 0 && ' · '}
          {dropped > 0 && `${dropped} soltado${dropped > 1 ? 's' : ''}`}
        </span>
      </button>
      {open && (
        <div id={panelId} className="space-y-2 px-3 pb-3 pl-9 text-sm">
          {answers.length === 0 && <p className="text-text-muted">Sin respuestas escritas.</p>}
          {answers.map(([q, a]) => (
            <div key={q}>
              <p className="text-xs font-semibold text-text-muted">{QUESTION_LABELS[q] ?? q}</p>
              <p className="whitespace-pre-wrap text-text">{a}</p>
            </div>
          ))}
        </div>
      )}
    </li>
  )
}
