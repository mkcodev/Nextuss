import { cn } from '../../lib/cn'
import type { DropPosition } from '../../lib/reorder'

/** Línea de inserción de un reordenado por arrastre. El padre debe ser `relative`; se pinta en el
 * hueco entre filas (`space-y-*`/`gap-*`), no encima del contenido. */
export function DropIndicator({
  position,
  orientation = 'vertical',
}: {
  position: DropPosition | null
  orientation?: 'vertical' | 'horizontal'
}) {
  if (!position) return null
  const horizontal = orientation === 'horizontal'
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-[2] rounded-full bg-accent shadow-glow',
        horizontal
          ? cn('inset-y-0 w-0.5', position === 'before' ? '-left-[4px]' : '-right-[4px]')
          : cn('inset-x-0 h-0.5', position === 'before' ? '-top-[5px]' : '-bottom-[5px]'),
      )}
    />
  )
}
