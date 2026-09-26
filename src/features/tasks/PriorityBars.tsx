/** Barras de prioridad (DESIGN.md): cuántas llenas = cuánto urge, en tinta atenuada. Solo "Urgente"
 *  usa color (rojo de prioridad 1). Decorativo: el nombre de la prioridad va siempre en texto al lado
 *  o en el `aria-label` del control. P1 → 3 barras rojas · P2 → 3 · P3 → 2 · P4 → 1 · sin prioridad → 0. */
const FILLED: Record<number, number> = { 1: 3, 2: 3, 3: 2, 4: 1 }

export function PriorityBars({ p }: { p?: number }) {
  const filled = p ? FILLED[p] : 0
  const color = p === 1 ? 'var(--nx-prio-1)' : 'var(--color-text-muted)'
  return (
    <span aria-hidden="true" className="inline-flex h-3 w-3.5 shrink-0 items-end gap-px">
      {[5, 8, 11].map((h, i) => (
        <i key={h} className="w-[3px] rounded-[1px]" style={{ height: h, backgroundColor: i < filled ? color : 'var(--color-border-strong)' }} />
      ))}
    </span>
  )
}
