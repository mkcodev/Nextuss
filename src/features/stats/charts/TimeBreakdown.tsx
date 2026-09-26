import type { TimeBucket } from '../aggregate'
import { formatMinutes } from '../format'

/** Lista con barras horizontales de minutos por grupo. Cada fila lleva el dato en texto, así que se
 *  lee igual sin ver la barra (y con lector de pantalla). */
export function TimeBreakdown({ buckets, emptyText }: { buckets: TimeBucket[]; emptyText: string }) {
  if (buckets.length === 0) return <p className="py-6 text-center text-sm text-text-muted">{emptyText}</p>
  const max = buckets[0].minutes
  const total = buckets.reduce((sum, b) => sum + b.minutes, 0)
  return (
    <ul className="space-y-2.5">
      {buckets.map((b) => (
        <li key={b.key} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-1.5">
            {b.color && <span aria-hidden="true" className="size-2 shrink-0 rounded-full" style={{ backgroundColor: b.color }} />}
            <span className="truncate text-text" title={b.label}>
              {b.label}
            </span>
          </span>
          <span aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-hover">
            <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${b.minutes / max})` }} />
          </span>
          <span className="tabular-nums text-text-muted">
            {formatMinutes(b.minutes)} <span className="text-xs">· {Math.round((b.minutes / total) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
